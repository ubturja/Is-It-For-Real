import { test, expect } from "@playwright/test";

import { isSupabaseNetworkRequest } from "./helpers/auth";
import {
  completeTrustedAdultFlow,
  expectBranchStep,
  expectPreserveStep,
  expectResourcesStep,
  expectStopStep,
  clickContinue,
  waitForPersistedStep,
  waitForServiceWorkerControl,
} from "./helpers/crisis";
import { attachCrisisNetworkLog } from "./helpers/crisisNetwork";

test.describe("Crisis Mode /help", () => {
  test("fresh context completes trusted-adult branch to resources", async ({
    page,
  }) => {
    const supabaseRequests: string[] = [];
    page.on("request", (request) => {
      if (isSupabaseNetworkRequest(request.url())) {
        supabaseRequests.push(request.url());
      }
    });

    const response = await page.goto("/help");
    expect(response, "expected a navigation response").not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    expect(response!.request().redirectedFrom()).toBeNull();

    // Auth middleware must not touch /help — stay on crisis entry with no session.
    await expect(page).toHaveURL(/\/help/);
    await expect(page).not.toHaveURL(/\/login/);
    await completeTrustedAdultFlow(page);
    await expect(page).toHaveURL(/\/help/);
    // Prove we never bounced to an auth wall.
    await expect(page.getByText(/sign in|log in|supabase/i)).toHaveCount(0);
    expect(
      supabaseRequests,
      `Crisis Mode must not call Supabase; saw:\n${supabaseRequests.join("\n")}`,
    ).toEqual([]);
  });

  test("offline after first load still renders and completes the flow", async ({
    page,
    context,
  }) => {
    await page.goto("/help");
    await expectStopStep(page);
    await waitForServiceWorkerControl(page);

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });

    await completeTrustedAdultFlow(page);
    await expectResourcesStep(page);
  });

  test("reload after steps 1–2 resumes at branch (step 3)", async ({
    page,
  }) => {
    await page.goto("/help");
    await expectStopStep(page);
    await clickContinue(page);

    await expectPreserveStep(page);
    await clickContinue(page);

    await expectBranchStep(page);
    await waitForPersistedStep(page, "choose_contact");

    await page.reload({ waitUntil: "domcontentloaded" });

    await expectBranchStep(page);
    // Still on step 3 — not back at Stop.
    await expect(page.getByText("Stop", { exact: true })).toHaveCount(0);
  });

  test("online full run fires no unexpected XHR/fetch", async ({ page }) => {
    const log = attachCrisisNetworkLog(page);

    await page.goto("/help");
    await completeTrustedAdultFlow(page);
    // Drain delayed XHR/fetch without networkidle — SW/preload can keep a connection open.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1500)));

    expect(
      log.unexpected(),
      `Crisis Mode must not XHR/fetch after shell load except Open-resource navigation; unexpected:\n${log.unexpected().join("\n")}\ntracked xhr/fetch:\n${log.tracked().join("\n")}`,
    ).toEqual([]);
  });
});
