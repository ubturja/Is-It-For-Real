import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("SiteHeader", () => {
  it("loads log-out copy from auth chrome and only signs out on the training path", () => {
    const src = readFileSync(resolve(__dirname, "SiteHeader.tsx"), "utf8");
    expect(src).toMatch(/getAuthChrome/);
    expect(src).toMatch(/\.signOut/);
    expect(src).toMatch(/from "@\/lib\/auth\/signOut"/);
    expect(src).not.toMatch(/"Log out"/);
    expect(src).not.toMatch(/'Log out'/);
  });
});
