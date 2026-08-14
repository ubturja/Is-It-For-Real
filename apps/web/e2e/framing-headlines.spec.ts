import { expect, test } from "@playwright/test";

import {
  createConfirmedUser,
  createE2EServiceRoleClient,
  deleteUserAndTrainingRows,
  loginViaPasswordUi,
} from "./helpers/auth";
import { getFlow, getReportChrome } from "./helpers/content";
import { mockReflectionApi } from "./helpers/experiments";
import { pollUntil } from "./helpers/poll";

const FRAMING_PATH = "/train/framing-headlines";
const FRAMING_FLOW_ID = "framing-headlines";

const BRANCHES = [
  { variantId: "neutral", expected: 0 },
  { variantId: "emotional", expected: 0.5 },
  { variantId: "political", expected: 1 },
] as const;

function articleHeadline(variantId: string): string {
  const payload = getFlow(FRAMING_FLOW_ID).steps.compare?.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    !Array.isArray(payload.variants)
  ) {
    throw new Error("framing-headlines compare payload.variants is missing");
  }
  const variant = payload.variants.find((entry) => {
    return (
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      entry.id === variantId
    );
  });
  if (
    typeof variant !== "object" ||
    variant === null ||
    !("headline" in variant) ||
    typeof variant.headline !== "string"
  ) {
    throw new Error(`missing headline for ${variantId}`);
  }
  return variant.headline;
}

function trustLabel(): string {
  const payload = getFlow(FRAMING_FLOW_ID).steps.compare?.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    !Array.isArray(payload.actions)
  ) {
    throw new Error("framing-headlines compare payload.actions is missing");
  }
  const action = payload.actions.find((entry) => {
    return (
      typeof entry === "object" &&
      entry !== null &&
      "value" in entry &&
      entry.value === "trust"
    );
  });
  if (
    typeof action !== "object" ||
    action === null ||
    !("label" in action) ||
    typeof action.label !== "string"
  ) {
    throw new Error("missing trust action label");
  }
  return action.label;
}

test.describe("Framing headlines scoring range", () => {
  test("all three branches write framing_bias in [0, 1]; profile rollup stays in range", async ({
    page,
  }) => {
    const admin = createE2EServiceRoleClient();
    const { email, password, userId } = await createConfirmedUser(
      admin,
      "e2e-framing-range",
    );

    try {
      await mockReflectionApi(page);
      await loginViaPasswordUi(page, email, password, FRAMING_PATH);

      const sessionScores: number[] = [];
      const seenSessionIds = new Set<string>();

      for (const branch of BRANCHES) {
        await expect(
          page.getByText(getFlow(FRAMING_FLOW_ID).steps.compare?.prompt ?? ""),
        ).toBeVisible();

        const headline = articleHeadline(branch.variantId);
        await page.getByRole("button", { name: headline }).click();
        await page.getByRole("button", { name: trustLabel() }).click();
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(
          page.getByRole("heading", { name: getReportChrome().title }),
        ).toBeVisible();

        const score = await pollUntil(
          async () => {
            const { data, error } = await admin
              .from("flow_sessions")
              .select("id")
              .eq("user_id", userId)
              .eq("flow_id", FRAMING_FLOW_ID)
              .eq("status", "completed")
              .order("started_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (
              error ||
              !data ||
              typeof data.id !== "string" ||
              seenSessionIds.has(data.id)
            ) {
              return null;
            }
            const { data: rows, error: scoreError } = await admin
              .from("flow_scores")
              .select("metric_value")
              .eq("session_id", data.id)
              .eq("metric_name", "framing_bias");
            const value = rows?.[0]?.metric_value;
            if (scoreError || typeof value !== "number") {
              return null;
            }
            seenSessionIds.add(data.id);
            return value;
          },
          15_000,
          `Timed out waiting for framing_bias after ${branch.variantId}`,
        );

        expect(score).toBe(branch.expected);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
        sessionScores.push(score);

        await page.goto(FRAMING_PATH);
      }

      expect(sessionScores).toEqual([0, 0.5, 1]);

      const aggregated = await pollUntil(
        async () => {
          const { data: scoreRows, error: scoreListError } = await admin
            .from("flow_scores")
            .select("metric_value, session_id")
            .eq("metric_name", "framing_bias");
          if (scoreListError || scoreRows === null) {
            return null;
          }
          const { data: sessions, error: sessionListError } = await admin
            .from("flow_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("flow_id", FRAMING_FLOW_ID)
            .eq("status", "completed");
          if (sessionListError || sessions === null) {
            return null;
          }
          const sessionIds = new Set(
            sessions
              .map((row) => row.id)
              .filter((id): id is string => typeof id === "string"),
          );
          const own = scoreRows.filter(
            (row) =>
              typeof row.session_id === "string" &&
              sessionIds.has(row.session_id) &&
              typeof row.metric_value === "number",
          );
          if (own.length < BRANCHES.length) {
            return null;
          }
          const { data, error } = await admin
            .from("profiles")
            .select("aggregated_scores")
            .eq("user_id", userId)
            .maybeSingle();
          if (error || data === null) {
            return null;
          }
          const scores = data.aggregated_scores;
          if (
            typeof scores !== "object" ||
            scores === null ||
            !("framing_bias" in scores)
          ) {
            return null;
          }
          const value = scores.framing_bias;
          return typeof value === "number" ? value : null;
        },
        15_000,
        "Timed out waiting for aggregated framing_bias",
      );

      expect(aggregated).toBe(0.5);
      expect(aggregated).toBeGreaterThanOrEqual(0);
      expect(aggregated).toBeLessThanOrEqual(1);
    } finally {
      await deleteUserAndTrainingRows(admin, userId);
    }
  });
});
