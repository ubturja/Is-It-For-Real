import { describe, expect, it } from "vitest";

import {
  aggregateSpecCounts,
  buildAxeSummary,
  buildJobSummaryMarkdown,
  parseAxeRouteAnnotation,
} from "./github-step-summary";

describe("github step summary", () => {
  it("parses axe-route annotations", () => {
    expect(
      parseAxeRouteAnnotation(
        JSON.stringify({ path: "/help", critical: 0, serious: 1 }),
      ),
    ).toEqual({ path: "/help", critical: 0, serious: 1 });
    expect(parseAxeRouteAnnotation("not-json")).toBeNull();
  });

  it("reports 0 critical/serious across N routes", () => {
    const markdown = buildAxeSummary([
      { path: "/help", critical: 0, serious: 0 },
      { path: "/train", critical: 0, serious: 0 },
    ]);
    expect(markdown).toContain("0 critical/serious across 2 routes");
    expect(markdown).toContain("`/help`: 0 critical, 0 serious");
  });

  it("aggregates pass/fail per spec file", () => {
    const specs = aggregateSpecCounts([
      { spec: "e2e/auth.spec.ts", status: "passed" },
      { spec: "e2e/auth.spec.ts", status: "passed" },
      { spec: "e2e/echo-chamber.spec.ts", status: "failed" },
    ]);
    const markdown = buildJobSummaryMarkdown({ axeRoutes: [], specs });
    expect(markdown).toContain("`e2e/auth.spec.ts`: 2 passed, 0 failed");
    expect(markdown).toContain(
      "`e2e/echo-chamber.spec.ts`: 0 passed, 1 failed",
    );
  });
});
