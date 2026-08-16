import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("signOut", () => {
  it("clears the cookie session on the server and returns to /login", () => {
    const src = readFileSync(resolve(__dirname, "signOut.ts"), "utf8");
    expect(src).toMatch(/"use server"/);
    expect(src).toMatch(/auth\.signOut\(\)/);
    expect(src).toMatch(/redirect\("\/login"\)/);
  });
});
