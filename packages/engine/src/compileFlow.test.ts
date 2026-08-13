import { afterEach, describe, expect, it, vi } from "vitest";
import { interpret } from "xstate";
import { validateFlowConfig, type FlowConfig } from "@isitfr/schemas";
import { compileFlowToMachine } from "./compileFlow";

const crisisConfig: FlowConfig = {
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

/** Minimal valid skeleton; tests override `steps` / `initial` as needed. */
function flow(partial: {
  initial?: string;
  type?: FlowConfig["type"];
  title?: string;
  track?: string;
  teaser?: string;
  steps: FlowConfig["steps"];
}): FlowConfig {
  const type = partial.type ?? "crisis";
  return {
    flowId: "edge-case",
    version: 1,
    type,
    title: partial.title ?? "Edge case flow",
    ...(type === "experiment"
      ? {
          track: partial.track ?? "Foundation",
          teaser: partial.teaser ?? "A short interactive scenario.",
        }
      : {
          ...(partial.track !== undefined ? { track: partial.track } : {}),
          ...(partial.teaser !== undefined ? { teaser: partial.teaser } : {}),
        }),
    initial: partial.initial ?? "start",
    steps: partial.steps,
  };
}

describe("compileFlowToMachine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("compiles a crisis-shaped config and scripts a transition path", () => {
    const config = validateFlowConfig(crisisConfig);
    const machine = compileFlowToMachine(config);

    const service = interpret(machine).start();

    expect(service.state.value).toBe("stop");
    expect(service.state.context).toEqual({
      sessionId: "",
      answers: {},
      startedAt: "",
      measurements: [],
    });
    expect(service.state.meta[`crisis-help.stop`]).toMatchObject({
      type: "STOP",
      prompt: "Stop. Do not share or engage further.",
    });

    service.send("NEXT");
    expect(service.state.value).toBe("preserve");

    service.send("NEXT");
    expect(service.state.value).toBe("who");
    expect(service.state.meta[`crisis-help.who`]).toMatchObject({
      type: "BRANCH",
    });

    service.send("friend");
    expect(service.state.value).toBe("template");

    service.send("NEXT");
    expect(service.state.value).toBe("resources");
    expect(service.state.done).toBe(true);

    service.stop();
  });

  describe("graph contract", () => {
    it("throws on dangling BRANCH option reference", () => {
      // Bypass schema on purpose: compiler must still refuse dead-end targets.
      const config = flow({
        steps: {
          start: {
            type: "BRANCH",
            prompt: "Pick one",
            options: [
              {
                label: "Broken",
                value: "broken",
                next: "does-not-exist",
              },
            ],
          },
        },
      }) as FlowConfig;

      expect(() => compileFlowToMachine(config)).toThrow(
        /BRANCH option "broken" on step "start".*nonexistent step "does-not-exist"/,
      );
    });

    it("rejects a self-next at the schema boundary before compile", () => {
      expect(() =>
        validateFlowConfig(
          flow({
            steps: {
              start: {
                type: "STOP",
                prompt: "Do not loop",
                next: "start",
              },
            },
          }),
        ),
      ).toThrow(/cycle detected: start → start/);
    });

    it("warns on untargeted step without failing compile", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const config = validateFlowConfig(
        flow({
          initial: "start",
          steps: {
            start: {
              type: "STOP",
              prompt: "Begin",
              next: "end",
            },
            end: {
              type: "RESOURCES",
              prompt: "Done",
              resourceSet: "default",
            },
            stretch: {
              type: "MEASURE",
              prompt: "Unused stretch step",
              metric: "attention",
              weight: 1,
            },
          },
        }),
      );

      const machine = compileFlowToMachine(config);

      expect(machine.states.stretch).toBeDefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /step "stretch" is never targeted by initial, next, or any BRANCH option/,
        ),
      );
    });
  });

  it("MEASURE steps advance via NEXT and append { metric, value } to measurements", () => {
    const config = validateFlowConfig(
      flow({
        type: "experiment",
        title: "Measure path",
        initial: "probe",
        steps: {
          probe: {
            type: "MEASURE",
            prompt: "Rate this",
            metric: "attention",
            weight: 2,
            next: "done",
          },
          done: {
            type: "STOP",
            prompt: "Done",
          },
        },
      }),
    );

    const machine = compileFlowToMachine(config);
    const service = interpret(machine).start();

    expect(service.state.value).toBe("probe");
    expect(service.state.context.measurements).toEqual([]);

    service.send({ type: "NEXT", value: 0.75 });
    expect(service.state.value).toBe("done");
    expect(service.state.context.measurements).toEqual([
      { metric: "attention", value: 0.75 },
    ]);
    expect(service.state.done).toBe(true);

    service.stop();
  });

  it("BRANCH option routes to its own MEASURE; NEXT without a value records that arm's weight", () => {
    const config = validateFlowConfig(
      flow({
        type: "experiment",
        title: "Framing pattern",
        initial: "headline",
        steps: {
          headline: {
            type: "BRANCH",
            prompt: "What first?",
            options: [
              {
                label: "Share it",
                value: "amplify",
                next: "measure_amplify",
              },
              {
                label: "Check the source",
                value: "verify",
                next: "measure_verify",
              },
            ],
          },
          measure_amplify: {
            type: "MEASURE",
            prompt: "Continue",
            metric: "framing",
            weight: 1,
            next: "done",
          },
          measure_verify: {
            type: "MEASURE",
            prompt: "Continue",
            metric: "framing",
            weight: 0,
            next: "done",
          },
          done: {
            type: "STOP",
            prompt: "Done",
          },
        },
      }),
    );

    const amplify = interpret(compileFlowToMachine(config)).start();
    amplify.send("amplify");
    expect(amplify.state.value).toBe("measure_amplify");
    expect(amplify.state.context.answers).toEqual({});
    amplify.send("NEXT");
    expect(amplify.state.value).toBe("done");
    expect(amplify.state.context.measurements).toEqual([
      { metric: "framing", value: 1 },
    ]);
    expect(amplify.state.context.answers).toEqual({});
    amplify.stop();

    const verify = interpret(compileFlowToMachine(config)).start();
    verify.send("verify");
    expect(verify.state.value).toBe("measure_verify");
    verify.send("NEXT");
    expect(verify.state.context.measurements).toEqual([
      { metric: "framing", value: 0 },
    ]);
    expect(verify.state.context.answers).toEqual({});
    verify.stop();
  });
});
