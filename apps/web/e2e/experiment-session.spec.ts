import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  loginViaPasswordUi,
  requireE2EAccount,
  requirePublicSupabaseEnv,
  requireServiceRoleKey,
} from "./helpers/auth";
import { getStepChrome } from "./helpers/content";

const STUB_PATH = "/train/experiment-stub";
const STUB_FLOW_ID = "experiment-stub";

type SessionRow = {
  id: string;
  flow_id: string;
  flow_version: number;
  user_id: string;
  status: string;
  completed_at: string | null;
};

type InteractionRow = {
  session_id: string;
  step_id: string;
  choice_value: string | null;
  reaction_time_ms: number | null;
};

async function pollUntil<T>(
  read: () => Promise<T | null>,
  timeoutMs: number,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T | null = null;
  while (Date.now() < deadline) {
    last = await read();
    if (last !== null) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for persisted experiment session");
}

test.describe("Experiment session persistence", () => {
  test("completing the stub writes own session + MEASURE rows; second user cannot read them", async ({
    page,
  }) => {
    const { email, password } = requireE2EAccount();
    const { url: supabaseUrl, anonKey } = requirePublicSupabaseEnv();
    const serviceRoleKey = requireServiceRoleKey();

    const grant = await loginViaPasswordUi(page, email, password, STUB_PATH);

    await expect(page.getByText("Measure", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Stub probe — not real experiment content."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Stub complete.")).toBeVisible();

    const owner = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: sessionError } = await owner.auth.setSession({
      access_token: grant.access_token,
      refresh_token: grant.refresh_token,
    });
    expect(sessionError).toBeNull();

    const session = await pollUntil(async () => {
      const { data, error } = await owner
        .from("flow_sessions")
        .select("id, flow_id, flow_version, user_id, status, completed_at")
        .eq("user_id", grant.user.id)
        .eq("flow_id", STUB_FLOW_ID)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        return null;
      }
      return data as SessionRow;
    }, 15_000);

    expect(session.flow_id).toBe(STUB_FLOW_ID);
    expect(session.flow_version).toBe(1);
    expect(session.user_id).toBe(grant.user.id);
    expect(session.status).toBe("completed");
    expect(session.completed_at).not.toBeNull();

    const interactions = await pollUntil(async () => {
      const { data, error } = await owner
        .from("flow_interactions")
        .select("session_id, step_id, choice_value, reaction_time_ms")
        .eq("session_id", session.id);
      if (error || !data || data.length === 0) {
        return null;
      }
      return data as InteractionRow[];
    }, 15_000);

    expect(interactions).toHaveLength(1);
    expect(interactions[0]?.session_id).toBe(session.id);
    expect(interactions[0]?.step_id).toBe("probe");
    expect(interactions[0]?.choice_value).toBe("1");
    expect(interactions[0]?.reaction_time_ms).toBeGreaterThanOrEqual(0);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const otherEmail = `e2e-rls-${crypto.randomUUID()}@example.com`;
    const otherPassword = `E2e-${crypto.randomUUID()}-Aa1`;
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: otherEmail,
        password: otherPassword,
        email_confirm: true,
      });
    expect(createError).toBeNull();
    const otherUserId = created.user?.id;
    expect(otherUserId).toBeTruthy();

    try {
      const other = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: otherSession, error: otherSignInError } =
        await other.auth.signInWithPassword({
          email: otherEmail,
          password: otherPassword,
        });
      expect(otherSignInError).toBeNull();
      expect(otherSession.user?.id).toBe(otherUserId);

      const { data: hiddenSessions, error: hiddenSessionError } = await other
        .from("flow_sessions")
        .select("id")
        .eq("id", session.id);
      expect(hiddenSessionError).toBeNull();
      expect(hiddenSessions ?? []).toEqual([]);

      const { data: hiddenInteractions, error: hiddenInteractionError } =
        await other
          .from("flow_interactions")
          .select("id")
          .eq("session_id", session.id);
      expect(hiddenInteractionError).toBeNull();
      expect(hiddenInteractions ?? []).toEqual([]);
    } finally {
      if (otherUserId) {
        await admin.auth.admin.deleteUser(otherUserId);
      }
      await admin.from("flow_sessions").delete().eq("id", session.id);
    }
  });

  test("a failed score write shows the persist notice and still lets the stub finish", async ({
    page,
  }) => {
    const { email, password } = requireE2EAccount();
    const unsaved = getStepChrome().persist.unsaved;

    await page.route("**/api/sessions/**/score", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "simulated_write_failure", message: "broken" },
          }),
        });
        return;
      }
      await route.continue();
    });

    await loginViaPasswordUi(page, email, password, STUB_PATH);

    await expect(page.getByText("Measure", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Stub complete.")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(unsaved);
  });

  test("a failed session insert shows the persist notice without blocking advance", async ({
    page,
  }) => {
    const { email, password } = requireE2EAccount();
    const unsaved = getStepChrome().persist.unsaved;

    await page.route("**/rest/v1/flow_sessions*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "simulated write failure" }),
        });
        return;
      }
      await route.continue();
    });

    await loginViaPasswordUi(page, email, password, STUB_PATH);

    await expect(page.getByText("Measure", { exact: true })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(unsaved);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Stub complete.")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(unsaved);
  });
});
