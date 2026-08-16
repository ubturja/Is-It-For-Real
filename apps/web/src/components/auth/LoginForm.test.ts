import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("LoginForm copy", () => {
  it("loads the account/auto-save note from dashboard chrome", () => {
    const src = readFileSync(resolve(__dirname, "LoginForm.tsx"), "utf8");
    expect(src).toMatch(/getDashboardChrome/);
    expect(src).toMatch(/\.account/);
    expect(src).not.toMatch(/Train requires an account/);
    expect(src).not.toMatch(/no data leaves the device/i);
  });

  it("sends a recovery email via resetPasswordForEmail and does not hardcode forgot copy", () => {
    const src = readFileSync(resolve(__dirname, "LoginForm.tsx"), "utf8");
    expect(src).toMatch(/getAuthChrome/);
    expect(src).toMatch(/resetPasswordForEmail/);
    expect(src).toMatch(/RESET_PASSWORD_PATH/);
    expect(src).not.toMatch(/Forgot password\?/);
  });
});
