import type { FlowConfig, ScoringRules } from "@isitfr/schemas";

export type MeasureChoiceDomain =
  | { kind: "discrete"; values: ReadonlySet<number> }
  | { kind: "range"; low: number; high: number };

/**
 * Values the score path may trust for a MEASURE `choice_value`.
 *
 * Diamond steps declare 2–3 `weight`s on sibling MEASURE nodes of the same
 * metric — that set is the allowlist. Unweighted MEASURE (client-supplied
 * observation) is bounded by the scoring rule's `normalizeToRange`.
 */
export function measureChoiceDomain(
  flow: FlowConfig,
  stepId: string,
  rules: ScoringRules,
): MeasureChoiceDomain | null {
  const step = flow.steps[stepId];
  if (
    step === undefined ||
    step.type !== "MEASURE" ||
    step.metric === undefined ||
    step.metric.trim() === ""
  ) {
    return null;
  }

  const metric = step.metric;
  const values = new Set<number>();
  for (const candidate of Object.values(flow.steps)) {
    if (
      candidate.type === "MEASURE" &&
      candidate.metric === metric &&
      typeof candidate.weight === "number" &&
      Number.isFinite(candidate.weight)
    ) {
      values.add(candidate.weight);
    }
  }
  if (values.size > 0) {
    return { kind: "discrete", values };
  }

  const rule = rules.find((entry) => entry.metric === metric);
  if (rule === undefined) {
    return null;
  }
  const [low, high] = rule.normalizeToRange;
  return { kind: "range", low, high };
}

export function isDeclaredMeasureChoice(
  domain: MeasureChoiceDomain | null,
  value: number,
): boolean {
  if (domain === null || !Number.isFinite(value)) {
    return false;
  }
  if (domain.kind === "discrete") {
    return domain.values.has(value);
  }
  return value >= domain.low && value <= domain.high;
}
