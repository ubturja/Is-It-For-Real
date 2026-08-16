import { afterEach, describe, expect, it, vi } from "vitest";

import { authCallbackUrl, authRedirectOrigin } from "./paths";

describe("authRedirectOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rewrites localhost to NEXT_PUBLIC_SITE_URL so reset emails do not target the dev server", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://isitfr.vercel.app");
    expect(authRedirectOrigin("http://localhost:3000")).toBe(
      "https://isitfr.vercel.app",
    );
    expect(authRedirectOrigin("http://127.0.0.1:3456")).toBe(
      "https://isitfr.vercel.app",
    );
  });

  it("keeps a non-local origin (production or preview)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://isitfr.vercel.app");
    expect(authRedirectOrigin("https://isitfr.vercel.app")).toBe(
      "https://isitfr.vercel.app",
    );
    expect(
      authRedirectOrigin("https://isitfr-git-preview.vercel.app"),
    ).toBe("https://isitfr-git-preview.vercel.app");
  });

  it("stays on localhost when no canonical site URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(authRedirectOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });
});

describe("authCallbackUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("points recovery at the canonical origin callback", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://isitfr.vercel.app");
    expect(authCallbackUrl("http://localhost:3000", "/login/reset")).toBe(
      "https://isitfr.vercel.app/auth/callback?next=%2Flogin%2Freset",
    );
  });
});
