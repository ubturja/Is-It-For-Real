import { describe, expect, it } from "vitest";

import { REGENERATE_COOLDOWN_MS, canRegenerate } from "./regenerateGate";

describe("canRegenerate", () => {
  it("allows the first request", () => {
    expect(canRegenerate(null, 1_000)).toBe(true);
  });

  it("blocks another request inside the cooldown window", () => {
    expect(canRegenerate(1_000, 1_000 + REGENERATE_COOLDOWN_MS - 1)).toBe(false);
  });

  it("allows a request once the cooldown has elapsed", () => {
    expect(canRegenerate(1_000, 1_000 + REGENERATE_COOLDOWN_MS)).toBe(true);
  });
});
