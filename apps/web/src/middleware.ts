import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Auth gate for /train only.
 *
 * Explicitly excluded (not in matcher — Crisis Mode zero friction):
 * - /help and /help/**
 * - /api/health
 *
 * Session refresh + redirect-to-/login runs only for /train/**.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/train", "/train/:path*"],
};
