import { computeScores } from "@isitfr/analytics";
import { getFlow, getScoringRules } from "@isitfr/content-config";
import type { FlowConfig, FlowInteraction, ScoringRules } from "@isitfr/schemas";

import {
  isDeclaredMeasureChoice,
  measureChoiceDomain,
} from "@/lib/sessions/declaredMeasureValues";

type InteractionRow = {
  step_id: string;
  choice_value: string | null;
};

/**
 * Map persisted MEASURE rows onto `{ metric, value }` using the flow graph.
 * BRANCH rows (if any) are ignored — scoring reads MEASURE only (§4).
 */
export function toFlowInteractions(
  rows: InteractionRow[],
  flow: FlowConfig,
  rules: ScoringRules = [],
): FlowInteraction[] {
  const interactions: FlowInteraction[] = [];

  for (const row of rows) {
    const step = flow.steps[row.step_id];
    if (
      step === undefined ||
      step.type !== "MEASURE" ||
      step.metric === undefined ||
      step.metric.trim() === "" ||
      row.choice_value === null
    ) {
      continue;
    }
    const value = Number(row.choice_value);
    if (!Number.isFinite(value)) {
      continue;
    }
    const domain = measureChoiceDomain(flow, row.step_id, rules);
    if (!isDeclaredMeasureChoice(domain, value)) {
      continue;
    }
    interactions.push({ metric: step.metric, value });
  }

  return interactions;
}

export function scoresForSession(
  flowId: string,
  rows: InteractionRow[],
): Record<string, number> {
  const flow = getFlow(flowId);
  const rules = getScoringRules(flowId);
  return computeScores(toFlowInteractions(rows, flow, rules), rules);
}
