import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * First real Supabase write: ensure a profiles row exists for this auth user.
 * PK is `user_id` (matches SYSTEM_REFERENCE.md §5 / init migration).
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Failed to upsert profiles row: ${error.message}`);
  }
}
