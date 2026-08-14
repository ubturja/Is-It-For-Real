import { describe, expect, it } from "vitest";

import { metricsForReflection } from "./metrics";
import { getScoringRules } from "@isitfr/content-config";

describe("metricsForReflection", () => {
  it("joins flow_scores to scoring-rule descriptions only", () => {
    const rules = getScoringRules("framing-headlines");
    const framing = rules.find((rule) => rule.metric === "framing_bias");
    expect(framing).toBeDefined();

    expect(
      metricsForReflection("framing-headlines", [
        { metric_name: "framing_bias", metric_value: 0.5 },
      ]),
    ).toEqual([
      {
        metric: "framing_bias",
        value: 0.5,
        description: framing?.description,
      },
    ]);
  });

  it("throws when a score has no rule description", () => {
    expect(() =>
      metricsForReflection("framing-headlines", [
        { metric_name: "not_a_real_metric", metric_value: 1 },
      ]),
    ).toThrow(/No scoring-rule description/);
  });
});
