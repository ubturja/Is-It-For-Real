import { describe, expect, it } from "vitest";
import type { FlowConfig } from "@isitfr/schemas";

import { hasCompletedMeasurePath } from "./completedPath";

function experiment(steps: FlowConfig["steps"], initial: string): FlowConfig {
  return {
    flowId: "path-fixture",
    version: 1,
    type: "experiment",
    title: "Path fixture",
    track: "Foundation",
    teaser: "Fixture",
    initial,
    steps,
  };
}

describe("hasCompletedMeasurePath", () => {
  const diamond = experiment(
    {
      headline: {
        type: "BRANCH",
        prompt: "pick",
        options: [
          { label: "A", value: "a", next: "measure_a" },
          { label: "B", value: "b", next: "measure_b" },
        ],
      },
      measure_a: {
        type: "MEASURE",
        prompt: "a",
        metric: "signal",
        weight: 1,
        next: "done",
      },
      measure_b: {
        type: "MEASURE",
        prompt: "b",
        metric: "signal",
        weight: 0,
        next: "done",
      },
      done: { type: "STOP", prompt: "end" },
    },
    "headline",
  );

  it("is true when any BRANCH arm's MEASURE was recorded", () => {
    expect(hasCompletedMeasurePath(diamond, ["measure_a"])).toBe(true);
    expect(hasCompletedMeasurePath(diamond, ["measure_b"])).toBe(true);
  });

  it("is false with no MEASURE rows (partial / skipped run)", () => {
    expect(hasCompletedMeasurePath(diamond, [])).toBe(false);
  });

  it("requires every MEASURE on a two-diamond path", () => {
    const two = experiment(
      {
        first: {
          type: "BRANCH",
          prompt: "one",
          options: [
            { label: "yes", value: "yes", next: "m1_yes" },
            { label: "no", value: "no", next: "m1_no" },
          ],
        },
        m1_yes: {
          type: "MEASURE",
          prompt: "m1",
          metric: "rel",
          weight: 1,
          next: "second",
        },
        m1_no: {
          type: "MEASURE",
          prompt: "m1",
          metric: "rel",
          weight: 0,
          next: "second",
        },
        second: {
          type: "BRANCH",
          prompt: "two",
          options: [
            { label: "yes", value: "yes", next: "m2_yes" },
            { label: "no", value: "no", next: "m2_no" },
          ],
        },
        m2_yes: {
          type: "MEASURE",
          prompt: "m2",
          metric: "rel",
          weight: 1,
          next: "done",
        },
        m2_no: {
          type: "MEASURE",
          prompt: "m2",
          metric: "rel",
          weight: 0,
          next: "done",
        },
        done: { type: "STOP", prompt: "end" },
      },
      "first",
    );

    expect(hasCompletedMeasurePath(two, ["m1_yes"])).toBe(false);
    expect(hasCompletedMeasurePath(two, ["m1_yes", "m2_no"])).toBe(true);
  });

  it("treats a linear MEASURE → final as complete only after that step", () => {
    const linear = experiment(
      {
        probe: {
          type: "MEASURE",
          prompt: "probe",
          metric: "stub_signal",
          weight: 1,
          next: "done",
        },
        done: { type: "STOP", prompt: "end" },
      },
      "probe",
    );
    expect(hasCompletedMeasurePath(linear, [])).toBe(false);
    expect(hasCompletedMeasurePath(linear, ["probe"])).toBe(true);
  });
});
