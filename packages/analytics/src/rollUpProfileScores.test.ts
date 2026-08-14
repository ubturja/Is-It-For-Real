import { describe, expect, it } from "vitest";

import { rollUpProfileScores } from "./rollUpProfileScores";

describe("rollUpProfileScores", () => {
  it("averages each profile dimension across sessions by default", () => {
    expect(
      rollUpProfileScores([
        { metric: "framing_bias", value: 0 },
        { metric: "framing_bias", value: 2 },
        { metric: "perspective_diversity", value: 0.25 },
        { metric: "perspective_diversity", value: 0.75 },
      ]),
    ).toEqual({
      framing_bias: 1,
      perspective_diversity: 0.5,
    });
  });

  it("honors a per-metric acrossSessions override (sum / last)", () => {
    expect(
      rollUpProfileScores(
        [
          { metric: "memory_reliability", value: 0.5 },
          { metric: "memory_reliability", value: 1 },
          { metric: "deepfake_resilience", value: 0 },
          { metric: "deepfake_resilience", value: 1 },
        ],
        {
          memory_reliability: "sum",
          deepfake_resilience: "last",
        },
      ),
    ).toEqual({
      memory_reliability: 1.5,
      deepfake_resilience: 1,
    });
  });

  it("includes every metric present in the entries, including ones not in the original four experiments", () => {
    expect(
      rollUpProfileScores([
        { metric: "framing_bias", value: 2 },
        { metric: "future_metric", value: 0.8 },
      ]),
    ).toEqual({ framing_bias: 2, future_metric: 0.8 });
  });
});
