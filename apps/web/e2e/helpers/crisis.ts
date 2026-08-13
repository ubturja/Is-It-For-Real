import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Wait until Crisis Mode has hydrated and step one is on screen. */
export async function expectStopStep(page: Page) {
  await expect(page.getByText("Stop", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Pause before you react, reply, or share anything."),
  ).toBeVisible();
}

export async function expectPreserveStep(page: Page) {
  await expect(page.getByText("Preserve evidence")).toBeVisible();
}

export async function expectBranchStep(page: Page) {
  await expect(page.getByText("Choose a path")).toBeVisible();
  await expect(page.getByText("A trusted adult")).toBeVisible();
}

export async function expectTrustedAdultTemplate(page: Page) {
  await expect(page.getByText("Message to a trusted adult")).toBeVisible();
  await expect(page.getByText("[classmate's name]")).toBeVisible();
}

export async function expectResourcesStep(page: Page) {
  await expect(page.getByText("Done for now")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /You're not alone/i }),
  ).toBeVisible();
  await expect(page.getByText("Take It Down (NCMEC)")).toBeVisible();
}

export async function clickContinue(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Advance STOP → PRESERVE → BRANCH → trusted adult TEMPLATE → RESOURCES. */
export async function completeTrustedAdultFlow(page: Page) {
  await expectStopStep(page);
  await clickContinue(page);

  await expectPreserveStep(page);
  await clickContinue(page);

  await expectBranchStep(page);
  await page.getByText("A trusted adult", { exact: true }).click();
  await clickContinue(page);

  await expectTrustedAdultTemplate(page);
  await clickContinue(page);

  await expectResourcesStep(page);
}

/** Ensure zustand/idb-keyval has flushed the crisis session step id. */
export async function waitForPersistedStep(page: Page, stepId: string) {
  await page.waitForFunction(
    async (expectedStepId) => {
      return await new Promise<boolean>((resolve) => {
        const open = indexedDB.open("keyval-store");
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("keyval")) {
            resolve(false);
            return;
          }
          const tx = db.transaction("keyval", "readonly");
          const store = tx.objectStore("keyval");
          const req = store.get("isitfr-crisis-session");
          req.onerror = () => resolve(false);
          req.onsuccess = () => {
            const raw = req.result;
            if (typeof raw !== "string") {
              resolve(false);
              return;
            }
            try {
              const parsed = JSON.parse(raw) as {
                state?: { stepId?: string };
              };
              resolve(parsed.state?.stepId === expectedStepId);
            } catch {
              resolve(false);
            }
          };
        };
      });
    },
    stepId,
    { timeout: 10_000 },
  );
}

/** Wait until Serwist controls the page (production build only). */
export async function waitForServiceWorkerControl(page: Page) {
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) {
      return false;
    }
    const ready = await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) {
      return true;
    }
    // First visit may install without controlling yet — force claim wait.
    return Boolean(ready.active);
  });

  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectStopStep(page);
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
  }
}
