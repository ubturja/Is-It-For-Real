import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("train layout completion recovery", () => {
  it("finalizes abandoned sessions on /train without a client POST", () => {
    const layout = readFileSync(
      resolve(__dirname, "../../app/(site)/(train)/layout.tsx"),
      "utf8",
    );
    const help = readFileSync(
      resolve(__dirname, "../../app/(help)/help/page.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/finalizeAbandonedSessions/);
    expect(help).not.toMatch(/finalizeAbandonedSessions/);
    expect(help).not.toMatch(/completeAndScoreSession/);
  });
});
