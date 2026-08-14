import { expect, test } from "@playwright/test";

import { getStepChrome } from "./helpers/content";
import {
  disablePlaywrightMouse,
  expectBranchStep,
  expectPreserveStep,
  expectResourcesStep,
  expectStepTypeNotColorOnly,
  expectStopStep,
  expectTrustedAdultTemplate,
  keyboardContinue,
  tabUntilFocused,
} from "./helpers/crisis";

test.describe("Crisis Mode keyboard-only", () => {
  test("full trusted-adult run with mouse disabled, color cues paired with icon and label", async ({
    page,
  }) => {
    disablePlaywrightMouse(page);
    const chrome = getStepChrome();

    await page.goto("/help");
    await expectStopStep(page);
    await expectStepTypeNotColorOnly(
      page,
      "STOP",
      chrome.stepTypes.STOP.title,
    );
    await keyboardContinue(page);

    await expectPreserveStep(page);
    await expectStepTypeNotColorOnly(
      page,
      "PRESERVE",
      chrome.stepTypes.PRESERVE.title,
    );
    await keyboardContinue(page);

    await expectBranchStep(page);
    await expectStepTypeNotColorOnly(
      page,
      "BRANCH",
      chrome.stepTypes.BRANCH.title,
    );
    const trustedAdult = page.getByRole("radio", { name: "A trusted adult" });
    await tabUntilFocused(page, trustedAdult);
    await page.keyboard.press("Space");
    await expect(trustedAdult).toBeChecked();
    await keyboardContinue(page);

    await expectTrustedAdultTemplate(page);
    await expectStepTypeNotColorOnly(
      page,
      "TEMPLATE",
      chrome.stepTypes.TEMPLATE.titleFallback,
    );
    await keyboardContinue(page);

    await expectResourcesStep(page);
    await expectStepTypeNotColorOnly(
      page,
      "RESOURCES",
      chrome.stepTypes.RESOURCES.titleFallback,
    );
    const finish = page.getByRole("button", {
      name: chrome.actions.finish,
    });
    await tabUntilFocused(page, finish);
    await expect(finish).toBeEnabled();
  });
});
