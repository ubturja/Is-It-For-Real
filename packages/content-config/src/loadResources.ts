import { validateResourceSet, type ResourceSet } from "@isitfr/schemas";

import {
  collectJsonViaNodeFs,
  modulesFromWebpackContext,
  unwrapAll,
  unwrapModule,
  type WebpackContext,
} from "./discoverJson";

function discoverRawResourceModules(): Record<string, unknown> {
  try {
    const globbed = import.meta.glob("./resources/*.json", { eager: true });
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
    const context = require.context(
      "./resources",
      false,
      /\.json$/,
    ) as WebpackContext;
    const modules = modulesFromWebpackContext(context);
    if (Object.keys(modules).length > 0) {
      return modules;
    }
  } catch {
    // Vite/Node: require.context is undefined.
  }

  const fromFs = collectJsonViaNodeFs("resources", /\.json$/);
  if (fromFs !== null && Object.keys(fromFs).length > 0) {
    return fromFs;
  }

  throw new Error(
    "No resource-set JSON files discovered under src/resources/ (expected *.json).",
  );
}

export function buildResourceSetRegistry(
  modules: Record<string, unknown>,
): Record<string, ResourceSet> {
  const entries = Object.entries(modules);
  if (entries.length === 0) {
    throw new Error(
      "No resource-set JSON files discovered under src/resources/ (expected *.json).",
    );
  }

  const registry: Record<string, ResourceSet> = {};
  const sources: Record<string, string> = {};

  for (const [source, mod] of entries) {
    let set: ResourceSet;
    try {
      set = validateResourceSet(unwrapModule(mod));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid resource set in ${source}: ${message}`);
    }

    const existingSource = sources[set.key];
    if (existingSource !== undefined) {
      throw new Error(
        `Duplicate resource set "${set.key}" in ${source} (already loaded from ${existingSource}).`,
      );
    }

    registry[set.key] = set;
    sources[set.key] = source;
  }

  return registry;
}

export const resourceSetRegistry: Record<string, ResourceSet> =
  buildResourceSetRegistry(discoverRawResourceModules());
