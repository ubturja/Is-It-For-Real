import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("login page auth errors", () => {
  it("maps otp_expired to the reset missing-session chrome, not a hardcoded string", () => {
    const src = readFileSync(resolve(__dirname, "page.tsx"), "utf8");
    expect(src).toMatch(/getAuthChrome/);
    expect(src).toMatch(/otp_expired/);
    expect(src).toMatch(/reset\.missingSession/);
  });
});
