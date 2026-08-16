import { expect, test } from "@playwright/test";

import {
  createConfirmedUser,
  createE2EServiceRoleClient,
  deleteUserAndTrainingRows,
  loginViaPasswordUi,
} from "./helpers/auth";
import { expectStopStep } from "./helpers/crisis";
import { expectTrainDashboard } from "./helpers/experiments";
import { expectNoTrainingNav, expectTrainingNav } from "./helpers/nav";

test.describe("Path chrome isolation", () => {
  test("/help shows no Train or Profile navigation", async ({ page }) => {
    await page.goto("/help");
    await expectStopStep(page);
    await expectNoTrainingNav(page);
  });

  test("/train keeps Train, Profile, and Help in the primary nav", async ({
    page,
  }) => {
    const admin = createE2EServiceRoleClient();
    const { email, password, userId } = await createConfirmedUser(
      admin,
      "e2e-nav-chrome-train",
    );
    try {
      await loginViaPasswordUi(page, email, password, "/train");
      await expectTrainDashboard(page);
      await expectTrainingNav(page);
    } finally {
      await deleteUserAndTrainingRows(admin, userId);
    }
  });
});
