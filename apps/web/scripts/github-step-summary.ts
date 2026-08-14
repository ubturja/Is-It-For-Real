export const AXE_ANNOTATION_TYPE = "axe-route";

export type AxeRouteResult = {
  path: string;
  critical: number;
  serious: number;
};

export type SpecCounts = {
  spec: string;
  passed: number;
  failed: number;
  skipped: number;
};

export function parseAxeRouteAnnotation(
  description: string | undefined,
): AxeRouteResult | null {
  if (description === undefined || description.length === 0) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(description) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  if (!("path" in parsed) || typeof parsed.path !== "string") {
    return null;
  }
  if (!("critical" in parsed) || typeof parsed.critical !== "number") {
    return null;
  }
  if (!("serious" in parsed) || typeof parsed.serious !== "number") {
    return null;
  }
  return {
    path: parsed.path,
    critical: parsed.critical,
    serious: parsed.serious,
  };
}

export function aggregateSpecCounts(
  tests: ReadonlyArray<{ spec: string; status: string }>,
): SpecCounts[] {
  const bySpec = new Map<string, SpecCounts>();
  for (const test of tests) {
    const current = bySpec.get(test.spec) ?? {
      spec: test.spec,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
    if (test.status === "passed") {
      current.passed += 1;
    } else if (test.status === "skipped") {
      current.skipped += 1;
    } else {
      current.failed += 1;
    }
    bySpec.set(test.spec, current);
  }
  return [...bySpec.values()].sort((a, b) => a.spec.localeCompare(b.spec));
}

export function buildAxeSummary(routes: readonly AxeRouteResult[]): string {
  if (routes.length === 0) {
    return "";
  }
  const blocking = routes.reduce(
    (sum, route) => sum + route.critical + route.serious,
    0,
  );
  const lines = [
    "## Axe",
    "",
    blocking === 0
      ? `0 critical/serious across ${routes.length} routes`
      : `${blocking} critical/serious across ${routes.length} routes`,
    "",
  ];
  for (const route of routes) {
    lines.push(
      `- \`${route.path}\`: ${route.critical} critical, ${route.serious} serious`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function buildSpecSummary(specs: readonly SpecCounts[]): string {
  if (specs.length === 0) {
    return "";
  }
  const lines = ["## Playwright specs", ""];
  for (const spec of specs) {
    const skipped =
      spec.skipped > 0 ? `, ${spec.skipped} skipped` : "";
    lines.push(
      `- \`${spec.spec}\`: ${spec.passed} passed, ${spec.failed} failed${skipped}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function buildJobSummaryMarkdown(input: {
  axeRoutes: readonly AxeRouteResult[];
  specs: readonly SpecCounts[];
}): string {
  return `${buildAxeSummary(input.axeRoutes)}${buildSpecSummary(input.specs)}`;
}
