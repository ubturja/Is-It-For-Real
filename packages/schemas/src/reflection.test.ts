import { describe, expect, it } from "vitest";

import {
  validateReflectionPromptPayload,
  validateReflectionReport,
} from "./reflection";

const validMetric = {
  metric: "framing_bias",
  value: 0.5,
  description: "Scale the path-selected observation onto 0–1.",
};

describe("validateReflectionPromptPayload", () => {
  it("accepts scores plus descriptions only", () => {
    expect(
      validateReflectionPromptPayload({ metrics: [validMetric] }),
    ).toEqual({ metrics: [validMetric] });
  });

  it("rejects extra keys on a metric (e.g. raw interaction fields)", () => {
    expect(() =>
      validateReflectionPromptPayload({
        metrics: [{ ...validMetric, choice_value: "emotional_share" }],
      }),
    ).toThrow(/Unrecognized key/i);
  });

  it("rejects extra top-level keys", () => {
    expect(() =>
      validateReflectionPromptPayload({
        metrics: [validMetric],
        step_id: "compare",
      }),
    ).toThrow(/Unrecognized key/i);
  });
});

describe("validateReflectionReport", () => {
  it("accepts a supportive report", () => {
    const report = {
      summary: "You noticed framing differences.",
      strengths: ["Checked more than one headline."],
      growthAreas: ["Pause before amplifying a charged frame."],
      tone: "supportive" as const,
    };
    expect(validateReflectionReport(report)).toEqual(report);
  });

  it("rejects a non-supportive tone", () => {
    expect(() =>
      validateReflectionReport({
        summary: "x",
        strengths: [],
        growthAreas: [],
        tone: "harsh",
      }),
    ).toThrow(/tone/i);
  });

  it("rejects a step sequence even when the rest of the report is valid", () => {
    expect(() =>
      validateReflectionReport({
        summary: "x",
        strengths: [],
        growthAreas: [],
        tone: "supportive",
        steps: ["STOP", "PRESERVE", "BRANCH"],
        next: "resources",
      }),
    ).toThrow(/Unrecognized key/i);
  });
});
