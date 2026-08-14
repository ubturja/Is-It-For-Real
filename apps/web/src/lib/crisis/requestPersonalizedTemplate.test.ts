import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PERSONALIZE_TEMPLATE_PATH,
  requestPersonalizedTemplate,
} from "./requestPersonalizedTemplate";

describe("requestPersonalizedTemplate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs only templateKey — never a typed name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Message to a trusted adult",
        body: "Hi {{name}}, can we talk?",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestPersonalizedTemplate("crisis-deepfake-classmate-trusted-adult"),
    ).resolves.toEqual({
      title: "Message to a trusted adult",
      body: "Hi {{name}}, can we talk?",
    });

    expect(fetchMock).toHaveBeenCalledWith(PERSONALIZE_TEMPLATE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateKey: "crisis-deepfake-classmate-trusted-adult",
      }),
      signal: undefined,
    });
    const init = fetchMock.mock.calls[0]?.[1] as { body: string };
    expect(init.body).not.toMatch(/Alex/);
    expect(init.body).not.toMatch(/"name"/);
  });
});
