import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  LOGIN_NEXT_PARAM,
  parsePasswordGrant,
  requireE2EAccount,
  requirePublicSupabaseEnv,
} from "./helpers/auth";
import { getAuthChrome } from "./helpers/content";

test.describe("Auth boundary", () => {
  test("unauthenticated GET /train redirects to /login with next=/train", async ({
    page,
  }) => {
    await page.goto("/train");

    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get(LOGIN_NEXT_PARAM)).toBe("/train");
    const signInTitle = page.getByRole("heading", { name: "Sign in" });
    await expect(signInTitle).toBeVisible();
    await expect(signInTitle).toHaveAttribute("data-slot", "card-title");
  });

  test("unauthenticated GET /train/[experimentId] redirects to /login with next", async ({
    page,
  }) => {
    const experimentPath = "/train/experiment-stub";
    await page.goto(experimentPath);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get(LOGIN_NEXT_PARAM)).toBe(experimentPath);
    const signInTitle = page.getByRole("heading", { name: "Sign in" });
    await expect(signInTitle).toBeVisible();
    await expect(signInTitle).toHaveAttribute("data-slot", "card-title");
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

    console.log(
      `profiles query: error=${profileError?.message ?? "null"} row=${JSON.stringify(profile)} expected_user_id=${grant.user.id}`,
    );

    expect(profileError).toBeNull();
    expect(profile?.user_id).toBe(grant.user.id);
  });

  test("forgot password requests a reset without revealing whether the email exists", async ({
    page,
  }) => {
    const recoverPosts: string[] = [];
    await page.route("**/auth/v1/recover**", async (route) => {
      recoverPosts.push(route.request().postData() ?? "");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    });

    const chrome = getAuthChrome();
    await page.goto("/login");
    await page.getByRole("button", { name: chrome.forgot.link }).click();
    await expect(
      page.getByRole("heading", { name: chrome.forgot.title }),
    ).toBeVisible();

    await page.getByLabel("Email").fill("reset-test@example.com");
    await page.getByRole("button", { name: chrome.forgot.submit }).click();

    await expect(page.getByRole("status")).toHaveText(chrome.forgot.sent);
    expect(recoverPosts.length).toBeGreaterThan(0);
  });

  test("reset page without a recovery session asks for a new link", async ({
    page,
  }) => {
    const chrome = getAuthChrome();
    await page.goto("/login/reset");
    await expect(page.getByRole("status")).toHaveText(
      chrome.reset.missingSession,
    );
    await expect(
      page.getByRole("link", { name: chrome.forgot.back }),
    ).toBeVisible();
  });
});
