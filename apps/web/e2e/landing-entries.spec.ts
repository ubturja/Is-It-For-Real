import { expect, test } from "@playwright/test";

import { expectStopStep } from "./helpers/crisis";

test.describe("landing path entries", () => {
  test("body CTAs are keyboard-reachable with a visible focus ring", async ({
    page,
  }) => {
    await page.goto("/");
    const practice = page.getByRole("link", { name: "Start practicing" });
    const help = page
      .getByRole("region", { name: "Choose a path" })
      .getByRole("link", { name: "Get help now" });
    await expect(practice).toBeVisible();
    await expect(help).toBeVisible();

    await practice.focus();
    await expect(practice).toBeFocused();
    const practiceOutline = await practice.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(practiceOutline).not.toBe("none");

    await help.focus();
    await expect(help).toBeFocused();
    const helpOutline = await help.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(helpOutline).not.toBe("none");
  });

  test("Get help now opens Crisis Mode in one tap with no login", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("region", { name: "Choose a path" })
      .getByRole("link", { name: "Get help now" })
      .click();
    await expect(page).toHaveURL(/\/help/);
    await expect(page).not.toHaveURL(/login/);
    await expectStopStep(page);
  });

  test("footer path links are keyboard-reachable", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    const practice = footer.getByRole("link", { name: "Practice" });
    const help = footer.getByRole("link", { name: "Get help now" });
    await practice.focus();
    await expect(practice).toBeFocused();
    await help.focus();
    await expect(help).toBeFocused();
  });
});
