import { describe, expect, it } from "vitest";

import { isSilentMeasurePrompt } from "./measurePassthrough";

describe("isSilentMeasurePrompt", () => {
  it("treats empty and Continue chrome (with optional punctuation) as silent", () => {
    expect(isSilentMeasurePrompt("", "Continue")).toBe(true);
    expect(isSilentMeasurePrompt("Continue.", "Continue")).toBe(true);
    expect(isSilentMeasurePrompt("Continue", "Continue")).toBe(true);
    expect(isSilentMeasurePrompt("  continue!  ", "Continue")).toBe(true);
  });

  it("keeps a real MEASURE prompt visible", () => {
    expect(
      isSilentMeasurePrompt("A short feed — open what you would tap.", "Continue"),
    ).toBe(false);
  });
});
