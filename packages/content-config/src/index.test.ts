import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { compileFlowToMachine } from "@isitfr/engine";
import { validateFlowConfig } from "@isitfr/schemas";
import { interpret } from "xstate";

import { getAuthChrome, getDashboardChrome, getFeed, getFlow, getLandingChrome, getMessageTemplate, getProfileChrome, getReportChrome, getResources, getStepChrome, listExperiments, listFlows } from "./index";

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

  it("framing-headlines: article-compare BRANCH routes by variant to framing_bias MEASURE", () => {
    const config = getFlow("framing-headlines");
    expect(config.type).toBe("experiment");
    expect(config.track).toBe("Framing");
    expect(config.steps.compare).toMatchObject({
      type: "BRANCH",
      payload: expect.objectContaining({ kind: "article-compare" }),
    });

    const payload = config.steps.compare.payload;
    expect(payload).toMatchObject({
      kind: "article-compare",
      variants: expect.arrayContaining([
        expect.objectContaining({
          id: "neutral",
          headline: expect.stringContaining("Westbridge council votes"),
        }),
        expect.objectContaining({
          id: "emotional",
          headline: expect.stringContaining("Sunday storytime gone"),
        }),
        expect.objectContaining({
          id: "political",
          headline: expect.stringContaining("Council majority steamrolls"),
        }),
      ]),
      actions: expect.arrayContaining([
        expect.objectContaining({ value: "trust" }),
        expect.objectContaining({ value: "share" }),
      ]),
    });
    expect(
      Array.isArray(payload?.variants) ? payload.variants.length : 0,
    ).toBe(3);

    expect(config.steps.measure_neutral).toMatchObject({
      type: "MEASURE",
      metric: "framing_bias",
      weight: 0,
      next: "done",
    });
    expect(config.steps.measure_emotional).toMatchObject({
      type: "MEASURE",
      metric: "framing_bias",
      weight: 0.5,
      next: "done",
    });
    expect(config.steps.measure_political).toMatchObject({
      type: "MEASURE",
      metric: "framing_bias",
      weight: 1,
      next: "done",
    });

    const service = interpret(compileFlowToMachine(config)).start();
    expect(service.state.value).toBe("compare");
    service.send("emotional_share");
    expect(service.state.value).toBe("measure_emotional");
    expect(service.state.context.answers).toEqual({});
    service.send("NEXT");
    expect(service.state.value).toBe("done");
    expect(service.state.context.measurements).toEqual([
      { metric: "framing_bias", value: 0.5 },
    ]);
    expect(service.state.done).toBe(true);
    service.stop();
  });

  it("echo-chamber MEASURE records client-supplied perspective_diversity", () => {
    const config = getFlow("echo-chamber");
    const service = interpret(compileFlowToMachine(config)).start();
    expect(service.state.value).toBe("perspective_diversity");
    service.send({ type: "NEXT", value: 0.25 });
    expect(service.state.value).toBe("done");
    expect(service.state.context.measurements).toEqual([
      { metric: "perspective_diversity", value: 0.25 },
    ]);
    expect(service.state.done).toBe(true);
    service.stop();
  });

  it("memory-recall: accurate vs misleading BRANCH arms record different memory_reliability weights", () => {
    const config = getFlow("memory-recall");
    expect(config.type).toBe("experiment");
    expect(config.track).toBe("Memory");
    expect(config.steps.watch?.payload).toMatchObject({
      kind: "video-display",
    });
    expect(config.steps.wait?.payload).toMatchObject({
      kind: "delay",
      durationMs: 8000,
    });
    expect(
      (config.steps.wait?.payload?.durationMs as number | undefined) ?? 0,
    ).toBeGreaterThan(1000);

    const accurate = interpret(compileFlowToMachine(config)).start();
    accurate.send("NEXT");
    expect(accurate.state.value).toBe("wait");
    accurate.send("NEXT");
    expect(accurate.state.value).toBe("color");
    accurate.send("pink");
    expect(accurate.state.value).toBe("measure_color_accurate");
    accurate.send("NEXT");
    accurate.send("closeup");
    accurate.send("NEXT");
    expect(accurate.state.value).toBe("done");
    expect(accurate.state.context.measurements).toEqual([
      { metric: "memory_reliability", value: 1 },
      { metric: "memory_reliability", value: 1 },
    ]);
    expect(accurate.state.context.answers).toEqual({});
    accurate.stop();

    const misleading = interpret(compileFlowToMachine(config)).start();
    misleading.send("NEXT");
    misleading.send("NEXT");
    misleading.send("yellow");
    misleading.send("NEXT");
    misleading.send("bee");
    misleading.send("NEXT");
    expect(misleading.state.value).toBe("done");
    expect(misleading.state.context.measurements).toEqual([
      { metric: "memory_reliability", value: 0 },
      { metric: "memory_reliability", value: 0 },
    ]);
    expect(misleading.state.context.answers).toEqual({});
    misleading.stop();
  });

  it("read-the-room compiles via the same compileFlowToMachine as Crisis Mode and scores deepfake_resilience", () => {
    const crisis = getFlow("crisis-deepfake-classmate");
    const room = getFlow("read-the-room");
    const flowText = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "flows/read-the-room.v1.json"),
      "utf8",
    );

    expect(room.type).toBe("experiment");
    expect(room.track).toBe("Read the Room");
    expect(room.skin).toBe("chat-bubble");
    expect(crisis.skin).toBeUndefined();

    const types = new Set(
      Object.values(room.steps).map((step) => step.type),
    );
    expect(types).toEqual(
      new Set([
        "STOP",
        "PRESERVE",
        "BRANCH",
        "TEMPLATE",
        "RESOURCES",
        "MEASURE",
      ]),
    );

    expect(room.steps.template_group?.templateKey).toBe(
      "read-the-room-group-pause",
    );
    expect(getMessageTemplate("read-the-room-group-pause").body).toMatch(
      /don't forward/i,
    );

    expect(flowText).not.toMatch(/https?:\/\//);
    expect(flowText).not.toMatch(/<(img|video)\b/i);
    expect(flowText.toLowerCase()).toContain("never shows that clip");

    const crisisMachine = compileFlowToMachine(crisis);
    const roomMachine = compileFlowToMachine(room);
    expect(crisisMachine.id).toBe("crisis-deepfake-classmate");
    expect(roomMachine.id).toBe("read-the-room");
    expect(roomMachine.initial).toBe("pause");

    const verifyFirst = interpret(roomMachine).start();
    verifyFirst.send("NEXT");
    expect(verifyFirst.state.value).toBe("save_thread");
    verifyFirst.send("NEXT");
    expect(verifyFirst.state.value).toBe("first_reply");
    verifyFirst.send("verify");
    expect(verifyFirst.state.value).toBe("measure_verify");
    verifyFirst.send("NEXT");
    expect(verifyFirst.state.value).toBe("who");
    verifyFirst.send("adult");
    verifyFirst.send("NEXT");
    expect(verifyFirst.state.value).toBe("template_group");
    verifyFirst.send("NEXT");
    expect(verifyFirst.state.value).toBe("resources");
    expect(verifyFirst.state.context.measurements).toEqual([
      { metric: "deepfake_resilience", value: 1 },
      { metric: "deepfake_resilience", value: 1 },
    ]);
    expect(verifyFirst.state.context.answers).toEqual({});
    expect(verifyFirst.state.done).toBe(true);
    verifyFirst.stop();

    const reshare = interpret(compileFlowToMachine(room)).start();
    reshare.send("NEXT");
    reshare.send("NEXT");
    reshare.send("forward");
    expect(reshare.state.value).toBe("measure_forward");
    reshare.send("NEXT");
    reshare.send("group_only");
    reshare.send("NEXT");
    expect(reshare.state.context.measurements).toEqual([
      { metric: "deepfake_resilience", value: 0 },
      { metric: "deepfake_resilience", value: 0 },
    ]);
    expect(reshare.state.done).toBe(false);
    reshare.stop();
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

  it("does not hand-import templates, feeds, or resource sets", () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(srcDir, "index.ts"), "utf8");
    expect(indexSrc).not.toMatch(/from ["']\.\/templates\//);
    expect(indexSrc).not.toMatch(/from ["']\.\/feeds\//);
    expect(indexSrc).not.toMatch(/from ["']\.\/resources\//);

    for (const loader of ["loadTemplates.ts", "loadFeeds.ts", "loadResources.ts"]) {
      const loaderSrc = readFileSync(join(srcDir, loader), "utf8");
      expect(loaderSrc).not.toMatch(/from ["']\.\/(templates|feeds|resources)\//);
      expect(loaderSrc).toMatch(/import\.meta\.glob/);
    }
  });

  it("makes every on-disk template JSON loadable via getMessageTemplate", () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(join(srcDir, "templates")).filter((name) =>
      name.endsWith(".json"),
    );
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const parsed: unknown = JSON.parse(
        readFileSync(join(srcDir, "templates", file), "utf8"),
      );
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("key" in parsed) ||
        !("locale" in parsed) ||
        typeof parsed.key !== "string" ||
        typeof parsed.locale !== "string"
      ) {
        throw new Error(`Template file ${file} is missing key/locale`);
      }
      const loaded = getMessageTemplate(parsed.key, parsed.locale);
      expect(loaded.key).toBe(parsed.key);
      expect(loaded.locale).toBe(parsed.locale);
    }
  });

  it("makes every on-disk resource-set JSON loadable via getResources", () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(join(srcDir, "resources")).filter((name) =>
      name.endsWith(".json"),
    );
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const parsed: unknown = JSON.parse(
        readFileSync(join(srcDir, "resources", file), "utf8"),
      );
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("key" in parsed) ||
        typeof parsed.key !== "string"
      ) {
        throw new Error(`Resource file ${file} is missing key`);
      }
      expect(getResources(parsed.key).key).toBe(parsed.key);
    }
  });

  it("makes every on-disk feed JSON loadable via getFeed", () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(join(srcDir, "feeds")).filter((name) =>
      name.endsWith(".json"),
    );
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const parsed: unknown = JSON.parse(
        readFileSync(join(srcDir, "feeds", file), "utf8"),
      );
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("key" in parsed) ||
        typeof parsed.key !== "string"
      ) {
        throw new Error(`Feed file ${file} is missing key`);
      }
      expect(getFeed(parsed.key).key).toBe(parsed.key);
    }
  });
});

describe("listExperiments", () => {
  it("lists only production experiments (dev stubs stay loadable via getFlow)", () => {
    const experiments = listExperiments();
    const listedIds = experiments.map((e) => e.flowId).sort();

    expect(listedIds).toEqual(
      ["echo-chamber", "framing-headlines", "memory-recall", "read-the-room"].sort(),
    );
    expect(experiments.every((e) => !e.flowId.includes("crisis"))).toBe(true);

    for (const experiment of experiments) {
      expect(experiment.title.length).toBeGreaterThan(0);
      expect(experiment.teaser.length).toBeGreaterThan(0);
      expect(experiment).not.toHaveProperty("track");
      expect(experiment.teaser.toLowerCase()).not.toMatch(
        /metric|score|test(s|ing)? your/,
      );
    }

    expect(experiments.map((e) => e.title).sort()).toEqual(
      ["After the clip", "The group chat", "Three takes", "Your feed"].sort(),
    );
    const listing = experiments
      .map((e) => `${e.title} ${e.teaser}`)
      .join("\n");
    expect(listing).not.toMatch(/\bFraming\b/);
    expect(listing).not.toMatch(/\bEcho\b/);
    expect(listing).not.toMatch(/\bMemory\b/);
    expect(listing).not.toMatch(/Read the Room/);

    expect(getFlow("framing-headlines").track).toBe("Framing");
    expect(getFlow("echo-chamber").track).toBe("Echo");
    expect(getFlow("memory-recall").track).toBe("Memory");
    expect(getFlow("read-the-room").track).toBe("Read the Room");

    expect(getFlow("experiment-stub").listed).toBe(false);
    expect(getFlow("experiment-dummy-b").listed).toBe(false);
    expect(getFlow("experiment-framing-pattern").listed).toBe(false);
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

describe("echo-chamber feed catalog", () => {
  it("keeps feed posts out of the flow JSON and loadable by feedKey", () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const flowText = readFileSync(
      join(srcDir, "flows/echo-chamber.v1.json"),
      "utf8",
    );
    const catalog = getFeed("echo-chamber");
    const config = getFlow("echo-chamber");

    expect(config.steps.perspective_diversity?.type).toBe("MEASURE");
    expect(config.steps.perspective_diversity?.metric).toBe(
      "perspective_diversity",
    );
    expect(config.steps.perspective_diversity?.payload).toEqual({
      kind: "echo-feed",
      feedKey: "echo-chamber",
      clicks: 5,
    });
    expect(catalog.key).toBe("echo-chamber");
    expect(catalog.items.length).toBeGreaterThanOrEqual(12);

    const topics = new Set(catalog.items.flatMap((post) => post.topics));
    expect(topics.size).toBeGreaterThan(1);

    for (const post of catalog.items) {
      expect(post.id.length).toBeGreaterThan(0);
      expect(post.topics.length).toBeGreaterThan(0);
      expect(post.headline.length).toBeGreaterThan(0);
      expect(flowText).not.toContain(post.headline);
      expect(flowText).not.toContain(post.id);
    }
  });

  it("throws for an unknown feed key", () => {
    expect(() => getFeed("does-not-exist")).toThrow(/Unknown feed/);
  });
});

describe("getStepChrome", () => {
  it("loads per-step-type chrome used by flow-step components", () => {
    const chrome = getStepChrome();
    expect(chrome.stepTypes.STOP.title).toBe("Stop");
    expect(chrome.stepTypes.PRESERVE.title).toBe("Preserve evidence");
    expect(chrome.stepTypes.BRANCH.title).toBe("Choose a path");
    expect(chrome.stepTypes.MEASURE.title.length).toBeGreaterThan(0);
    expect(chrome.stepTypes.MEASURE.title.toLowerCase()).not.toBe("measure");
    expect(chrome.stepTypes.TEMPLATE.titleFallback).toBe("Message template");
    expect(chrome.stepTypes.TEMPLATE.nameLabel.length).toBeGreaterThan(0);
    expect(chrome.stepTypes.TEMPLATE.personalize.length).toBeGreaterThan(0);
    expect(chrome.stepTypes.RESOURCES.eyebrow).toBe("Done for now");
    expect(chrome.stepTypes.RESOURCES.titleFallback).toBe("Resources");
    expect(chrome.empty.resources).toMatch(/No resources/);
    expect(chrome.empty.template).toMatch(/No message template/);
    expect(chrome.actions.continue).toBe("Continue");
    expect(chrome.persist.unsaved.length).toBeGreaterThan(0);
  });
});

describe("getDashboardChrome", () => {
  it("loads train dashboard chrome without inlining it in the page", () => {
    const chrome = getDashboardChrome();
    expect(chrome.title.length).toBeGreaterThan(0);
    expect(chrome.intro.length).toBeGreaterThan(0);
    expect(chrome.profile.length).toBeGreaterThan(0);
    expect(chrome.account.toLowerCase()).toMatch(/account/);
    expect(chrome.account.toLowerCase()).toMatch(/saved automatically/);
    expect(chrome.intro.toLowerCase()).toMatch(/saved automatically/);
  });
});

describe("getAuthChrome", () => {
  it("loads forgot-password copy without claiming a reset was sent for a missing account", () => {
    const chrome = getAuthChrome();
    expect(chrome.forgot.link.length).toBeGreaterThan(0);
    expect(chrome.forgot.sent.toLowerCase()).toMatch(/if an account exists/);
    expect(chrome.reset.missingSession.toLowerCase()).toMatch(/expired|invalid/);
  });
});

describe("getLandingChrome", () => {
  it("loads the landing hero question from chrome, not a hardcoded page string", () => {
    const chrome = getLandingChrome();
    expect(chrome.hero.headline).toBe("Is It For Real?");
    expect(chrome.hero.subline.length).toBeGreaterThan(0);
  });

  it("loads three explainer blocks with real product copy, not placeholders", () => {
    const chrome = getLandingChrome();
    expect(chrome.explainer).toHaveLength(3);
    expect(chrome.explainer.map((block) => block.eyebrow)).toEqual([
      "What this is",
      "The problem",
      "What you do here",
    ]);
    const blob = chrome.explainer.map((block) => block.body).join(" ");
    expect(blob.toLowerCase()).not.toMatch(/lorem|ipsum|placeholder|todo/);
    expect(blob.toLowerCase()).toMatch(/practice/);
    expect(blob.toLowerCase()).toMatch(/deepfake|fake/);
    expect(blob.toLowerCase()).toMatch(/sign in/);
    expect(blob.toLowerCase()).toMatch(/account/);
    expect(blob.toLowerCase()).toMatch(/save as you go/);
  });

  it("loads two path entries for practice and help", () => {
    const chrome = getLandingChrome();
    expect(chrome.entries.map((entry) => entry.kind)).toEqual([
      "practice",
      "help",
    ]);
    expect(chrome.entries[0]?.action).toBe("Start practicing");
    expect(chrome.entries[1]?.action).toBe("Get help now");
    expect(chrome.entries[0]?.body.toLowerCase()).toMatch(/account/);
    expect(chrome.entries[0]?.body.toLowerCase()).toMatch(/saved automatically/);
    expect(chrome.footer.note.toLowerCase()).toMatch(/sign in/);
  });
});

describe("getProfileChrome", () => {
  it("loads profile page chrome including the empty-state copy", () => {
    const chrome = getProfileChrome();
    expect(chrome.title.length).toBeGreaterThan(0);
    expect(chrome.empty.action.length).toBeGreaterThan(0);
    expect(chrome.empty.body.toLowerCase()).toMatch(/dashboard|scenario/);
  });
});

describe("getReportChrome", () => {
  it("loads reflection chrome without warning or verdict language", () => {
    const chrome = getReportChrome();
    expect(chrome.title.length).toBeGreaterThan(0);
    expect(chrome.strengths.length).toBeGreaterThan(0);
    expect(chrome.growthAreas.length).toBeGreaterThan(0);
    expect(chrome.regenerate.length).toBeGreaterThan(0);
    const blob = JSON.stringify(chrome).toLowerCase();
    expect(blob).not.toMatch(/warning|danger|alert|error|fail|weakness/);
  });
});

describe("training persistence copy", () => {
  it("does not claim training stays on-device until the user saves a profile", () => {
    const blob = [
      JSON.stringify(getLandingChrome()),
      JSON.stringify(getDashboardChrome()),
    ]
      .join("\n")
      .toLowerCase();
    expect(blob).not.toMatch(/leaves the device/);
    expect(blob).not.toMatch(/unless the user/);
    expect(blob).not.toMatch(/save my results/);
    expect(blob).not.toMatch(/choose to save a profile/);
  });
});

