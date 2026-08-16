import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("train dashboard page", () => {
  it("loads user-facing copy from dashboard chrome, not string literals", () => {
    const src = readFileSync(resolve(__dirname, "page.tsx"), "utf8");
    expect(src).toMatch(/getDashboardChrome/);
    expect(src).not.toMatch(/Pick a scenario/);
    expect(src).not.toMatch(/saved automatically/);
    expect(src).not.toMatch(/Your profile/);
    expect(src).not.toMatch(/>\s*Train\s*</);
    expect(src).not.toMatch(/experiment\.track/);
    expect(src).toMatch(/experiment\.title/);
  });
});
