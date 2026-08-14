import { describe, expect, it } from "vitest";
import type { ScoringRule } from "@isitfr/schemas";

import { computeScores } from "./computeScores";

function rule(
  metric: string,
  aggregation: ScoringRule["aggregation"],
  normalizeToRange: [number, number] = [0, 1],
): ScoringRule {
  return {
    metric,
    aggregation,
    normalizeToRange,
    description: `${aggregation} ${metric}`,
  };
}

describe("computeScores", () => {
  it("applies sum, average, and last aggregations then normalizes", () => {
    const scores = computeScores(
      [
        { metric: "sum_metric", value: 1 },
        { metric: "sum_metric", value: 2 },
        { metric: "sum_metric", value: 3 },
        { metric: "avg_metric", value: 2 },
        { metric: "avg_metric", value: 4 },
        { metric: "last_metric", value: 1 },
        { metric: "last_metric", value: 9 },
        { metric: "last_metric", value: 5 },
      ],
      [
        rule("sum_metric", "sum"),
        rule("avg_metric", "average"),
        rule("last_metric", "last"),
      ],
    );

    expect(scores).toEqual({
      sum_metric: 6,
      avg_metric: 3,
      last_metric: 5,
    });
  });

  it("scales aggregated values onto normalizeToRange", () => {
    expect(
      computeScores(
        [{ metric: "pct", value: 0.25 }],
        [rule("pct", "last", [0, 100])],
      ),
    ).toEqual({ pct: 25 });
  });

  it("scores 0 when a rule has no matching interactions", () => {
    expect(computeScores([], [rule("missing", "sum")])).toEqual({ missing: 0 });
  });

  it("ignores interactions whose metric is not in the rules", () => {
    expect(
      computeScores(
        [{ metric: "other", value: 99 }],
        [rule("target", "last")],
      ),
    ).toEqual({ target: 0 });
  });
});
