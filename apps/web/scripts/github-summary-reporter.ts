import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import type {
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

import {
  AXE_ANNOTATION_TYPE,
  aggregateSpecCounts,
  buildJobSummaryMarkdown,
  parseAxeRouteAnnotation,
  type AxeRouteResult,
} from "./github-step-summary";

type FinalTest = {
  spec: string;
  status: string;
};

export default class GithubSummaryReporter implements Reporter {
  private readonly axeByTest = new Map<string, AxeRouteResult>();
  private readonly tests = new Map<string, FinalTest>();

  onTestEnd(test: TestCase, result: TestResult): void {
    const spec = relative(process.cwd(), test.location.file).split("\\").join(
      "/",
    );
    this.tests.set(test.id, { spec, status: result.status });

    for (const annotation of test.annotations) {
      if (annotation.type !== AXE_ANNOTATION_TYPE) {
        continue;
      }
      const parsed = parseAxeRouteAnnotation(annotation.description);
      if (parsed !== null) {
        this.axeByTest.set(`${test.id}:${parsed.path}`, parsed);
      }
    }
  }

  async onEnd(): Promise<void> {
    const markdown = buildJobSummaryMarkdown({
      axeRoutes: [...this.axeByTest.values()].sort((a, b) =>
        a.path.localeCompare(b.path),
      ),
      specs: aggregateSpecCounts([...this.tests.values()]),
    });
    if (markdown.length === 0) {
      return;
    }

    const outDir = resolve(process.cwd(), "test-results");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "github-step-summary.md"), markdown, "utf8");

    const githubSummary = process.env.GITHUB_STEP_SUMMARY;
    if (githubSummary !== undefined && githubSummary.length > 0) {
      appendFileSync(githubSummary, markdown, "utf8");
    }
  }
}
