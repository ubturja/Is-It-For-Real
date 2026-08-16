"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Training-path sign-out. Crisis Mode (`/help`) never calls this.
 * Clears the cookie session, then sends the user to /login.
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
