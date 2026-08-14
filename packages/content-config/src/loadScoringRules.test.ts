import { describe, expect, it } from "vitest";
import type { ScoringRule } from "@isitfr/schemas";

import { buildScoringRuleRegistry } from "./loadScoringRules";

const validRule: ScoringRule = {
  metric: "probe",
  aggregation: "last",
  normalizeToRange: [0, 1],
  description: "Probe rule",
};

describe("buildScoringRuleRegistry", () => {
  it("throws when no modules are discovered", () => {
    expect(() => buildScoringRuleRegistry({})).toThrow(
      /No scoring-rules JSON files discovered/,
    );
  });

  it("throws (does not skip) when a discovered file fails ScoringRules validation", () => {
    expect(() =>
      buildScoringRuleRegistry({
        "./scoring-rules/broken.v1.json": { metric: "probe" },
      }),
    ).toThrow(/Invalid scoring rules in \.\/scoring-rules\/broken\.v1\.json/);
  });

  it("throws on duplicate flowId across two files", () => {
    expect(() =>
      buildScoringRuleRegistry({
        "./scoring-rules/probe.v1.json": [validRule],
        "./scoring-rules/probe.v2.json": [validRule],
      }),
    ).toThrow(/Duplicate scoring rules for flowId "probe"/);
  });

  it("keys the map by flowId from the filename, not a field in the JSON", () => {
    const registry = buildScoringRuleRegistry({
      "./scoring-rules/framing-headlines.v1.json": [validRule],
    });
    expect(registry["framing-headlines"]?.[0]?.metric).toBe("probe");
  });
});
