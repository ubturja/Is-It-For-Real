import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  loginViaPasswordUi,
  requirePublicSupabaseEnv,
  requireServiceRoleKey,
} from "./helpers/auth";
import { getReportChrome } from "./helpers/content";

const SPORTS_HEADLINES = [
  "Hawks take the cup on a last-minute header",
  "Rookie point guard named starter for Friday",
  "County meet: 800-meter record falls by half a second",
  "Star striker listed day-to-day with ankle sprain",
  "Relay team clips the regional mark by two tenths",
];

type AggregatedScores = {
  framing_bias: number;
  perspective_diversity: number;
};

function isAggregatedScores(value: unknown): value is AggregatedScores {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("framing_bias" in value) || !("perspective_diversity" in value)) {
    return false;
  }
  return (
    typeof value.framing_bias === "number" &&
    typeof value.perspective_diversity === "number"
  );
}

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
  throw new Error("Timed out waiting for aggregated profile scores");
}

test.describe("Profile aggregation", () => {
  test("two experiments populate own aggregated_scores; another user cannot read them", async ({
    page,
  }) => {
    const { url: supabaseUrl, anonKey } = requirePublicSupabaseEnv();
    const serviceRoleKey = requireServiceRoleKey();
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = `e2e-profile-${crypto.randomUUID()}@example.com`;
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

    const otherEmail = `e2e-profile-other-${crypto.randomUUID()}@example.com`;
    const otherPassword = `E2e-${crypto.randomUUID()}-Aa1`;
    const { data: otherCreated, error: otherCreateError } =
      await admin.auth.admin.createUser({
        email: otherEmail,
        password: otherPassword,
        email_confirm: true,
      });
    expect(otherCreateError).toBeNull();
    const otherUserId = otherCreated.user?.id;
    expect(otherUserId).toBeTruthy();

    try {
      await loginViaPasswordUi(page, email, password, "/train/framing-headlines");

      await expect(
        page.getByText("Westbridge council votes to shorten weekend library hours"),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: /Westbridge council votes to shorten weekend library hours/,
        })
        .click();
      await page.getByRole("button", { name: "I trust this one" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: getReportChrome().title }),
      ).toBeVisible();

      await page.goto("/train/echo-chamber");
      await expect(
        page.getByText("A short feed — open what you would tap, then continue."),
      ).toBeVisible();
      const continueButton = page.getByRole("button", { name: "Continue" });
      await page.getByRole("button", { name: SPORTS_HEADLINES[0] }).click();
      await page.getByRole("button", { name: SPORTS_HEADLINES[1] }).click();
      await page.getByRole("button", { name: SPORTS_HEADLINES[2] }).click();
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
      const { data: ownerSession, error: ownerAuthError } =
        await owner.auth.signInWithPassword({ email, password });
      expect(ownerAuthError).toBeNull();
      expect(ownerSession.user?.id).toBe(userId);

      const scores = await pollUntil(async () => {
        const { data, error } = await owner
          .from("profiles")
          .select("aggregated_scores")
          .eq("user_id", userId)
          .maybeSingle();
        if (error || data === null || !("aggregated_scores" in data)) {
          return null;
        }
        if (!isAggregatedScores(data.aggregated_scores)) {
          return null;
        }
        return data.aggregated_scores;
      }, 15_000);

      expect(scores.framing_bias).toBe(0);
      expect(scores.perspective_diversity).toBe(0.25);

      const other = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: otherSignInError } = await other.auth.signInWithPassword({
        email: otherEmail,
        password: otherPassword,
      });
      expect(otherSignInError).toBeNull();

      const { data: hidden, error: hiddenError } = await other
        .from("profiles")
        .select("user_id, aggregated_scores")
        .eq("user_id", userId);
      expect(hiddenError).toBeNull();
      expect(hidden ?? []).toEqual([]);
    } finally {
      await admin.from("flow_sessions").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
      if (otherUserId) {
        await admin.from("profiles").delete().eq("user_id", otherUserId);
        await admin.auth.admin.deleteUser(otherUserId);
      }
    }
  });
});
