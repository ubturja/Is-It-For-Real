import { describe, expect, it } from "vitest";

import {
  validateScoringRule,
  validateScoringRules,
  type ScoringRule,
} from "./scoring";

const validRule: ScoringRule = {
  metric: "framing_bias",
  aggregation: "last",
  normalizeToRange: [0, 1],
  description: "Scale the path-selected observation onto 0–1.",
};

describe("validateScoringRule", () => {
  it("accepts a complete rule", () => {
    expect(validateScoringRule(validRule)).toEqual(validRule);
  });

  it("rejects an unknown aggregation", () => {
    expect(() =>
      validateScoringRule({ ...validRule, aggregation: "max" }),
    ).toThrow(/aggregation/i);
  });

  it("rejects a missing metric", () => {
    const { metric: _metric, ...withoutMetric } = validRule;
    expect(() => validateScoringRule(withoutMetric)).toThrow(/metric/i);
  });

  it("rejects an empty metric", () => {
    expect(() => validateScoringRule({ ...validRule, metric: "" })).toThrow(
      /metric/i,
    );
  });

  it("rejects normalizeToRange that is not a pair of numbers", () => {
    expect(() =>
      validateScoringRule({ ...validRule, normalizeToRange: [0] }),
    ).toThrow(/normalizeToRange/i);
    expect(() =>
      validateScoringRule({ ...validRule, normalizeToRange: [0, 1, 2] }),
    ).toThrow(/normalizeToRange/i);
  });

  it("accepts optional acrossSessions for profile rollup", () => {
    expect(
      validateScoringRule({ ...validRule, acrossSessions: "last" }),
    ).toEqual({ ...validRule, acrossSessions: "last" });
  });

  it("rejects a zero-width or inverted normalizeToRange", () => {
    expect(() =>
      validateScoringRule({ ...validRule, normalizeToRange: [1, 1] }),
    ).toThrow(/low < high/);
    expect(() =>
      validateScoringRule({ ...validRule, normalizeToRange: [1, 0] }),
    ).toThrow(/low < high/);
  });
});

describe("validateScoringRules", () => {
  it("accepts a non-empty array of rules", () => {
    expect(validateScoringRules([validRule])).toEqual([validRule]);
  });

  it("rejects an empty array", () => {
    expect(() => validateScoringRules([])).toThrow(/Invalid ScoringRules/);
  });

  it("rejects a bare object (file shape is an array)", () => {
    expect(() => validateScoringRules(validRule)).toThrow(/Invalid ScoringRules/);
  });
});
