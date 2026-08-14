import { validateFeedCatalog, type FeedCatalog } from "@isitfr/schemas";

import {
  collectJsonViaNodeFs,
  modulesFromWebpackContext,
  unwrapAll,
  unwrapModule,
  type WebpackContext,
} from "./discoverJson";

function discoverRawFeedModules(): Record<string, unknown> {
  try {
    const globbed = import.meta.glob("./feeds/*.json", { eager: true });
    const unwrapped = unwrapAll(globbed);
    if (Object.keys(unwrapped).length > 0) {
      return unwrapped;
    }
  } catch {
    // webpack: import.meta.glob is not a function.
  }

  try {
    // webpack compile-time glob (arguments must stay literals).
    // @ts-expect-error require.context is a webpack runtime, not in ESM types
    const context = require.context("./feeds", false, /\.json$/) as WebpackContext;
    const modules = modulesFromWebpackContext(context);
    if (Object.keys(modules).length > 0) {
      return modules;
    }
  } catch {
    // Vite/Node: require.context is undefined.
  }

  const fromFs = collectJsonViaNodeFs("feeds", /\.json$/);
  if (fromFs !== null && Object.keys(fromFs).length > 0) {
    return fromFs;
  }

  throw new Error(
    "No feed JSON files discovered under src/feeds/ (expected *.json).",
  );
}

export function buildFeedRegistry(
  modules: Record<string, unknown>,
): Record<string, FeedCatalog> {
  const entries = Object.entries(modules);
  if (entries.length === 0) {
    throw new Error(
      "No feed JSON files discovered under src/feeds/ (expected *.json).",
    );
  }

  const registry: Record<string, FeedCatalog> = {};
  const sources: Record<string, string> = {};

  for (const [source, mod] of entries) {
    let catalog: FeedCatalog;
    try {
      catalog = validateFeedCatalog(unwrapModule(mod));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid feed catalog in ${source}: ${message}`);
    }

    const existingSource = sources[catalog.key];
    if (existingSource !== undefined) {
      throw new Error(
        `Duplicate feed "${catalog.key}" in ${source} (already loaded from ${existingSource}).`,
      );
    }

    registry[catalog.key] = catalog;
    sources[catalog.key] = source;
  }

  return registry;
}

export const feedRegistry: Record<string, FeedCatalog> = buildFeedRegistry(
  discoverRawFeedModules(),
);
