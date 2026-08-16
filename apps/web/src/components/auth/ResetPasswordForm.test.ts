import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("ResetPasswordForm", () => {
  it("updates the password only after a recovery session and loads copy from auth chrome", () => {
    const src = readFileSync(resolve(__dirname, "ResetPasswordForm.tsx"), "utf8");
    expect(src).toMatch(/getAuthChrome/);
    expect(src).toMatch(/getUser\(\)/);
    expect(src).toMatch(/updateUser\(\{\s*password/);
    expect(src).not.toMatch(/Choose a new password/);
  });
});
