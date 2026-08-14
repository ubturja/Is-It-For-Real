import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { validateScoringRules } from "@isitfr/schemas";

import { getFlow, getScoringRules, profileAggregationFor } from "./index";

const SRC_DIR = dirname(fileURLToPath(import.meta.url));
const RULES_DIR = join(SRC_DIR, "scoring-rules");
const RULE_FILENAME_RE = /^(.+)\.v.+\.json$/;

const EXPECTED_EXPERIMENT_IDS = [
  "framing-headlines",
  "echo-chamber",
  "memory-recall",
  "read-the-room",
] as const;

function measureMetrics(flowId: string): Set<string> {
  const flow = getFlow(flowId);
  const metrics = new Set<string>();
  for (const step of Object.values(flow.steps)) {
    if (step.type === "MEASURE" && step.metric !== undefined) {
      metrics.add(step.metric);
    }
  }
  return metrics;
}

function ruleFilesOnDisk(): Array<{ file: string; flowId: string }> {
  return readdirSync(RULES_DIR)
    .filter((name) => RULE_FILENAME_RE.test(name))
    .map((file) => {
      const match = RULE_FILENAME_RE.exec(file);
      if (match === null || match[1] === undefined) {
        throw new Error(`Unexpected scoring-rules filename: ${file}`);
      }
      return { file, flowId: match[1] };
    });
}

describe("scoring-rules JSON", () => {
  it("has one validated file per experiment, and every metric exists on that flow's MEASURE steps", () => {
    const onDisk = ruleFilesOnDisk();
    expect(onDisk.map((entry) => entry.flowId).sort()).toEqual(
      [...EXPECTED_EXPERIMENT_IDS].sort(),
    );

    for (const entry of onDisk) {
      const parsed: unknown = JSON.parse(
        readFileSync(join(RULES_DIR, entry.file), "utf8"),
      );
      const fromFile = validateScoringRules(parsed);
      const rules = getScoringRules(entry.flowId);
      expect(rules).toEqual(fromFile);
      const emitted = measureMetrics(entry.flowId);

      expect(emitted.size).toBeGreaterThan(0);

      const referenced = new Set(rules.map((rule) => rule.metric));
      for (const rule of rules) {
        expect(
          emitted.has(rule.metric),
          `${entry.file} references "${rule.metric}", which is not a MEASURE metric on ${entry.flowId} (have: ${[...emitted].join(", ")})`,
        ).toBe(true);
      }
      for (const metric of emitted) {
        expect(
          referenced.has(metric),
          `${entry.file} has no rule for MEASURE metric "${metric}" on ${entry.flowId}`,
        ).toBe(true);
      }
    }
  });

  it("throws for an unknown flowId", () => {
    expect(() => getScoringRules("experiment-stub")).toThrow(
      /Unknown scoring rules/,
    );
  });

  it("defaults cross-session profile rollup to average when acrossSessions is omitted", () => {
    expect(profileAggregationFor("framing_bias")).toBe("average");
    expect(profileAggregationFor("perspective_diversity")).toBe("average");
    expect(profileAggregationFor("memory_reliability")).toBe("average");
    expect(profileAggregationFor("deepfake_resilience")).toBe("average");
    expect(profileAggregationFor("unknown_metric")).toBe("average");
  });

  it("does not use a manual per-experiment import or registry map", () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(srcDir, "index.ts"), "utf8");
    const loaderSrc = readFileSync(join(srcDir, "loadScoringRules.ts"), "utf8");

    expect(indexSrc).not.toMatch(/from ["']\.\/scoring-rules\//);
    expect(loaderSrc).not.toMatch(/from ["']\.\/scoring-rules\//);
    expect(loaderSrc).toMatch(/import\.meta\.glob/);
  });
});
