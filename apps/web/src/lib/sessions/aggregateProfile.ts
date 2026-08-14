import "server-only";

import { AggregatedScoresSchema, type AggregatedScores } from "@isitfr/schemas";

import { aggregatedScoresFromRows } from "@/lib/sessions/profileScores";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type SessionRow = {
  id: string;
  completed_at: string | null;
  started_at: string;
};

type ScoreRow = {
  session_id: string;
  metric_name: string;
  metric_value: number;
};

function isSessionRow(row: unknown): row is SessionRow {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  if (!("id" in row) || typeof row.id !== "string") {
    return false;
  }
  if (!("started_at" in row) || typeof row.started_at !== "string") {
    return false;
  }
  if (!("completed_at" in row)) {
    return false;
  }
  return row.completed_at === null || typeof row.completed_at === "string";
}

function isScoreRow(row: unknown): row is ScoreRow {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  if (!("session_id" in row) || typeof row.session_id !== "string") {
    return false;
  }
  if (!("metric_name" in row) || typeof row.metric_name !== "string") {
    return false;
  }
  if (!("metric_value" in row) || typeof row.metric_value !== "number") {
    return false;
  }
  return Number.isFinite(row.metric_value);
}

/**
 * Recompute `profiles.aggregated_scores` from every completed session's
 * `flow_scores` for this user.
 *
 * Uses the service role to read scores / write the profile (same trusted
 * path as P6.2 score inserts). Phase 4 RLS still applies to clients:
 * `profiles_select_own` / `profiles_update_own` are `auth.uid() = user_id`,
 * so another authenticated user cannot read or write this row.
 */
export async function aggregateProfile(
  userId: string,
): Promise<AggregatedScores> {
  const admin = createServiceRoleClient();

  const { data: sessionData, error: sessionError } = await admin
    .from("flow_sessions")
    .select("id, completed_at, started_at")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (sessionError) {
    throw new Error(
      `aggregateProfile: failed to load sessions: ${sessionError.message}`,
    );
  }

  const sessions = (sessionData ?? []).filter(isSessionRow);
  const sessionIds = sessions.map((session) => session.id);

  let scores: ScoreRow[] = [];
  if (sessionIds.length > 0) {
    const { data: scoreData, error: scoreError } = await admin
      .from("flow_scores")
      .select("session_id, metric_name, metric_value")
      .in("session_id", sessionIds);

    if (scoreError) {
      throw new Error(
        `aggregateProfile: failed to load scores: ${scoreError.message}`,
      );
    }
    scores = (scoreData ?? []).filter(isScoreRow);
  }

  const aggregated = aggregatedScoresFromRows(sessions, scores);
  const parsed = AggregatedScoresSchema.safeParse(aggregated);
  if (!parsed.success) {
    throw new Error("aggregateProfile: rolled scores failed schema validation");
  }

  const { error: upsertError } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      aggregated_scores: parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    throw new Error(
      `aggregateProfile: failed to upsert profile: ${upsertError.message}`,
    );
  }

  return parsed.data;
}
