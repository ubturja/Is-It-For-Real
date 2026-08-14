import { describe, expect, it } from "vitest";

import { getFlow, getScoringRules } from "@isitfr/content-config";

import {
  isDeclaredMeasureChoice,
  measureChoiceDomain,
} from "./declaredMeasureValues";

describe("measureChoiceDomain", () => {
  it("allowlists diamond MEASURE weights for that metric", () => {
    const flow = getFlow("framing-headlines");
    const domain = measureChoiceDomain(flow, "measure_neutral", []);
    expect(domain).toEqual({
      kind: "discrete",
      values: new Set([0, 0.5, 1]),
    });
    expect(isDeclaredMeasureChoice(domain, 0)).toBe(true);
    expect(isDeclaredMeasureChoice(domain, 0.5)).toBe(true);
    expect(isDeclaredMeasureChoice(domain, 1)).toBe(true);
    expect(isDeclaredMeasureChoice(domain, 999)).toBe(false);
  });

  it("bounds unweighted MEASURE to the scoring rule range", () => {
    const flow = getFlow("echo-chamber");
    const rules = getScoringRules("echo-chamber");
    const domain = measureChoiceDomain(flow, "perspective_diversity", rules);
    expect(domain).toEqual({ kind: "range", low: 0, high: 1 });
    expect(isDeclaredMeasureChoice(domain, 0.25)).toBe(true);
    expect(isDeclaredMeasureChoice(domain, 2)).toBe(false);
  });
});
