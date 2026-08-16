import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Training-path primary nav — must not appear on /help. */
export async function expectTrainingNav(page: Page): Promise<void> {
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Train", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Profile", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Help", exact: true })).toBeVisible();
}

/** Crisis Mode must not expose training-path navigation. */
export async function expectNoTrainingNav(page: Page): Promise<void> {
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Train", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="/train"]')).toHaveCount(0);
  await expect(page.locator('a[href="/train/profile"]')).toHaveCount(0);
}
