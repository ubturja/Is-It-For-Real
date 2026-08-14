import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { measureChoiceValue, reactionTimeMs } from "./useExperimentSession";

describe("measureChoiceValue", () => {
  const measureStep = {
    type: "MEASURE" as const,
    prompt: "probe",
    metric: "stub_signal",
    weight: 1,
  };

  it("stringifies an explicit numeric MEASURE value", () => {
    expect(measureChoiceValue(0.75, measureStep)).toBe("0.75");
  });

  it("uses step.weight when NEXT has no value", () => {
    expect(measureChoiceValue(undefined, measureStep)).toBe("1");
  });

  it("falls back to 0 when weight is omitted", () => {
    expect(
      measureChoiceValue(undefined, {
        type: "MEASURE",
        prompt: "probe",
        metric: "stub_signal",
      }),
    ).toBe("0");
  });

  it("passes through a string choice", () => {
    expect(measureChoiceValue("amplify", measureStep)).toBe("amplify");
  });
});

describe("reactionTimeMs", () => {
  it("returns elapsed ms from step enter to now", () => {
    expect(reactionTimeMs(1_000, 1_250)).toBe(250);
  });

  it("returns 0 when the MEASURE step has no start timestamp", () => {
    expect(reactionTimeMs(null, 1_000)).toBe(0);
  });
});

describe("training-only wiring", () => {
  it("is used by ExperimentRunner and never by Crisis Mode /help", () => {
    const help = readFileSync(
      resolve(__dirname, "../components/help/HelpFlow.tsx"),
      "utf8",
    );
    const runner = readFileSync(
      resolve(__dirname, "../components/ExperimentRunner.tsx"),
      "utf8",
    );

    expect(help).toMatch(/from ["']@\/hooks\/useFlowMachine["']/);
    expect(help).not.toMatch(/useExperimentSession/);
    expect(runner).toMatch(/from ["']@\/hooks\/useExperimentSession["']/);
    expect(runner).not.toMatch(/from ["']@\/hooks\/useFlowMachine["']/);
  });

  it("eager-scores via POST /api/sessions/[id]/score without a client status UPDATE", () => {
    const src = readFileSync(resolve(__dirname, "./useExperimentSession.ts"), "utf8");
    expect(src).toMatch(/\/api\/sessions\/\$\{sessionId\}\/score/);
    expect(src).not.toMatch(/status:\s*"completed"/);
    expect(src).not.toMatch(/from ["']@\/lib\/supabase\/admin["']/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).not.toMatch(/\/reflect/);
  });

  it("queues failed writes for remount retry instead of console.error-and-continue", () => {
    const src = readFileSync(resolve(__dirname, "./useExperimentSession.ts"), "utf8");
    expect(src).toMatch(/persistUnsaved/);
    expect(src).toMatch(/enqueueInteraction/);
    expect(src).toMatch(/flushQueuedInteractions/);
    expect(src).not.toMatch(/console\.error/);
  });
});
