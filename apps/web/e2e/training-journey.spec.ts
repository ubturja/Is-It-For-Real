import { expect, test } from "@playwright/test";

import {
  createConfirmedUser,
  createE2EServiceRoleClient,
  deleteUserAndTrainingRows,
  loginViaPasswordUi,
} from "./helpers/auth";
import { getFlow, getProfileChrome, metricForFlow } from "./helpers/content";
import {
  SCORED_EXPERIMENT_IDS,
  assertScoredExperiments,
  backToScenarios,
  completeScoredExperiment,
  expectTrainDashboard,
  mockReflectionApi,
  openExperimentFromDashboard,
} from "./helpers/experiments";
import { pollUntil } from "./helpers/poll";

test.describe("Training-path journey", () => {
  test.describe.configure({ timeout: 240_000 });

  test("login, complete all 4 experiments, view each report, radar shows 4 dimensions", async ({
    page,
  }) => {
    assertScoredExperiments();
    const admin = createE2EServiceRoleClient();
    const { email, password, userId } = await createConfirmedUser(
      admin,
      "e2e-train-journey",
    );

    try {
      await mockReflectionApi(page);
      await loginViaPasswordUi(page, email, password, "/train");
      await expectTrainDashboard(page);

      for (const flowId of SCORED_EXPERIMENT_IDS) {
        await openExperimentFromDashboard(page, flowId);
        await completeScoredExperiment(page, flowId);
        await backToScenarios(page);
      }

      await pollUntil(
        async () => {
          const { data, error } = await admin
            .from("profiles")
            .select("aggregated_scores")
            .eq("user_id", userId)
            .maybeSingle();
          if (error || data === null) {
            return null;
          }
          const scores = data.aggregated_scores;
          if (typeof scores !== "object" || scores === null) {
            return null;
          }
          for (const flowId of SCORED_EXPERIMENT_IDS) {
            if (!(metricForFlow(flowId) in scores)) {
              return null;
            }
          }
          return scores;
        },
        15_000,
        "Timed out waiting for all 4 experiment dimensions on the profile",
      );

      await page.getByRole("link", { name: "Your profile" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/train/profile");

      const chrome = getProfileChrome();
      await expect(page.getByRole("heading", { name: chrome.title })).toBeVisible();
      await expect(page.getByText(chrome.empty.title)).toHaveCount(0);
      await expect(page.locator(".recharts-wrapper")).toHaveCount(1);

      for (const flowId of SCORED_EXPERIMENT_IDS) {
        const track = getFlow(flowId).track;
        expect(track, `${flowId} must have a track label`).toBeTruthy();
        await expect(
          page.getByRole("listitem").filter({
            hasText: new RegExp(`^${escapeRegExp(track ?? "")}:`),
          }),
        ).toBeVisible();
      }
    } finally {
      await deleteUserAndTrainingRows(admin, userId);
    }
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
