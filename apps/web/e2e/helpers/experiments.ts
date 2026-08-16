import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import {
  getFeed,
  getFlow,
  getReportChrome,
  getStepChrome,
  hasScoringRules,
} from "./content";

/** The four scored training experiments (one dimension each). */
export const SCORED_EXPERIMENT_IDS = [
  "framing-headlines",
  "echo-chamber",
  "memory-recall",
  "read-the-room",
] as const;

export type ScoredExperimentId = (typeof SCORED_EXPERIMENT_IDS)[number];

export const E2E_REFLECTION = {
  summary: "E2E reflection for this run.",
  strengths: ["You finished the scenario."],
  growthAreas: ["Try another path next time."],
  tone: "supportive" as const,
};

export function assertScoredExperiments(): void {
  for (const flowId of SCORED_EXPERIMENT_IDS) {
    if (!hasScoringRules(flowId)) {
      throw new Error(`Expected scoring rules for ${flowId}`);
    }
  }
}

export async function mockReflectionApi(page: Page): Promise<void> {
  await page.route("**/api/sessions/**/reflect", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(E2E_REFLECTION),
    });
  });
}

export async function openExperimentFromDashboard(
  page: Page,
  flowId: ScoredExperimentId,
): Promise<void> {
  const title = getFlow(flowId).title;
  await page.getByRole("link", { name: new RegExp(escapeRegExp(title)) }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`/train/${flowId}`);
}

export async function expectTrainDashboard(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Train" })).toBeVisible();
  await expect(page.getByText("Framing", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Echo", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Memory", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Read the Room", { exact: true })).toHaveCount(0);
}

export async function expectReflectionReport(page: Page): Promise<void> {
  const chrome = getReportChrome();
  await expect(page.getByRole("heading", { name: chrome.title })).toBeVisible();
  await expect(page.getByText(chrome.loading)).toHaveCount(0);
}

export async function backToScenarios(page: Page): Promise<void> {
  await page.getByRole("link", { name: getReportChrome().back }).click();
  await expectTrainDashboard(page);
}

export async function clickContinue(page: Page): Promise<void> {
  await page.getByRole("button", { name: getStepChrome().actions.continue }).click();
}

export async function completeLinearMeasure(page: Page): Promise<void> {
  await expect(page.getByText("Measure", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(getStepChrome().stepTypes.MEASURE.title, { exact: true }),
  ).toBeVisible();
  await clickContinue(page);
}

export async function pickBranchOption(
  page: Page,
  flowId: string,
  stepId: string,
  value: string,
): Promise<void> {
  const label = optionLabel(flowId, stepId, value);
  await expect(page.getByText(label, { exact: true })).toBeVisible();
  await page.getByText(label, { exact: true }).click();
  await clickContinue(page);
}

export async function completeFramingHeadlines(page: Page): Promise<void> {
  const headline = articleHeadline("neutral");
  await expect(page.getByText(headline)).toBeVisible();
  await page.getByRole("button", { name: new RegExp(escapeRegExp(headline)) }).click();
  await page.getByRole("button", { name: articleActionLabel("trust") }).click();
  await completeLinearMeasure(page);
}

export async function completeEchoChamber(page: Page): Promise<void> {
  const flow = getFlow("echo-chamber");
  await expect(page.getByText(flow.steps.perspective_diversity?.prompt ?? "")).toBeVisible();
  await expect(page.getByText("Measure", { exact: true })).toHaveCount(0);

  const continueButton = page.getByRole("button", {
    name: getStepChrome().actions.continue,
  });
  await expect(continueButton).toBeDisabled();

  for (const headline of sportsHeadlines()) {
    await page.getByRole("button", { name: headline }).click();
  }

  await expect(continueButton).toBeEnabled();
  await continueButton.click();
}

export async function completeMemoryRecall(page: Page): Promise<void> {
  const flow = getFlow("memory-recall");
  await expect(page.getByText(flow.steps.watch?.prompt ?? "")).toBeVisible();
  await clickContinue(page);

  await expect(page.getByText(flow.steps.wait?.prompt ?? "")).toBeVisible();
  const continueButton = page.getByRole("button", {
    name: getStepChrome().actions.continue,
  });
  await expect(continueButton).toBeEnabled({ timeout: 15_000 });
  await continueButton.click();

  await pickBranchOption(page, "memory-recall", "color", "pink");
  await completeLinearMeasure(page);
  await pickBranchOption(page, "memory-recall", "action", "closeup");
  await completeLinearMeasure(page);
}

export async function completeReadTheRoom(page: Page): Promise<void> {
  const flow = getFlow("read-the-room");
  await expect(page.getByText(flow.steps.pause?.prompt ?? "")).toBeVisible();
  await clickContinue(page);

  await expect(page.getByText(flow.steps.save_thread?.prompt ?? "")).toBeVisible();
  await clickContinue(page);

  await pickBranchOption(page, "read-the-room", "first_reply", "verify");
  await expect(page.getByText("Measure", { exact: true })).toHaveCount(0);
  await expect(page.getByText(flow.steps.who?.prompt ?? "")).toBeVisible();
  await pickBranchOption(page, "read-the-room", "who", "adult");

  await expect(
    page.getByText(flow.steps.template_group?.prompt ?? ""),
  ).toBeVisible();
  await clickContinue(page);
}

export async function completeScoredExperiment(
  page: Page,
  flowId: ScoredExperimentId,
): Promise<void> {
  switch (flowId) {
    case "framing-headlines":
      await completeFramingHeadlines(page);
      break;
    case "echo-chamber":
      await completeEchoChamber(page);
      break;
    case "memory-recall":
      await completeMemoryRecall(page);
      break;
    case "read-the-room":
      await completeReadTheRoom(page);
      break;
  }
  await expectReflectionReport(page);
}

function optionLabel(flowId: string, stepId: string, value: string): string {
  const option = getFlow(flowId).steps[stepId]?.options?.find(
    (entry) => entry.value === value,
  );
  if (option === undefined) {
    throw new Error(`${flowId}.${stepId} has no option "${value}"`);
  }
  return option.label;
}

function articleHeadline(variantId: string): string {
  const variants = articleCompareVariants();
  const variant = variants.find((entry) => entry.id === variantId);
  if (variant === undefined) {
    throw new Error(`framing-headlines compare is missing variant "${variantId}"`);
  }
  return variant.headline;
}

function articleActionLabel(actionValue: string): string {
  const actions = articleCompareActions();
  const action = actions.find((entry) => entry.value === actionValue);
  if (action === undefined) {
    throw new Error(`framing-headlines compare is missing action "${actionValue}"`);
  }
  return action.label;
}

function articleCompareVariants(): Array<{ id: string; headline: string }> {
  const payload = getFlow("framing-headlines").steps.compare?.payload;
  if (!isRecord(payload) || !Array.isArray(payload.variants)) {
    throw new Error("framing-headlines compare payload.variants is missing");
  }
  return payload.variants.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.headline !== "string"
    ) {
      throw new Error("framing-headlines variant is missing id/headline");
    }
    return { id: entry.id, headline: entry.headline };
  });
}

function articleCompareActions(): Array<{ value: string; label: string }> {
  const payload = getFlow("framing-headlines").steps.compare?.payload;
  if (!isRecord(payload) || !Array.isArray(payload.actions)) {
    throw new Error("framing-headlines compare payload.actions is missing");
  }
  return payload.actions.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.value !== "string" ||
      typeof entry.label !== "string"
    ) {
      throw new Error("framing-headlines action is missing value/label");
    }
    return { value: entry.value, label: entry.label };
  });
}

function sportsHeadlines(): string[] {
  const sports = getFeed("echo-chamber").items.filter((item) =>
    item.topics.includes("sports"),
  );
  if (sports.length < 5) {
    throw new Error("echo-chamber feed needs at least 5 sports headlines");
  }
  return sports.slice(0, 5).map((item) => item.headline);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
