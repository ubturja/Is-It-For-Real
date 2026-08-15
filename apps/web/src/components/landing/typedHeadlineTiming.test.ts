import { describe, expect, it } from "vitest";

import { nextCharDelay } from "./typedHeadlineTiming";

describe("nextCharDelay", () => {
  it("is uneven (not a single linear interval) and delete is faster than type", () => {
    const lows = { type: nextCharDelay("type", () => 0), delete: nextCharDelay("delete", () => 0) };
    const highs = { type: nextCharDelay("type", () => 1), delete: nextCharDelay("delete", () => 1) };

    expect(highs.type).toBeGreaterThan(lows.type);
    expect(highs.delete).toBeGreaterThan(lows.delete);
    expect(highs.delete).toBeLessThan(lows.type);
  });
});
