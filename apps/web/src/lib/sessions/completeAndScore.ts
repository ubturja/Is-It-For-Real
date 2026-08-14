import "server-only";

import { getFlow, hasScoringRules } from "@isitfr/content-config";
import { z } from "zod";

import { aggregateProfile } from "@/lib/sessions/aggregateProfile";
import { scoresForSession } from "@/lib/sessions/scoreSession";
import { sessionScorePlan } from "@/lib/sessions/sessionScorePlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ScoreResponseSchema = z.record(z.string(), z.number());

type SessionRow = {
  id: string;
  flow_id: string;
  user_id: string | null;
  status: string;
};

type InteractionRow = {
  step_id: string;
  choice_value: string | null;
};

export type CompleteAndScoreSuccess = {
  ok: true;
  scores: Record<string, number>;
};

export type CompleteAndScoreFailure = {
  ok: false;
  code:
    | "unauthorized"
    | "not_found"
    | "incomplete"
    | "session_lookup_failed"
    | "interactions_lookup_failed"
    | "scores_lookup_failed"
    | "complete_failed"
    | "score_write_failed"
    | "score_response_invalid"
    | "profile_aggregate_failed"
    | "unknown_flow";
  message: string;
  details?: unknown;
};

export type CompleteAndScoreResult =
  | CompleteAndScoreSuccess
  | CompleteAndScoreFailure;

function isSessionRow(row: unknown): row is SessionRow {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  if (!("id" in row) || typeof row.id !== "string") {
    return false;
  }
  if (!("flow_id" in row) || typeof row.flow_id !== "string") {
    return false;
  }
  if (!("status" in row) || typeof row.status !== "string") {
    return false;
  }
  if (!("user_id" in row)) {
    return false;
  }
  return typeof row.user_id === "string" || row.user_id === null;
}

function isInteractionRow(row: unknown): row is InteractionRow {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  if (!("step_id" in row) || typeof row.step_id !== "string") {
    return false;
  }
  if (!("choice_value" in row)) {
    return false;
  }
  return row.choice_value === null || typeof row.choice_value === "string";
}

async function markCompleted(
  sessionId: string,
  userId: string,
): Promise<CompleteAndScoreFailure | null> {
  const admin = createServiceRoleClient();
  const completedAt = new Date().toISOString();
  const { error } = await admin
    .from("flow_sessions")
    .update({ status: "completed", completed_at: completedAt })
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (error) {
    return {
      ok: false,
      code: "complete_failed",
      message: error.message,
    };
  }
  return null;
}

/**
 * Idempotent complete+score for a session the caller owns.
 * Refuses paths that have not recorded a full MEASURE walk to a final step.
 */
export async function completeAndScoreSession(
  sessionId: string,
  userId: string,
): Promise<CompleteAndScoreResult> {
  const supabase = createClient();
  const { data: sessionData, error: sessionError } = await supabase
    .from("flow_sessions")
    .select("id, flow_id, user_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return {
      ok: false,
      code: "session_lookup_failed",
      message: sessionError.message,
    };
  }

  if (!isSessionRow(sessionData) || sessionData.user_id !== userId) {
    return { ok: false, code: "not_found", message: "Session not found" };
  }

  let flow;
  try {
    flow = getFlow(sessionData.flow_id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown flow";
    return { ok: false, code: "unknown_flow", message };
  }

  const { data: interactionData, error: interactionError } = await supabase
    .from("flow_interactions")
    .select("step_id, choice_value")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (interactionError) {
    return {
      ok: false,
      code: "interactions_lookup_failed",
      message: interactionError.message,
    };
  }

  const rows: InteractionRow[] = (interactionData ?? []).filter(isInteractionRow);
  const recordedStepIds = rows.map((row) => row.step_id);

  const { data: existingScores, error: scoresLookupError } = await supabase
    .from("flow_scores")
    .select("id")
    .eq("session_id", sessionId);

  if (scoresLookupError) {
    return {
      ok: false,
      code: "scores_lookup_failed",
      message: scoresLookupError.message,
    };
  }

  const plan = sessionScorePlan({
    flow,
    recordedStepIds,
    status: sessionData.status,
    existingScoreCount: existingScores?.length ?? 0,
    hasScoringRules: hasScoringRules(sessionData.flow_id),
  });

  if (plan === "reject_incomplete") {
    return {
      ok: false,
      code: "incomplete",
      message: "Session has not recorded a completed MEASURE path",
    };
  }

  // scoresForSession drops MEASURE choice_value outside the flow's declared set.
  const scores = hasScoringRules(sessionData.flow_id)
    ? scoresForSession(sessionData.flow_id, rows)
    : {};
  const parsed = ScoreResponseSchema.safeParse(scores);
  if (!parsed.success) {
    return {
      ok: false,
      code: "score_response_invalid",
      message: "Score payload failed schema validation",
      details: parsed.error.issues,
    };
  }

  if (plan === "write_scores") {
    const admin = createServiceRoleClient();
    const scoreRows = Object.entries(parsed.data).map(
      ([metric_name, metric_value]) => ({
        session_id: sessionId,
        metric_name,
        metric_value,
      }),
    );
    if (scoreRows.length > 0) {
      const { error: upsertError } = await admin.from("flow_scores").upsert(
        scoreRows,
        { onConflict: "session_id,metric_name" },
      );
      if (upsertError) {
        return {
          ok: false,
          code: "score_write_failed",
          message: upsertError.message,
        };
      }
    }
  }

  if (plan === "write_scores" || plan === "mark_complete_only") {
    const completeError = await markCompleted(sessionId, userId);
    if (completeError) {
      return completeError;
    }
    try {
      await aggregateProfile(userId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "profile rollup failed";
      return { ok: false, code: "profile_aggregate_failed", message };
    }
  }

  return { ok: true, scores: parsed.data };
}

/**
 * Recover sessions left in_progress after the client never finished POST /score.
 * Safe to call from /train Server Components — no browser fetch required.
 */
export async function finalizeAbandonedSessions(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return;
  }

  const { data: sessions, error } = await supabase
    .from("flow_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(20);

  if (error || sessions === null) {
    return;
  }

  for (const row of sessions) {
    if (typeof row.id !== "string") {
      continue;
    }
    const result = await completeAndScoreSession(row.id, user.id);
    if (result.ok === false && result.code === "incomplete") {
      continue;
    }
  }
}
