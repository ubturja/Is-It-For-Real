import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AXE_ANNOTATION_TYPE } from "../../scripts/github-step-summary";

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `  ${node.target.join(" ")} — ${node.failureSummary}`)
        .join("\n");
      return `${violation.id} [${violation.impact}] ${violation.help}\n${nodes}`;
    })
    .join("\n\n");
}

/** Fail on critical/serious only — moderate/minor are logged by axe, not blockers. */
export async function expectNoSeriousAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
  let path = page.url();
  try {
    path = new URL(page.url()).pathname;
  } catch {
    // keep the raw URL if it is not parseable
  }
  test.info().annotations.push({
    type: AXE_ANNOTATION_TYPE,
    description: JSON.stringify({
      path,
      critical: blocking.filter((violation) => violation.impact === "critical")
        .length,
      serious: blocking.filter((violation) => violation.impact === "serious")
        .length,
    }),
  });
  expect(blocking, formatViolations(blocking)).toEqual([]);
}
