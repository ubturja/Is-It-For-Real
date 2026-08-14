import type { SupabaseClient } from "@supabase/supabase-js";

const ROW_TABLES = [
  "flow_sessions",
  "flow_interactions",
  "flow_scores",
  "reports",
  "profiles",
] as const;

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

async function listIds(
  admin: SupabaseClient,
  table: (typeof ROW_TABLES)[number],
): Promise<string[]> {
  if (table === "profiles") {
    const { data, error } = await admin.from(table).select("user_id");
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    return (data ?? [])
      .map((row) => {
        if (!isProfileIdRow(row)) {
          throw new Error(`${table} row missing user_id`);
        }
        return row.user_id;
      })
      .sort();
  }

  const { data, error } = await admin.from(table).select("id");
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
}

export async function snapshotPublicRows(
  admin: SupabaseClient,
): Promise<PublicRowSnapshot> {
  const [
    flow_sessions,
    flow_interactions,
    flow_scores,
    reports,
    profiles,
  ] = await Promise.all(ROW_TABLES.map((table) => listIds(admin, table)));

  return {
    flow_sessions,
    flow_interactions,
    flow_scores,
    reports,
    profiles,
  };
}
