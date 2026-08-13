import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { compileFlowToMachine } from "@isitfr/engine";
import { validateFlowConfig } from "@isitfr/schemas";
import { interpret } from "xstate";

import { getFlow, getMessageTemplate, getResources, getStepChrome, listExperiments, listFlows } from "./index";

const FLOWS_DIR = join(dirname(fileURLToPath(import.meta.url)), "flows");
const FLOW_FILENAME_RE = /\.v.+\.json$/;

function flowFilesOnDisk(): Array<{
  file: string;
  flowId: string;
  type: string;
}> {
  return readdirSync(FLOWS_DIR)
    .filter((name) => FLOW_FILENAME_RE.test(name))
    .map((file) => {
      const parsed: unknown = JSON.parse(
        readFileSync(join(FLOWS_DIR, file), "utf8"),
      );
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("flowId" in parsed) ||
        !("type" in parsed) ||
        typeof parsed.flowId !== "string" ||
        typeof parsed.type !== "string"
      ) {
        throw new Error(`Flow file ${file} is missing flowId/type`);
      }
      return { file, flowId: parsed.flowId, type: parsed.type };
    });
}

describe("getFlow", () => {
  it("loads crisis-deepfake-classmate, validates, and compiles", () => {
    const config = getFlow("crisis-deepfake-classmate");

    expect(config.flowId).toBe("crisis-deepfake-classmate");
    expect(config.version).toBe(1);
    expect(config.type).toBe("crisis");
    expect(config.initial).toBe("stop");
    expect(Object.keys(config.steps)).toEqual(
      expect.arrayContaining([
        "stop",
        "preserve",
        "choose_contact",
        "template_trusted_adult",
        "template_school_contact",
        "template_platform_report",
        "resources",
      ]),
    );

    // Explicit round-trip: validate → compile (getFlow already validates).
    const validated = validateFlowConfig(config);
    const machine = compileFlowToMachine(validated);

    expect(machine.id).toBe("crisis-deepfake-classmate");
    expect(machine.initial).toBe("stop");
    expect(machine.states.stop).toBeDefined();
    expect(machine.states.choose_contact).toBeDefined();
    expect(machine.states.resources).toBeDefined();
  });

  it("compiles crisis and experiment-stub via the same compileFlowToMachine; experiment accumulates measurements", () => {
    const crisis = getFlow("crisis-deepfake-classmate");
    const experiment = getFlow("experiment-stub");

    expect(crisis.type).toBe("crisis");
    expect(experiment.type).toBe("experiment");
    expect(experiment.steps.probe).toMatchObject({
      type: "MEASURE",
      metric: "stub_signal",
      weight: 1,
      next: "done",
    });

    const crisisMachine = compileFlowToMachine(crisis);
    const experimentMachine = compileFlowToMachine(experiment);

    expect(crisisMachine.id).toBe("crisis-deepfake-classmate");
    expect(experimentMachine.id).toBe("experiment-stub");

    const service = interpret(experimentMachine).start();
    expect(service.state.value).toBe("probe");
    expect(service.state.context.measurements).toEqual([]);

    service.send({ type: "NEXT", value: 1 });
    expect(service.state.value).toBe("done");
    expect(service.state.context.measurements).toEqual([
      { metric: "stub_signal", value: 1 },
    ]);
    expect(service.state.done).toBe(true);
    service.stop();
  });

  it("Framing pattern: BRANCH option selects a MEASURE arm whose weight is the recorded value", () => {
    const config = getFlow("experiment-framing-pattern");
    expect(config.type).toBe("experiment");
    expect(config.steps.headline).toMatchObject({
      type: "BRANCH",
      options: [
        expect.objectContaining({ value: "amplify", next: "measure_amplify" }),
        expect.objectContaining({ value: "verify", next: "measure_verify" }),
      ],
    });
    expect(config.steps.measure_amplify).toMatchObject({
      type: "MEASURE",
      metric: "framing",
      weight: 1,
      next: "done",
    });
    expect(config.steps.measure_verify).toMatchObject({
      type: "MEASURE",
      metric: "framing",
      weight: 0,
      next: "done",
    });

    const service = interpret(compileFlowToMachine(config)).start();
    service.send("verify");
    expect(service.state.value).toBe("measure_verify");
    expect(service.state.context.answers).toEqual({});
    service.send("NEXT");
    expect(service.state.value).toBe("done");
    expect(service.state.context.measurements).toEqual([
      { metric: "framing", value: 0 },
    ]);
    expect(service.state.context.answers).toEqual({});
    service.stop();
  });

  it("throws for an unknown flowId", () => {
    expect(() => getFlow("does-not-exist")).toThrow(/Unknown flowId/);
  });
});

describe("glob discovery", () => {
  it("does not use a manual per-flow import or registry map", () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(srcDir, "index.ts"), "utf8");
    const loaderSrc = readFileSync(join(srcDir, "loadFlows.ts"), "utf8");

    expect(indexSrc).not.toMatch(/from ["']\.\/flows\//);
    expect(loaderSrc).not.toMatch(/from ["']\.\/flows\//);
    expect(indexSrc + loaderSrc).not.toMatch(
      /flowRegistry:\s*Record<string,\s*unknown>\s*=\s*\{/,
    );
    expect(loaderSrc).toMatch(/import\.meta\.glob/);
  });

  it("makes every on-disk *.v*.json loadable via getFlow with zero per-file edits", () => {
    const onDisk = flowFilesOnDisk();
    expect(onDisk.length).toBeGreaterThan(0);

    const loadedIds = listFlows()
      .map((flow) => flow.flowId)
      .sort();
    const diskIds = onDisk.map((entry) => entry.flowId).sort();

    expect(loadedIds).toEqual(diskIds);

    for (const entry of onDisk) {
      const config = getFlow(entry.flowId);
      expect(config.flowId).toBe(entry.flowId);
      expect(config.type).toBe(entry.type);
    }
  });
});

describe("listExperiments", () => {
  it("returns every experiment with title, track, and teaser (no crisis flows)", () => {
    const experiments = listExperiments();
    const experimentIdsOnDisk = flowFilesOnDisk()
      .filter((entry) => entry.type === "experiment")
      .map((entry) => entry.flowId)
      .sort();

    expect(experiments.map((e) => e.flowId).sort()).toEqual(experimentIdsOnDisk);
    expect(experimentIdsOnDisk).toEqual(
      expect.arrayContaining([
        "experiment-stub",
        "experiment-dummy-b",
        "experiment-framing-pattern",
      ]),
    );
    expect(experiments.every((e) => !e.flowId.includes("crisis"))).toBe(true);

    for (const experiment of experiments) {
      expect(experiment.title.length).toBeGreaterThan(0);
      expect(experiment.track.length).toBeGreaterThan(0);
      expect(experiment.teaser.length).toBeGreaterThan(0);
      // No scoring spoilers in listing copy.
      expect(experiment.teaser.toLowerCase()).not.toMatch(
        /metric|score|test(s|ing)? your/,
      );
    }
  });
});

describe("crisis flow details", () => {
  it("routes each branch to its own template key", () => {
    const config = getFlow("crisis-deepfake-classmate");
    const branch = config.steps.choose_contact;
    expect(branch.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "trusted_adult",
          next: "template_trusted_adult",
        }),
        expect.objectContaining({
          value: "school_contact",
          next: "template_school_contact",
        }),
        expect.objectContaining({
          value: "platform_report",
          next: "template_platform_report",
        }),
      ]),
    );

    expect(config.steps.template_trusted_adult.templateKey).toBe(
      "crisis-deepfake-classmate-trusted-adult",
    );
    expect(config.steps.template_school_contact.templateKey).toBe(
      "crisis-deepfake-classmate-school-contact",
    );
    expect(config.steps.template_platform_report.templateKey).toBe(
      "crisis-deepfake-classmate-platform-report",
    );
  });
});

describe("getMessageTemplate", () => {
  it("returns each branch template with placeholders", () => {
    const trusted = getMessageTemplate(
      "crisis-deepfake-classmate-trusted-adult",
    );
    expect(trusted.body).toContain("[classmate's name]");
    expect(trusted.body).toContain("[trusted adult's name]");

    const school = getMessageTemplate(
      "crisis-deepfake-classmate-school-contact",
    );
    expect(school.body).toContain("[classmate's name]");
    expect(school.body).toContain("[school contact's name / role]");

    const platform = getMessageTemplate(
      "crisis-deepfake-classmate-platform-report",
    );
    expect(platform.body).toContain("[classmate's name]");
    expect(platform.body).toContain("[platform + URL or username]");
  });

  it("falls back to en when locale is missing", () => {
    const template = getMessageTemplate(
      "crisis-deepfake-classmate-trusted-adult",
      "fr",
    );
    expect(template.locale).toBe("en");
    expect(template.body.length).toBeGreaterThan(0);
  });

  it("throws for an unknown template key", () => {
    expect(() => getMessageTemplate("does-not-exist")).toThrow(
      /Unknown template key/,
    );
  });
});

describe("getResources", () => {
  it("returns the default crisis-deepfake-classmate set with real links", () => {
    const set = getResources("crisis-deepfake-classmate");

    expect(set.key).toBe("crisis-deepfake-classmate");
    expect(set.title.length).toBeGreaterThan(0);
    expect(set.resources.length).toBeGreaterThanOrEqual(3);

    const urls = set.resources.map((r) => r.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        "https://takeitdown.ncmec.org/",
        "https://report.cybertip.org/",
        "https://stopncii.org/",
        "https://revengepornhelpline.org.uk/",
        "https://www.crisistextline.org/",
      ]),
    );

    for (const resource of set.resources) {
      expect(resource.title.length).toBeGreaterThan(0);
      expect(resource.description.length).toBeGreaterThan(0);
      expect(resource.url).toMatch(/^https:\/\//);
    }
  });

  it("throws for an unknown resource set", () => {
    expect(() => getResources("does-not-exist")).toThrow(/Unknown resource set/);
  });
});

describe("getStepChrome", () => {
  it("loads per-step-type chrome used by flow-step components", () => {
    const chrome = getStepChrome();
    expect(chrome.stepTypes.STOP.title).toBe("Stop");
    expect(chrome.stepTypes.PRESERVE.title).toBe("Preserve evidence");
    expect(chrome.stepTypes.BRANCH.title).toBe("Choose a path");
    expect(chrome.stepTypes.MEASURE.title).toBe("Measure");
    expect(chrome.stepTypes.TEMPLATE.titleFallback).toBe("Message template");
    expect(chrome.stepTypes.RESOURCES.eyebrow).toBe("Done for now");
    expect(chrome.stepTypes.RESOURCES.titleFallback).toBe("Resources");
    expect(chrome.empty.resources).toMatch(/No resources/);
    expect(chrome.empty.template).toMatch(/No message template/);
    expect(chrome.actions.continue).toBe("Continue");
  });
});
