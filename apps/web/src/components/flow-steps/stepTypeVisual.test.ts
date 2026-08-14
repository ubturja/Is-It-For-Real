import { StepTypeEnum } from "@isitfr/schemas";
import { describe, expect, it } from "vitest";

import { STEP_TYPE_VISUAL, stepTypeLabel } from "./stepTypeVisual";

describe("STEP_TYPE_VISUAL", () => {
  it("pairs every step type with an icon and color classes", () => {
    for (const type of StepTypeEnum.options) {
      const visual = STEP_TYPE_VISUAL[type];
      expect(visual.icon).toBeTruthy();
      expect(visual.textClass).toMatch(/^text-step-/);
      expect(visual.borderClass).toMatch(/^border-step-/);
    }
  });
});

describe("stepTypeLabel", () => {
  it("reads labels from step chrome, not hardcoded copy", () => {
    expect(stepTypeLabel("STOP")).toBe("Stop");
    expect(stepTypeLabel("PRESERVE")).toBe("Preserve evidence");
    expect(stepTypeLabel("BRANCH")).toBe("Choose a path");
    expect(stepTypeLabel("TEMPLATE")).toBe("Message template");
    expect(stepTypeLabel("RESOURCES")).toBe("Resources");
    expect(stepTypeLabel("MEASURE")).toBe("Measure");
  });
});
