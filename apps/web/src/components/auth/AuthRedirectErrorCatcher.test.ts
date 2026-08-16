import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("AuthRedirectErrorCatcher", () => {
  it("sends expired recovery hash/query errors to /login?error=otp_expired", () => {
    const src = readFileSync(
      resolve(__dirname, "AuthRedirectErrorCatcher.tsx"),
      "utf8",
    );
    expect(src).toMatch(/otp_expired/);
    expect(src).toMatch(/\/login\?error=otp_expired/);
  });
});
