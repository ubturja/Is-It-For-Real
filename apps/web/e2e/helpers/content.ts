import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Playwright compiles e2e as CJS, so `@isitfr/content-config` (import.meta.glob)
 * cannot be imported here. Read the same JSON files the app loads.
 */
const contentRoot = join(
  process.cwd(),
  "../../packages/content-config/src",
);

export type FlowOption = {
  label: string;
  value: string;
  next: string;
};

export type FlowStep = {
  type: string;
  prompt: string;
  options?: FlowOption[];
  payload?: Record<string, unknown>;
};

export type FlowFile = {
  flowId: string;
  title: string;
  track?: string;
  teaser?: string;
  steps: Record<string, FlowStep>;
};

export type ReportChromeFile = {
  title: string;
  strengths: string;
  growthAreas: string;
  back: string;
  loading: string;
};

export type ProfileChromeFile = {
  title: string;
  empty: { title: string; body: string; action: string };
};

export type StepChromeFile = {
  stepTypes: {
    STOP: { title: string };
    PRESERVE: { title: string };
    BRANCH: { title: string };
    MEASURE: { title: string };
    TEMPLATE: { titleFallback: string };
    RESOURCES: { eyebrow: string; titleFallback: string };
  };
  actions: { continue: string; finish: string };
};

export type FeedFile = {
  key: string;
  items: Array<{ id: string; topics: string[]; headline: string }>;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(join(contentRoot, relativePath), "utf8"),
  ) as T;
}

export function getFlow(flowId: string): FlowFile {
  return readJson<FlowFile>(`flows/${flowId}.v1.json`);
}

export function getReportChrome(): ReportChromeFile {
  return readJson<ReportChromeFile>("chrome/reportChrome.en.json");
}

export function getProfileChrome(): ProfileChromeFile {
  return readJson<ProfileChromeFile>("chrome/profileChrome.en.json");
}

export function getStepChrome(): StepChromeFile {
  return readJson<StepChromeFile>("chrome/stepChrome.en.json");
}

export function getFeed(feedKey: string): FeedFile {
  return readJson<FeedFile>(`feeds/${feedKey}.json`);
}

export function hasScoringRules(flowId: string): boolean {
  return existsSync(join(contentRoot, `scoring-rules/${flowId}.v1.json`));
}

export function metricForFlow(flowId: string): string {
  const rules = readJson<Array<{ metric: string }>>(
    `scoring-rules/${flowId}.v1.json`,
  );
  const metric = rules[0]?.metric;
  if (metric === undefined || metric.trim() === "") {
    throw new Error(`No scoring-rule metric for ${flowId}`);
  }
  return metric;
}
