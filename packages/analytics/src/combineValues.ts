import type { ScoringRule } from "@isitfr/schemas";

export function combineValues(
  values: number[],
  aggregation: ScoringRule["aggregation"],
): number {
  if (values.length === 0) {
    return 0;
  }

  switch (aggregation) {
    case "sum":
      return values.reduce((total, value) => total + value, 0);
    case "average":
      return values.reduce((total, value) => total + value, 0) / values.length;
    case "last":
      return values[values.length - 1] ?? 0;
  }
}
