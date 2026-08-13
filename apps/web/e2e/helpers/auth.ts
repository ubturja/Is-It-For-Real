/**
 * Redirect query param set by updateSession() when /train is unauthenticated.
 * Source of truth: apps/web/src/lib/supabase/middleware.ts (invoked from
 * apps/web/src/middleware.ts) — `loginUrl.searchParams.set("next", ...)`.
 */
export const LOGIN_NEXT_PARAM = "next";

export function isSupabaseNetworkRequest(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  const host = parsed.hostname;
  if (host.endsWith(".supabase.co") || host.endsWith(".supabase.in")) {
    return true;
  }

  const configured =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!configured) {
    return false;
  }

  try {
    const origin = new URL(configured).origin;
    return parsed.origin === origin;
  } catch {
    return false;
  }
}

export function requireE2EAccount(): { email: string; password: string } {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL and E2E_PASSWORD must be set (see apps/web/.env.local.example) for the login/profile e2e test.",
    );
  }
  return { email, password };
}

export function requirePublicSupabaseEnv(): {
  url: string;
  anonKey: string;
} {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for the login/profile e2e test.",
    );
  }
  return { url, anonKey };
}

type PasswordGrant = {
  access_token: string;
  refresh_token: string;
  user: { id: string };
};

export function parsePasswordGrant(body: unknown): PasswordGrant {
  if (typeof body !== "object" || body === null) {
    throw new Error("Auth token response was not an object");
  }
  if (
    !("access_token" in body) ||
    !("refresh_token" in body) ||
    !("user" in body)
  ) {
    throw new Error("Auth token response missing session fields");
  }
  const { access_token, refresh_token, user } = body;
  if (
    typeof access_token !== "string" ||
    typeof refresh_token !== "string" ||
    typeof user !== "object" ||
    user === null ||
    !("id" in user) ||
    typeof user.id !== "string"
  ) {
    throw new Error("Auth token response had unexpected session shape");
  }
  return { access_token, refresh_token, user: { id: user.id } };
}
