import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = resolve(__dirname);

function readApp(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

describe("crisis vs training chrome", () => {
  it("root layout has no Train/Profile nav (route groups own chrome)", () => {
    const src = readApp("layout.tsx");
    expect(src).not.toMatch(/SiteHeader/);
    expect(src).not.toMatch(/href="\/train"/);
    expect(src).not.toMatch(/href="\/help"/);
  });

  it("help route group has no Train/Profile links or site header", () => {
    const combined =
      readApp("(help)/layout.tsx") +
      readApp("(help)/help/page.tsx") +
      readFileSync(
        resolve(appRoot, "../components/help/HelpFlow.tsx"),
        "utf8",
      );
    expect(combined).not.toMatch(/SiteHeader/);
    expect(combined).not.toMatch(/href="\/train"/);
    expect(combined).not.toMatch(/href="\/train\/profile"/);
  });

  it("site layout mounts the training primary nav", () => {
    const src = readApp("(site)/layout.tsx");
    const header = readFileSync(
      resolve(appRoot, "../components/SiteHeader.tsx"),
      "utf8",
    );
    expect(src).toMatch(/SiteHeader/);
    expect(header).toMatch(/href="\/train"/);
    expect(header).toMatch(/href="\/train\/profile"/);
    expect(header).toMatch(/href="\/help"/);
    expect(header).toMatch(/getAuthChrome/);
    expect(header).toMatch(/signOut/);
  });

  it("middleware still only matches /train — chrome is not an auth concern", () => {
    const src = readFileSync(
      resolve(appRoot, "../middleware.ts"),
      "utf8",
    );
    expect(src).toMatch(/matcher:\s*\[\s*"\/train",\s*"\/train\/:path\*"\s*\]/);
  });
});
