import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("MeasureStep silent auto-advance", () => {
  it("uses chrome Continue, not a hardcoded prompt, and still calls onAdvance", () => {
    const src = readFileSync(resolve(__dirname, "MeasureStep.tsx"), "utf8");
    expect(src).toMatch(/isSilentMeasurePrompt/);
    expect(src).toMatch(/chrome\.actions\.continue/);
    expect(src).toMatch(/autoAdvanceSilentMeasure/);
    expect(src).toMatch(/onAdvance\(\)/);
    expect(src).not.toMatch(/Continue\./);
  });
});
