import { expect, test } from "@playwright/test";

const HEADLINE = "Is It For Real?";

test.describe("landing hero typing", () => {
  test.describe("motion allowed (OS setting)", () => {
    test.use({ reducedMotion: "no-preference" });

    test("types the headline without shifting the reserved box", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/");
      const heading = page.getByRole("heading", { level: 1, name: HEADLINE });
      await expect(heading).toBeVisible();

      const live = page.getByTestId("typed-headline-live");
      await expect(live).toBeVisible();

      const first = await heading.boundingBox();
      expect(first).not.toBeNull();

      await expect.poll(async () => (await live.innerText()).length).toBeGreaterThan(0);

      const mid = await heading.boundingBox();
      expect(mid).not.toBeNull();
      expect(mid?.width).toBe(first?.width);
      expect(mid?.height).toBe(first?.height);

      await expect
        .poll(async () => (await live.innerText()).replace(/\s/g, "").length)
        .toBeGreaterThan(3);

      const later = await heading.boundingBox();
      expect(later?.width).toBe(first?.width);
      expect(later?.height).toBe(first?.height);
    });
  });

  test.describe("prefers-reduced-motion (OS setting)", () => {
    test.use({ reducedMotion: "reduce" });

    test("shows the full static headline and never animates", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");

      const prefersReduce = await page.evaluate(
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      expect(prefersReduce).toBe(true);

      await expect(
        page.getByRole("heading", { level: 1, name: HEADLINE }),
      ).toBeVisible();

      const live = page.getByTestId("typed-headline-live");
      const reserve = page.getByTestId("typed-headline-reserve");
      await expect(live).toBeHidden();
      await expect(reserve).toBeVisible();
      await expect(reserve).toContainText(HEADLINE);

      const before = await reserve.innerText();
      await page.waitForTimeout(700);
      await expect(live).toBeHidden();
      expect(await reserve.innerText()).toBe(before);
    });
  });
});
