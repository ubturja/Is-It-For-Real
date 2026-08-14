import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("ReflectionReport", () => {
  const src = readFileSync(resolve(__dirname, "ReflectionReport.tsx"), "utf8");
  const runner = readFileSync(
    resolve(__dirname, "ExperimentRunner.tsx"),
    "utf8",
  );

  it("loads chrome and P7.1 output fields, never warning colors", () => {
    expect(src).toMatch(/getReportChrome/);
    expect(src).toMatch(/report\.summary/);
    expect(src).toMatch(/report\.strengths/);
    expect(src).toMatch(/report\.growthAreas/);
    expect(src).toMatch(/fetchReflection/);
    expect(src).toMatch(/canRegenerate/);
    expect(src).not.toMatch(/destructive/);
    expect(src).not.toMatch(/text-red/);
    expect(src).not.toMatch(/bg-red/);
    expect(src).not.toMatch(/warning/i);
    expect(src).not.toMatch(/text-destructive/);
  });

  it("does not hardcode report copy in the component", () => {
    expect(src).not.toMatch(/A short reflection/);
    expect(src).not.toMatch(/What went well/);
    expect(src).not.toMatch(/Worth trying next time/);
  });

  it("is shown from ExperimentRunner after a scored run, outside ChatBubbleTheme", () => {
    expect(runner).toMatch(/hasScoringRules/);
    expect(runner).toMatch(/ReflectionReport/);
    expect(runner).toMatch(/showReport/);
  });

  it("surfaces persistUnsaved from chrome, never as hardcoded copy", () => {
    expect(runner).toMatch(/persistUnsaved/);
    expect(runner).toMatch(/getStepChrome/);
    expect(runner).toMatch(/chrome\.persist\.unsaved/);
    expect(runner).not.toMatch(/may not have saved/i);
  });
});
