import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  LOGIN_NEXT_PARAM,
  parsePasswordGrant,
  requireE2EAccount,
  requirePublicSupabaseEnv,
} from "./helpers/auth";

test.describe("Auth boundary", () => {
  test("unauthenticated GET /train redirects to /login with next=/train", async ({
    page,
  }) => {
    await page.goto("/train");

    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get(LOGIN_NEXT_PARAM)).toBe("/train");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("unauthenticated GET /train/[experimentId] redirects to /login with next", async ({
    page,
  }) => {
    const experimentPath = "/train/experiment-stub";
    await page.goto(experimentPath);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get(LOGIN_NEXT_PARAM)).toBe(experimentPath);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("real login upserts a profiles row for the authenticated user_id", async ({
    page,
  }) => {
    const { email, password } = requireE2EAccount();
    const { url: supabaseUrl, anonKey } = requirePublicSupabaseEnv();

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

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    const loginError = page.getByRole("alert");
    const tokenResponse = await Promise.race([
      tokenResponsePromise,
      loginError.waitFor({ state: "visible" }).then(async () => {
        throw new Error(
          `Login failed: ${(await loginError.textContent()) ?? "unknown error"}`,
        );
      }),
    ]);

    const grant = parsePasswordGrant(await tokenResponse.json());

    await expect(page).toHaveURL(/\/train/);
    await expect(
      page.getByRole("heading", { name: "Train" }),
    ).toBeVisible();

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: grant.access_token,
      refresh_token: grant.refresh_token,
    });
    expect(sessionError).toBeNull();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", grant.user.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.user_id).toBe(grant.user.id);
  });
});
