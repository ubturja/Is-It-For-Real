import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Service role — e2e Node process only (never shipped to the browser bundle).
 * Used to create a second user when verifying RLS isolation.
 */
export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be set for the experiment-session RLS e2e test.",
    );
  }
  return key;
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

export async function loginViaPasswordUi(
  page: Page,
  email: string,
  password: string,
  nextPath: string,
): Promise<PasswordGrant> {
  const tokenResponsePromise = page.waitForResponse((res) => {
    try {
      const path = new URL(res.url()).pathname;
      return (
        path.includes("/auth/v1/token") &&
        res.request().method() === "POST" &&
        res.ok()
      );
    } catch {
      return false;
    }
  });

  await page.goto(`/login?${LOGIN_NEXT_PARAM}=${encodeURIComponent(nextPath)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  const loginError = page.locator("p[role='alert']");
  const tokenResponse = await Promise.race([
    tokenResponsePromise,
    loginError.waitFor({ state: "visible" }).then(async () => {
      throw new Error(
        `Login failed: ${(await loginError.textContent()) ?? "unknown error"}`,
      );
    }),
  ]);

  const grant = parsePasswordGrant(await tokenResponse.json());
  await expect.poll(() => new URL(page.url()).pathname).toBe(nextPath);
  return grant;
}

export function createE2EServiceRoleClient(): SupabaseClient {
  const { url } = requirePublicSupabaseEnv();
  return createClient(url, requireServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createConfirmedUser(
  admin: SupabaseClient,
  prefix: string,
): Promise<{ email: string; password: string; userId: string }> {
  const email = `${prefix}-${crypto.randomUUID()}@example.com`;
  const password = `E2e-${crypto.randomUUID()}-Aa1`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || data.user?.id === undefined) {
    throw new Error(`createUser failed: ${error?.message ?? "no id"}`);
  }
  return { email, password, userId: data.user.id };
}

export async function deleteUserAndTrainingRows(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  await admin.from("flow_sessions").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

/** REST writes only — auth token refresh is not a row insert. */
export function isSupabaseRestWrite(urlString: string, method: string): boolean {
  if (!isSupabaseNetworkRequest(urlString)) {
    return false;
  }
  const write =
    method === "POST" ||
    method === "PATCH" ||
    method === "PUT" ||
    method === "DELETE";
  if (!write) {
    return false;
  }
  try {
    return new URL(urlString).pathname.includes("/rest/v1/");
  } catch {
    return false;
  }
}
