import { hasScoringRules } from "@isitfr/content-config";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { aggregateProfile } from "@/lib/sessions/aggregateProfile";
import { scoresForSession } from "@/lib/sessions/scoreSession";
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

export async function POST(
  _request: Request,
  context: { params: { id: string } },
) {
  const sessionId = context.params.id;
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError(
      { code: "unauthorized", message: "Authentication required" },
      401,
    );
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("flow_sessions")
    .select("id, flow_id, user_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return jsonError(
      { code: "session_lookup_failed", message: sessionError.message },
      500,
    );
  }

  if (!isSessionRow(sessionData) || sessionData.user_id !== user.id) {
    return jsonError({ code: "not_found", message: "Session not found" }, 404);
  }

  const admin = createServiceRoleClient();

  if (sessionData.status !== "completed") {
    const completedAt = new Date().toISOString();
    const { error: completeError } = await admin
      .from("flow_sessions")
      .update({ status: "completed", completed_at: completedAt })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (completeError) {
      return jsonError(
        { code: "complete_failed", message: completeError.message },
        500,
      );
    }
  }

  if (!hasScoringRules(sessionData.flow_id)) {
    return jsonSuccess({});
  }

  const { data: interactionData, error: interactionError } = await supabase
    .from("flow_interactions")
    .select("step_id, choice_value")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (interactionError) {
    return jsonError(
      { code: "interactions_lookup_failed", message: interactionError.message },
      500,
    );
  }

  const rows: InteractionRow[] = (interactionData ?? []).filter(isInteractionRow);

  const scores = scoresForSession(sessionData.flow_id, rows);
  const parsed = ScoreResponseSchema.safeParse(scores);
  if (!parsed.success) {
    return jsonError(
      {
        code: "score_response_invalid",
        message: "Score payload failed schema validation",
        details: parsed.error.issues,
      },
      500,
    );
  }

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
      return jsonError(
        { code: "score_write_failed", message: upsertError.message },
        500,
      );
    }
  }

  // Synchronous: profile rollup must finish before this response returns.
  // Fire-and-forget would let completion succeed with a stale
  // `aggregated_scores` (no retry), and Phase 7 reports would read it.
  // Recompute is cheap (read this user's scores + one upsert) and
  // idempotent with the score upsert above.
  try {
    await aggregateProfile(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "profile rollup failed";
    return jsonError({ code: "profile_aggregate_failed", message }, 500);
  }

  return jsonSuccess(parsed.data);
}
