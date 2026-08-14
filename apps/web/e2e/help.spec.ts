import { test, expect } from "@playwright/test";

import { isSupabaseNetworkRequest } from "./helpers/auth";
import { getStepChrome } from "./helpers/content";
import {
  completeTrustedAdultFlow,
  expectBranchStep,
  expectPreserveStep,
  expectResourcesStep,
  expectStaticTrustedAdultTemplate,
  expectStopStep,
  clickContinue,
  goToTrustedAdultTemplate,
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

  test("offline template step renders the static fallback instantly", async ({
    page,
    context,
  }) => {
    await page.goto("/help");
    await expectStopStep(page);
    await waitForServiceWorkerControl(page);

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
    });

    await goToTrustedAdultTemplate(page);

    const started = Date.now();
    await expectStaticTrustedAdultTemplate(page);
    expect(Date.now() - started).toBeLessThan(1_500);
    await expect(
      page.getByRole("button", {
        name: getStepChrome().stepTypes.TEMPLATE.personalize,
      }),
    ).toBeDisabled();
  });

  test("loading TemplateStep online does not personalize until the user taps", async ({
    page,
  }) => {
    const personalizePosts: string[] = [];
    await page.route("**/api/crisis/personalize-template", async (route) => {
      personalizePosts.push(route.request().postData() ?? "");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Message to a trusted adult",
          body: "Hi {{name}}, I need your help with something that happened.",
        }),
      });
    });

    await page.goto("/help");
    await goToTrustedAdultTemplate(page);
    await expectStaticTrustedAdultTemplate(page);
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 1500)),
    );
    expect(personalizePosts).toEqual([]);

    await page
      .getByRole("button", {
        name: getStepChrome().stepTypes.TEMPLATE.personalize,
      })
      .click();
    await expect.poll(() => personalizePosts.length).toBeGreaterThan(0);
  });

  test("online personalize keeps the typed name off the wire and on screen", async ({
    page,
  }) => {
    const postedBodies: string[] = [];
    await page.route("**/api/crisis/personalize-template", async (route) => {
      postedBodies.push(route.request().postData() ?? "");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Message to a trusted adult",
          body: "Hi {{name}}, I need your help with something that happened.",
        }),
      });
    });

    await page.goto("/help");
    await goToTrustedAdultTemplate(page);
    await expectStaticTrustedAdultTemplate(page);
    expect(postedBodies).toEqual([]);

    await page
      .getByLabel(getStepChrome().stepTypes.TEMPLATE.nameLabel)
      .fill("Alex Rivera");
    await page
      .getByRole("button", {
        name: getStepChrome().stepTypes.TEMPLATE.personalize,
      })
      .click();
    await expect(
      page.getByText(
        "Hi Alex Rivera, I need your help with something that happened.",
      ),
    ).toBeVisible();

    expect(postedBodies.length).toBeGreaterThan(0);
    for (const body of postedBodies) {
      expect(body).not.toContain("Alex Rivera");
      expect(body).not.toMatch(/"name"/);
    }
    await expect(page.getByText("[classmate's name]")).toHaveCount(0);
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
