import { hasCompletedMeasurePath } from "@isitfr/engine";
import type { FlowConfig } from "@isitfr/schemas";

export type SessionScorePlan =
  | "reject_incomplete"
  | "write_scores"
  | "mark_complete_only"
  | "noop";

/**
 * Decide how to finish a session without scoring a partial path.
 * Idempotent: already-completed sessions with scores are a no-op.
 */
export function sessionScorePlan(input: {
  flow: FlowConfig;
  recordedStepIds: readonly string[];
  status: string;
  existingScoreCount: number;
  hasScoringRules: boolean;
}): SessionScorePlan {
  if (!hasCompletedMeasurePath(input.flow, input.recordedStepIds)) {
    return "reject_incomplete";
  }
  const needsScores =
    input.hasScoringRules && input.existingScoreCount === 0;
  const needsComplete = input.status !== "completed";
  if (needsScores) {
    return "write_scores";
  }
  if (needsComplete) {
    return "mark_complete_only";
  }
  return "noop";
}
