import { describe, expect, it } from "vitest";
import { validateFlowConfig, type FlowConfig } from "./flow";

const validCrisisConfig: FlowConfig = {
  flowId: "crisis-help",
  version: 1,
  type: "crisis",
  title: "IsItFR Crisis Help",
  initial: "stop",
  steps: {
    stop: {
      type: "STOP",
      prompt: "Stop. Do not share or engage further.",
      why: "Engaging can amplify harm.",
      next: "preserve",
    },
    preserve: {
      type: "PRESERVE",
      prompt: "Preserve evidence before anything else.",
      next: "who",
    },
    who: {
      type: "BRANCH",
      prompt: "Who do you need to tell?",
      options: [
        { label: "A trusted friend", value: "friend", next: "template" },
        { label: "Someone in authority", value: "authority", next: "template" },
      ],
    },
    template: {
      type: "TEMPLATE",
      prompt: "Send this message.",
      templateKey: "crisis-notify",
      next: "resources",
    },
    resources: {
      type: "RESOURCES",
      prompt: "Here are resources that can help.",
      resourceSet: "crisis-default",
    },
  },
};

describe("validateFlowConfig", () => {
  it("accepts a valid crisis-shaped config", () => {
    const result = validateFlowConfig(validCrisisConfig);
    expect(result).toEqual(validCrisisConfig);
  });

  it("fails when initial is missing", () => {
    const { initial: _initial, ...withoutInitial } = validCrisisConfig;
    expect(() => validateFlowConfig(withoutInitial)).toThrow(/initial/i);
  });

  it("fails on unknown step type", () => {
    const invalid = {
      ...validCrisisConfig,
      steps: {
        ...validCrisisConfig.steps,
        stop: {
          ...validCrisisConfig.steps.stop,
          type: "UNKNOWN",
        },
      },
    };
    expect(() => validateFlowConfig(invalid)).toThrow(/type/i);
  });

  it("fails when a BRANCH option next points to a missing step key", () => {
    const invalid = {
      ...validCrisisConfig,
      steps: {
        ...validCrisisConfig.steps,
        who: {
          type: "BRANCH" as const,
          prompt: "Who do you need to tell?",
          options: [
            {
              label: "A trusted friend",
              value: "friend",
              next: "does-not-exist",
            },
          ],
        },
      },
    };

    expect(() => validateFlowConfig(invalid)).toThrow(
      /Option next "does-not-exist" does not exist in steps/,
    );
  });

  it("requires metric on MEASURE steps and allows optional weight", () => {
    const withMetricAndWeight = validateFlowConfig({
      flowId: "measure-ok",
      version: 1,
      type: "experiment",
      title: "Measure ok",
      track: "Foundation",
      teaser: "A short interactive scenario.",
      initial: "probe",
      steps: {
        probe: {
          type: "MEASURE",
          prompt: "Pick a signal",
          metric: "attention",
          weight: 1.5,
          next: "done",
        },
        done: {
          type: "STOP",
          prompt: "Done",
        },
      },
    });
    expect(withMetricAndWeight.steps.probe.metric).toBe("attention");
    expect(withMetricAndWeight.steps.probe.weight).toBe(1.5);

    const metricOnly = validateFlowConfig({
      flowId: "measure-metric-only",
      version: 1,
      type: "experiment",
      title: "Measure metric only",
      track: "Foundation",
      teaser: "A short interactive scenario.",
      initial: "probe",
      steps: {
        probe: {
          type: "MEASURE",
          prompt: "Pick a signal",
          metric: "framing",
        },
      },
    });
    expect(metricOnly.steps.probe.metric).toBe("framing");
    expect(metricOnly.steps.probe.weight).toBeUndefined();

    expect(() =>
      validateFlowConfig({
        flowId: "measure-missing-metric",
        version: 1,
        type: "experiment",
        title: "Missing metric",
        track: "Foundation",
        teaser: "A short interactive scenario.",
        initial: "probe",
        steps: {
          probe: {
            type: "MEASURE",
            prompt: "No metric",
          },
        },
      }),
    ).toThrow(/MEASURE steps require "metric"/);
  });

  it("requires track and teaser on experiment flows", () => {
    expect(() =>
      validateFlowConfig({
        flowId: "exp-no-listing",
        version: 1,
        type: "experiment",
        title: "No listing fields",
        initial: "done",
        steps: {
          done: { type: "STOP", prompt: "Done" },
        },
      }),
    ).toThrow(/experiment flows require "track"/);

    const ok = validateFlowConfig({
      flowId: "exp-listing",
      version: 1,
      type: "experiment",
      title: "Listed experiment",
      track: "Foundation",
      teaser: "Jump in without knowing what is measured.",
      initial: "done",
      steps: {
        done: { type: "STOP", prompt: "Done" },
      },
    });
    expect(ok.track).toBe("Foundation");
    expect(ok.teaser).toBe("Jump in without knowing what is measured.");
  });

  it("accepts optional chat-bubble skin and ignores it for crisis-shaped configs", () => {
    const withSkin = validateFlowConfig({
      flowId: "skinned",
      version: 1,
      type: "experiment",
      title: "Skinned",
      track: "Room",
      teaser: "A short interactive scenario.",
      skin: "chat-bubble",
      initial: "done",
      steps: {
        done: { type: "STOP", prompt: "Done" },
      },
    });
    expect(withSkin.skin).toBe("chat-bubble");

    const crisis = validateFlowConfig(validCrisisConfig);
    expect(crisis.skin).toBeUndefined();
  });

  it("rejects a direct self-loop (next pointing at the same step)", () => {
    expect(() =>
      validateFlowConfig({
        flowId: "self-loop",
        version: 1,
        type: "crisis",
        title: "Self loop",
        initial: "start",
        steps: {
          start: {
            type: "STOP",
            prompt: "Do not loop",
            next: "start",
          },
        },
      }),
    ).toThrow(/cycle detected: start → start/);
  });

  it("rejects a 3-step cycle A→B→C→A", () => {
    expect(() =>
      validateFlowConfig({
        flowId: "three-cycle",
        version: 1,
        type: "crisis",
        title: "Three cycle",
        initial: "a",
        steps: {
          a: { type: "STOP", prompt: "A", next: "b" },
          b: { type: "PRESERVE", prompt: "B", next: "c" },
          c: { type: "TEMPLATE", prompt: "C", templateKey: "t", next: "a" },
        },
      }),
    ).toThrow(/cycle detected: a → b → c → a/);
  });

  it("accepts a BRANCH diamond where options converge on the same later step", () => {
    const diamond = validateFlowConfig({
      flowId: "diamond",
      version: 1,
      type: "crisis",
      title: "Diamond",
      initial: "fork",
      steps: {
        fork: {
          type: "BRANCH",
          prompt: "Pick a path",
          options: [
            { label: "Left", value: "left", next: "left" },
            { label: "Right", value: "right", next: "right" },
          ],
        },
        left: {
          type: "PRESERVE",
          prompt: "Left arm",
          next: "join",
        },
        right: {
          type: "TEMPLATE",
          prompt: "Right arm",
          templateKey: "t",
          next: "join",
        },
        join: {
          type: "RESOURCES",
          prompt: "Together again",
          resourceSet: "crisis-default",
        },
      },
    });

    expect(diamond.steps.fork.options?.map((o) => o.next)).toEqual([
      "left",
      "right",
    ]);
    expect(diamond.steps.left.next).toBe("join");
    expect(diamond.steps.right.next).toBe("join");
  });

  it("fails when a MEASURE step is missing metric", () => {
    expect(() =>
      validateFlowConfig({
        flowId: "measure-missing-metric-named",
        version: 1,
        type: "experiment",
        title: "Missing metric",
        track: "Foundation",
        teaser: "A short interactive scenario.",
        initial: "probe",
        steps: {
          probe: {
            type: "MEASURE",
            prompt: "No metric field",
          },
        },
      }),
    ).toThrow(/MEASURE steps require "metric"/);
  });

  it("accepts optional weight on MEASURE steps when present or absent", () => {
    const withWeight = validateFlowConfig({
      flowId: "measure-weight-present",
      version: 1,
      type: "experiment",
      title: "Weight present",
      track: "Foundation",
      teaser: "A short interactive scenario.",
      initial: "probe",
      steps: {
        probe: {
          type: "MEASURE",
          prompt: "Weighted probe",
          metric: "attention",
          weight: 2,
        },
      },
    });
    expect(withWeight.steps.probe.weight).toBe(2);

    const withoutWeight = validateFlowConfig({
      flowId: "measure-weight-absent",
      version: 1,
      type: "experiment",
      title: "Weight absent",
      track: "Foundation",
      teaser: "A short interactive scenario.",
      initial: "probe",
      steps: {
        probe: {
          type: "MEASURE",
          prompt: "Unweighted probe",
          metric: "attention",
        },
      },
    });
    expect(withoutWeight.steps.probe.weight).toBeUndefined();
  });

  it("accepts optional generic payload and preserves nested stimulus", () => {
    const withPayload = validateFlowConfig({
      flowId: "payload-ok",
      version: 1,
      type: "experiment",
      title: "Payload ok",
      track: "Foundation",
      teaser: "A short interactive scenario.",
      initial: "fork",
      steps: {
        fork: {
          type: "BRANCH",
          prompt: "Pick a take",
          payload: {
            kind: "article-compare",
            variants: [
              { id: "neutral", headline: "Hours trimmed", body: "Council vote." },
            ],
          },
          options: [
            { label: "Trust", value: "neutral_trust", next: "done" },
          ],
        },
        done: {
          type: "STOP",
          prompt: "Done",
        },
      },
    });

    expect(withPayload.steps.fork.payload).toEqual({
      kind: "article-compare",
      variants: [
        { id: "neutral", headline: "Hours trimmed", body: "Council vote." },
      ],
    });

    const withoutPayload = validateFlowConfig({
      flowId: "payload-absent",
      version: 1,
      type: "crisis",
      title: "No payload",
      initial: "stop",
      steps: {
        stop: { type: "STOP", prompt: "Stop." },
      },
    });
    expect(withoutPayload.steps.stop.payload).toBeUndefined();
  });

  it("fails when a non-BRANCH step next points to a missing step key", () => {
    const invalid = {
      ...validCrisisConfig,
      steps: {
        ...validCrisisConfig.steps,
        preserve: {
          ...validCrisisConfig.steps.preserve,
          next: "does-not-exist",
        },
      },
    };

    expect(() => validateFlowConfig(invalid)).toThrow(
      /steps\.preserve\.next: next "does-not-exist" does not exist in steps/,
    );
  });
});
