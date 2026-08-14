import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PERSONALIZE_TEMPLATE_PATH,
  requestPersonalizedTemplate,
} from "./requestPersonalizedTemplate";

describe("requestPersonalizedTemplate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs templateKey plus optional name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Message to a trusted adult",
        body: "Hi Alex, can we talk?",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestPersonalizedTemplate(
        "crisis-deepfake-classmate-trusted-adult",
        { name: "Alex" },
      ),
    ).resolves.toEqual({
      title: "Message to a trusted adult",
      body: "Hi Alex, can we talk?",
    });

    expect(fetchMock).toHaveBeenCalledWith(PERSONALIZE_TEMPLATE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateKey: "crisis-deepfake-classmate-trusted-adult",
        context: { name: "Alex" },
      }),
      signal: undefined,
    });
  });
});
