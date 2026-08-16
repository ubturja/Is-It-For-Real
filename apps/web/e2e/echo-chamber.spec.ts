import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  loginViaPasswordUi,
  requireE2EAccount,
  requirePublicSupabaseEnv,
  requireServiceRoleKey,
} from "./helpers/auth";
import { getReportChrome } from "./helpers/content";

const ECHO_PATH = "/train/echo-chamber";
const ECHO_FLOW_ID = "echo-chamber";

const SPORTS_HEADLINES = [
  "Hawks take the cup on a last-minute header",
  "Rookie point guard named starter for Friday",
  "County meet: 800-meter record falls by half a second",
  "Star striker listed day-to-day with ankle sprain",
  "Relay team clips the regional mark by two tenths",
];

const CLIMATE_HEADLINE = "City offers rebates for rooftop solar this spring";

type SessionRow = {
  id: string;
  flow_id: string;
  status: string;
};

type InteractionRow = {
  session_id: string;
  step_id: string;
  choice_value: string | null;
};

async function pollUntil<T>(
  read: () => Promise<T | null>,
  timeoutMs: number,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const last = await read();
    if (last !== null) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for echo-chamber session");
}

test.describe("Echo Chamber experiment", () => {
  test("five same-topic clicks narrow the feed and persist perspective_diversity", async ({
    page,
  }) => {
    const { email, password } = requireE2EAccount();
    const { url: supabaseUrl, anonKey } = requirePublicSupabaseEnv();
    const serviceRoleKey = requireServiceRoleKey();

    const grant = await loginViaPasswordUi(page, email, password, ECHO_PATH);

    await expect(
      page.getByText("A short feed — open what you would tap, then continue."),
    ).toBeVisible();
    await expect(page.getByText("Measure", { exact: true })).toHaveCount(0);
    await expect(page.getByText(CLIMATE_HEADLINE)).toBeVisible();

    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeDisabled();

    await page.getByRole("button", { name: SPORTS_HEADLINES[0] }).click();
    await page.getByRole("button", { name: SPORTS_HEADLINES[1] }).click();
    await page.getByRole("button", { name: SPORTS_HEADLINES[2] }).click();

    await expect(page.getByText(CLIMATE_HEADLINE)).toHaveCount(0);

    await page.getByRole("button", { name: SPORTS_HEADLINES[3] }).click();
    await page.getByRole("button", { name: SPORTS_HEADLINES[4] }).click();

    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await expect(
      page.getByRole("heading", { name: getReportChrome().title }),
    ).toBeVisible();

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
        .select("id, flow_id, status")
        .eq("user_id", grant.user.id)
        .eq("flow_id", ECHO_FLOW_ID)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        return null;
      }
      return data as SessionRow;
    }, 15_000);

    const interactions = await pollUntil(async () => {
      const { data, error } = await owner
        .from("flow_interactions")
        .select("session_id, step_id, choice_value")
        .eq("session_id", session.id)
        .eq("step_id", "perspective_diversity");
      if (error || !data || data.length === 0) {
        return null;
      }
      return data as InteractionRow[];
    }, 15_000);

    expect(interactions).toHaveLength(1);
    expect(interactions[0]?.choice_value).toBe("0.25");

    const scores = await pollUntil(async () => {
      const { data, error } = await owner
        .from("flow_scores")
        .select("metric_name, metric_value")
        .eq("session_id", session.id);
      if (error || !data || data.length === 0) {
        return null;
      }
      return data as Array<{ metric_name: string; metric_value: number }>;
    }, 15_000);

    expect(scores).toHaveLength(1);
    expect(scores[0]?.metric_name).toBe("perspective_diversity");
    expect(scores[0]?.metric_value).toBe(0.25);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin.from("flow_sessions").delete().eq("id", session.id);
  });

  test("aborting POST /score still scores on the next /train visit", async ({
    page,
  }) => {
    const { email, password } = requireE2EAccount();
    const { url: supabaseUrl, anonKey } = requirePublicSupabaseEnv();
    const serviceRoleKey = requireServiceRoleKey();

    let clientScorePosts = 0;
    await page.route("**/api/sessions/**/score", async (route) => {
      if (route.request().method() === "POST") {
        clientScorePosts += 1;
        await route.abort("failed");
        return;
      }
      await route.continue();
    });

    const grant = await loginViaPasswordUi(page, email, password, ECHO_PATH);

    await expect(
      page.getByText("A short feed — open what you would tap, then continue."),
    ).toBeVisible();

    const continueButton = page.getByRole("button", { name: "Continue" });
    await page.getByRole("button", { name: SPORTS_HEADLINES[0] }).click();
    await page.getByRole("button", { name: SPORTS_HEADLINES[1] }).click();
    await page.getByRole("button", { name: SPORTS_HEADLINES[2] }).click();
    await page.getByRole("button", { name: SPORTS_HEADLINES[3] }).click();
    await page.getByRole("button", { name: SPORTS_HEADLINES[4] }).click();
    await continueButton.click();

    const owner = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: sessionError } = await owner.auth.setSession({
      access_token: grant.access_token,
      refresh_token: grant.refresh_token,
    });
    expect(sessionError).toBeNull();

    const inProgress = await pollUntil(async () => {
      const { data, error } = await owner
        .from("flow_sessions")
        .select("id, flow_id, status")
        .eq("user_id", grant.user.id)
        .eq("flow_id", ECHO_FLOW_ID)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        return null;
      }
      return data as SessionRow;
    }, 15_000);

    expect(inProgress.status).toBe("in_progress");

    await pollUntil(async () => {
      const { data, error } = await owner
        .from("flow_interactions")
        .select("id")
        .eq("session_id", inProgress.id);
      if (error || !data || data.length === 0) {
        return null;
      }
      return data;
    }, 15_000);

    await page.goto("/train");
    await expect(page.getByRole("heading", { name: "Train" })).toBeVisible();

    const scored = await pollUntil(async () => {
      const { data: session, error: sessionLookupError } = await owner
        .from("flow_sessions")
        .select("id, status")
        .eq("id", inProgress.id)
        .maybeSingle();
      if (sessionLookupError || session?.status !== "completed") {
        return null;
      }
      const { data: scores, error: scoreError } = await owner
        .from("flow_scores")
        .select("metric_name, metric_value")
        .eq("session_id", inProgress.id);
      if (scoreError || !scores || scores.length === 0) {
        return null;
      }
      return scores as Array<{ metric_name: string; metric_value: number }>;
    }, 15_000);

    expect(clientScorePosts).toBeGreaterThan(0);
    expect(scored).toHaveLength(1);
    expect(scored[0]?.metric_name).toBe("perspective_diversity");
    expect(scored[0]?.metric_value).toBe(0.25);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin.from("flow_sessions").delete().eq("id", inProgress.id);
  });
});
