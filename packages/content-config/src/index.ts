import type {
  FeedCatalog,
  FeedPost,
  FlowConfig,
  MessageTemplate,
  ResourceLink,
  ResourceSet,
  ScoringRule,
  ScoringRules,
} from "@isitfr/schemas";

import { feedRegistry } from "./loadFeeds";
import { flowRegistry } from "./loadFlows";
import { resourceSetRegistry } from "./loadResources";
import { scoringRuleRegistry } from "./loadScoringRules";
import { messageTemplateRegistry } from "./loadTemplates";

const DEFAULT_LOCALE = "en";

/** Listing fields for the /train dashboard — never includes scoring spoilers. */
export type ExperimentSummary = {
  flowId: string;
  title: string;
  track: string;
  teaser: string;
};

/**
 * Load a flow by id from the glob-discovered, validated registry.
 * Content lives only in versioned JSON under src/flows — never hardcode it in apps.
 */
export function getFlow(flowId: string): FlowConfig {
  const config = flowRegistry[flowId];
  if (config === undefined) {
    throw new Error(`Unknown flowId: "${flowId}"`);
  }
  return config;
}

/**
 * List flows from the glob-discovered registry (config-driven — not Supabase).
 * Pass `type: "experiment"` for the /train dashboard.
 */
export function listFlows(filter?: {
  type?: FlowConfig["type"];
}): FlowConfig[] {
  const flows = Object.values(flowRegistry).sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  if (filter?.type === undefined) {
    return flows;
  }
  return flows.filter((flow) => flow.type === filter.type);
}

/**
 * Experiment cards for /train: title, track, teaser only (no metric spoilers).
 */
export function listExperiments(): ExperimentSummary[] {
  return listFlows({ type: "experiment" })
    .filter((flow) => flow.listed !== false)
    .map((flow) => ({
      flowId: flow.flowId,
      title: flow.title,
      // Schema requires these on experiment flows.
      track: flow.track as string,
      teaser: flow.teaser as string,
    }));
}

export function hasMessageTemplate(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(messageTemplateRegistry, key);
}

/**
 * Load a static message template by key (and optional locale).
 * Bundled content only — no network or LLM. Falls back to `en` when the
 * requested locale is missing.
 */
export function getMessageTemplate(
  key: string,
  locale: string = DEFAULT_LOCALE,
): MessageTemplate {
  const byLocale = messageTemplateRegistry[key];
  if (byLocale === undefined) {
    throw new Error(`Unknown template key: "${key}"`);
  }

  const exact = byLocale[locale];
  if (exact) {
    return exact;
  }

  const fallback = byLocale[DEFAULT_LOCALE];
  if (fallback === undefined) {
    throw new Error(
      `No template body for key "${key}" (locale "${locale}" or "${DEFAULT_LOCALE}")`,
    );
  }
  return fallback;
}

/**
 * Load a static resource set by key.
 * Bundled content only — no network, region detection, or LLM.
 */
export function getResources(setKey: string): ResourceSet {
  const set = resourceSetRegistry[setKey];
  if (set === undefined) {
    throw new Error(`Unknown resource set: "${setKey}"`);
  }
  return set;
}

/**
 * Load a static feed catalog by key (Echo Chamber items, etc.).
 * Bundled content only — not inlined in flow JSON.
 */
export function getFeed(feedKey: string): FeedCatalog {
  const catalog = feedRegistry[feedKey];
  if (catalog === undefined) {
    throw new Error(`Unknown feed: "${feedKey}"`);
  }
  return catalog;
}

/**
 * Load scoring rules for a flow (how to combine MEASURE observations).
 * Missing file throws — stubs without rules are checked via `hasScoringRules`.
 */
export function getScoringRules(flowId: string): ScoringRules {
  const rules = scoringRuleRegistry[flowId];
  if (rules === undefined) {
    throw new Error(`Unknown scoring rules for flowId: "${flowId}"`);
  }
  return rules;
}

export function hasScoringRules(flowId: string): boolean {
  return Object.prototype.hasOwnProperty.call(scoringRuleRegistry, flowId);
}

export function profileAggregationFor(
  metric: string,
): ScoringRule["aggregation"] {
  for (const rules of Object.values(scoringRuleRegistry)) {
    const rule = rules.find((entry) => entry.metric === metric);
    if (rule !== undefined) {
      return rule.acrossSessions ?? "average";
    }
  }
  return "average";
}

export type {
  FeedCatalog,
  FeedPost,
  FlowConfig,
  MessageTemplate,
  ResourceLink,
  ResourceSet,
  ScoringRules,
};
export { getStepChrome, stepChrome } from "./stepChrome";
export { getProfileChrome, profileChrome } from "./profileChrome";
export { getReportChrome, reportChrome } from "./reportChrome";
export { getDashboardChrome, dashboardChrome } from "./dashboardChrome";
export type {
  StepChrome,
  ProfileChrome,
  ReportChrome,
  DashboardChrome,
} from "@isitfr/schemas";
