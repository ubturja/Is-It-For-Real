import { afterEach, describe, expect, it, vi } from "vitest";

import {
  authCallbackUrl,
  authEmailCallbackUrl,
  authEmailRedirectOrigin,
  authRedirectOrigin,
  CANONICAL_SITE_ORIGIN,
} from "./paths";

describe("authEmailRedirectOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://isitfr.vercel.app");
    expect(authEmailRedirectOrigin()).toBe("https://isitfr.vercel.app");
  });

  it("falls back to the canonical production origin so Vercel emails never target localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(authEmailRedirectOrigin()).toBe(CANONICAL_SITE_ORIGIN);
  });
});

describe("authRedirectOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the page origin for in-browser OAuth", () => {
    expect(authRedirectOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(
      authRedirectOrigin("https://isitfr-git-preview.vercel.app"),
    ).toBe("https://isitfr-git-preview.vercel.app");
  });
});

describe("authEmailCallbackUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("points recovery at the canonical origin callback, ignoring the current page", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(authEmailCallbackUrl("/login/reset")).toBe(
      `${CANONICAL_SITE_ORIGIN}/auth/callback?next=%2Flogin%2Freset`,
    );
  });
});

describe("authCallbackUrl", () => {
  it("keeps OAuth on the page origin", () => {
    expect(authCallbackUrl("http://localhost:3000", "/train")).toBe(
      "http://localhost:3000/auth/callback?next=%2Ftrain",
    );
  });
});
