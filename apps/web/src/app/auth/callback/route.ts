import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/train";
  }
  return next;
}

/**
 * OAuth / email-confirm / password-recovery callback: exchange code for
 * session, upsert profiles, then send the user to `next` (default /train).
 * Recovery emails set next=/login/reset so the user can choose a new password.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      try {
        await ensureProfile(supabase, data.user.id);
      } catch {
        return NextResponse.redirect(
          new URL("/login?error=auth", url.origin),
        );
      }
      return NextResponse.redirect(new URL(nextPath, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
