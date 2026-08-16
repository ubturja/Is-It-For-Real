import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("HelpFlow Finish", () => {
  const src = readFileSync(resolve(__dirname, "HelpFlow.tsx"), "utf8");

  it("does not send NEXT on RESOURCES — Finish clears the session and leaves to /", () => {
    expect(src).toMatch(/step\?\.type === ["']RESOURCES["']/);
    expect(src).toMatch(/onFinish\(\)/);
    expect(src).toMatch(/startOver\(\)/);
    expect(src).toMatch(/router\.push\(["']\/["']\)/);
  });
});
