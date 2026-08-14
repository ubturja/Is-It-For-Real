import { hasScoringRules } from "@isitfr/content-config";
import { ReflectionReportSchema } from "@isitfr/schemas";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { generateReflection } from "@/lib/reflect/generateReflection";
import { isFlowScoreRow, metricsForReflection } from "@/lib/reflect/metrics";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SessionRow = {
  id: string;
  flow_id: string;
  user_id: string | null;
  status: string;
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

  if (sessionData.status !== "completed") {
    return jsonError(
      {
        code: "session_not_completed",
        message: "Reflection requires a completed, scored session",
      },
      409,
    );
  }

  if (!hasScoringRules(sessionData.flow_id)) {
    return jsonError(
      {
        code: "no_scoring_rules",
        message: "This flow has no scoring-rule descriptions",
      },
      400,
    );
  }

  // Scores only — never flow_interactions or free-text input. The model
  // must be structurally unable to see what the user did or said.
  const admin = createServiceRoleClient();
  const { data: scoreData, error: scoreError } = await admin
    .from("flow_scores")
    .select("metric_name, metric_value")
    .eq("session_id", sessionId);

  if (scoreError) {
    return jsonError(
      { code: "scores_lookup_failed", message: scoreError.message },
      500,
    );
  }

  const scores = (scoreData ?? []).filter(isFlowScoreRow);
  if (scores.length === 0) {
    return jsonError(
      {
        code: "no_scores",
        message: "Session has no flow_scores to reflect on",
      },
      409,
    );
  }

  let metrics;
  try {
    metrics = metricsForReflection(sessionData.flow_id, scores);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "failed to build reflection metrics";
    return jsonError({ code: "reflection_metrics_invalid", message }, 500);
  }

  let generated;
  try {
    generated = await generateReflection(metrics);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "reflection generation failed";
    return jsonError({ code: "reflection_failed", message }, 502);
  }

  const parsed = ReflectionReportSchema.safeParse(generated.report);
  if (!parsed.success) {
    return jsonError(
      {
        code: "reflection_invalid",
        message: "Reflection payload failed schema validation",
        details: parsed.error.issues,
      },
      500,
    );
  }

  const { error: upsertError } = await admin.from("reports").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      content: JSON.stringify(parsed.data),
      model_used: generated.model_used,
    },
    { onConflict: "session_id" },
  );

  if (upsertError) {
    return jsonError(
      { code: "report_write_failed", message: upsertError.message },
      500,
    );
  }

  return jsonSuccess(parsed.data);
}
