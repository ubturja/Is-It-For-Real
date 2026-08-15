import { expect, test } from "@playwright/test";

import {
  createConfirmedUser,
  createE2EServiceRoleClient,
  deleteUserAndTrainingRows,
  loginViaPasswordUi,
} from "./helpers/auth";
import { expectNoSeriousAxeViolations } from "./helpers/axe";
import { getProfileChrome, getStepChrome } from "./helpers/content";
import { expectStopStep } from "./helpers/crisis";

const STUB_PATH = "/train/experiment-stub";

test.describe("axe-core", () => {
  test("/ has no critical or serious violations", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Is It For Real?" }),
    ).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("/help has no critical or serious violations", async ({ page }) => {
    await page.goto("/help");
    await expectStopStep(page);
    await expectNoSeriousAxeViolations(page);
  });

  test.describe("authenticated training pages", () => {
    test("/train has no critical or serious violations", async ({ page }) => {
      const admin = createE2EServiceRoleClient();
      const { email, password, userId } = await createConfirmedUser(
        admin,
        "e2e-a11y-train",
      );
      try {
        await loginViaPasswordUi(page, email, password, "/train");
        await expect(page.getByRole("heading", { name: "Train" })).toBeVisible();
        await expectNoSeriousAxeViolations(page);
      } finally {
        await deleteUserAndTrainingRows(admin, userId);
      }
    });

    test("/train/[experimentId] has no critical or serious violations", async ({
      page,
    }) => {
      const admin = createE2EServiceRoleClient();
      const { email, password, userId } = await createConfirmedUser(
        admin,
        "e2e-a11y-experiment",
      );
      try {
        await loginViaPasswordUi(page, email, password, STUB_PATH);
        await expect(
          page.getByRole("heading", {
            name: getStepChrome().stepTypes.MEASURE.title,
          }),
        ).toBeVisible();
        await expectNoSeriousAxeViolations(page);
      } finally {
        await deleteUserAndTrainingRows(admin, userId);
      }
    });

    test("/train/profile has no critical or serious violations", async ({
      page,
    }) => {
      const admin = createE2EServiceRoleClient();
      const { email, password, userId } = await createConfirmedUser(
        admin,
        "e2e-a11y-profile",
      );
      try {
        await loginViaPasswordUi(page, email, password, "/train/profile");
        await expect(
          page.getByRole("heading", { name: getProfileChrome().title }),
        ).toBeVisible();
        await expectNoSeriousAxeViolations(page);
      } finally {
        await deleteUserAndTrainingRows(admin, userId);
      }
    });
  });
});
