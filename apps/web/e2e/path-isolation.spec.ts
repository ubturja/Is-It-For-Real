import { expect, test } from "@playwright/test";

import {
  createConfirmedUser,
  createE2EServiceRoleClient,
  deleteUserAndTrainingRows,
  isSupabaseRestWrite,
  loginViaPasswordUi,
} from "./helpers/auth";
import { completeTrustedAdultFlow } from "./helpers/crisis";
import { expectTrainDashboard } from "./helpers/experiments";
import { snapshotPublicRows } from "./helpers/supabaseSnapshot";

test.describe("Cross-path isolation", () => {
  test("Crisis Mode stays login-free and creates no Supabase rows while a training session is live", async ({
    page,
  }) => {
    const admin = createE2EServiceRoleClient();
    const { email, password, userId } = await createConfirmedUser(
      admin,
      "e2e-path-isolation",
    );

    try {
      const grant = await loginViaPasswordUi(page, email, password, "/train");
      expect(grant.user.id).toBe(userId);
      await expectTrainDashboard(page);

      const before = await snapshotPublicRows(admin);

      const restWrites: string[] = [];
      page.on("request", (request) => {
        if (isSupabaseRestWrite(request.url(), request.method())) {
          restWrites.push(`${request.method()} ${request.url()}`);
        }
      });

      await page.getByRole("link", { name: "Help" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/help");
      await expect(page).not.toHaveURL(/\/login/);

      await completeTrustedAdultFlow(page);

      await expect(page).toHaveURL(/\/help/);
      await expect(page.getByText(/sign in|log in/i)).toHaveCount(0);

      expect(
        restWrites,
        `Crisis Mode must not write Supabase REST rows; saw:\n${restWrites.join("\n")}`,
      ).toEqual([]);

      const after = await snapshotPublicRows(admin);
      expect(after).toEqual(before);
    } finally {
      await deleteUserAndTrainingRows(admin, userId);
    }
  });
});
