import { describe, expect, it } from "vitest";

import { isProviderRateLimitError } from "./groqLimits";

describe("isProviderRateLimitError", () => {
  it("recognizes a Groq/AI-SDK 429 payload", () => {
    expect(isProviderRateLimitError({ statusCode: 429 })).toBe(true);
    expect(isProviderRateLimitError({ status: 429 })).toBe(true);
    expect(
      isProviderRateLimitError(new Error("429 Rate limit reached for model")),
    ).toBe(true);
  });

  it("ignores other failures", () => {
    expect(isProviderRateLimitError({ statusCode: 500 })).toBe(false);
    expect(isProviderRateLimitError(new Error("timeout"))).toBe(false);
    expect(isProviderRateLimitError("nope")).toBe(false);
  });
});
