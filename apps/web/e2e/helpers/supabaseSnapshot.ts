import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicRowSnapshot = {
  flow_sessions: string[];
  flow_interactions: string[];
  flow_scores: string[];
  reports: string[];
  profiles: string[];
};

function isIdRow(value: unknown): value is { id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}

function isProfileIdRow(value: unknown): value is { user_id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "user_id" in value &&
    typeof value.user_id === "string"
  );
}

/**
 * Row ids owned by one auth user. Isolation tests must not snapshot the
 * whole hosted project — the parallel a11y CI job writes other users' rows.
 */
export async function snapshotRowsForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<PublicRowSnapshot> {
  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId);
  if (profileError) {
    throw new Error(`profiles: ${profileError.message}`);
  }

  const { data: sessionRows, error: sessionError } = await admin
    .from("flow_sessions")
    .select("id")
    .eq("user_id", userId);
  if (sessionError) {
    throw new Error(`flow_sessions: ${sessionError.message}`);
  }

  const flow_sessions = (sessionRows ?? [])
    .map((row) => {
      if (!isIdRow(row)) {
        throw new Error("flow_sessions row missing id");
      }
      return row.id;
    })
    .sort();

  const childIds = async (
    table: "flow_interactions" | "flow_scores" | "reports",
  ): Promise<string[]> => {
    if (flow_sessions.length === 0) {
      return [];
    }
    const { data, error } = await admin
      .from(table)
      .select("id")
      .in("session_id", flow_sessions);
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    return (data ?? [])
      .map((row) => {
        if (!isIdRow(row)) {
          throw new Error(`${table} row missing id`);
        }
        return row.id;
      })
      .sort();
  };

  const [flow_interactions, flow_scores, reports] = await Promise.all([
    childIds("flow_interactions"),
    childIds("flow_scores"),
    childIds("reports"),
  ]);

  return {
    flow_sessions,
    flow_interactions,
    flow_scores,
    reports,
    profiles: (profileRows ?? [])
      .map((row) => {
        if (!isProfileIdRow(row)) {
          throw new Error("profiles row missing user_id");
        }
        return row.user_id;
      })
      .sort(),
  };
}
