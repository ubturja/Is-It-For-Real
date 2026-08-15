import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchReflection, reflectionUrl } from "./fetchReflection";

const report = {
  summary: "You compared more than one frame.",
  strengths: ["You slowed down before sharing."],
  growthAreas: ["Notice when a headline pulls for a fast reaction."],
  tone: "supportive" as const,
};

describe("fetchReflection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the P7.1 endpoint and returns a schema-valid report", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => report,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchReflection("session-1")).resolves.toEqual(report);
    expect(fetchMock).toHaveBeenCalledWith(reflectionUrl("session-1"), {
      method: "POST",
    });
  });

  it("rejects a non-OK response without exposing raw error copy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "reflection_failed", message: "model exploded" },
        }),
      }),
    );

    await expect(fetchReflection("session-1")).rejects.toThrow(
      "reflection_unavailable",
    );
  });

  it("treats a Groq 429 as unavailable so the report can show try-again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: { code: "reflection_failed", message: "groq_rate_limited" },
        }),
      }),
    );

    await expect(fetchReflection("session-1")).rejects.toThrow(
      "reflection_unavailable",
    );
  });
});
