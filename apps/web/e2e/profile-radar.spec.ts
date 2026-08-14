import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  loginViaPasswordUi,
  requirePublicSupabaseEnv,
  requireServiceRoleKey,
} from "./helpers/auth";

test.describe("Train profile radar", () => {
  test("fresh account shows the empty state, not a blank chart", async ({
    page,
  }) => {
    const { url: supabaseUrl, anonKey } = requirePublicSupabaseEnv();
    const serviceRoleKey = requireServiceRoleKey();
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = `e2e-profile-ui-${crypto.randomUUID()}@example.com`;
    const password = `E2e-${crypto.randomUUID()}-Aa1`;
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    expect(createError).toBeNull();
    const userId = created.user?.id;
    expect(userId).toBeTruthy();
    if (!userId) {
      throw new Error("createUser returned no id");
    }

    try {
      await loginViaPasswordUi(page, email, password, "/train/profile");

      await expect(
        page.getByRole("heading", { name: "Your profile" }),
      ).toBeVisible();
      await expect(page.getByText("Nothing here yet")).toBeVisible();
      await expect(page.locator(".recharts-wrapper")).toHaveCount(0);

      await page.getByRole("link", { name: "See scenarios" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/train");
    } finally {
      await admin.from("profiles").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  test("radar lists every key in aggregated_scores, including an unknown future metric", async ({
    page,
  }) => {
    const { url: supabaseUrl, anonKey } = requirePublicSupabaseEnv();
    const serviceRoleKey = requireServiceRoleKey();
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = `e2e-profile-radar-${crypto.randomUUID()}@example.com`;
    const password = `E2e-${crypto.randomUUID()}-Aa1`;
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    expect(createError).toBeNull();
    const userId = created.user?.id;
    expect(userId).toBeTruthy();
    if (!userId) {
      throw new Error("createUser returned no id");
    }

    try {
      await loginViaPasswordUi(page, email, password, "/train/profile");

      const { error: upsertError } = await admin.from("profiles").upsert(
        {
          user_id: userId,
          aggregated_scores: {
            framing_bias: 0.5,
            future_metric: 0.8,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      expect(upsertError).toBeNull();

      await page.reload();

      await expect(page.getByText("Framing: 0.5")).toBeVisible();
      await expect(page.getByText("future metric: 0.8")).toBeVisible();
      await expect(page.getByText("Nothing here yet")).toHaveCount(0);
      await expect(page.locator(".recharts-wrapper")).toHaveCount(1);
    } finally {
      await admin.from("profiles").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });
});
