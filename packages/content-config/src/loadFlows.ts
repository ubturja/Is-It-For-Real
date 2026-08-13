import { validateFlowConfig, type FlowConfig } from "@isitfr/schemas";

declare global {
  interface ImportMeta {
    glob(
      pattern: string,
      options?: { eager?: boolean; import?: string },
    ): Record<string, unknown>;
  }
}

type WebpackContext = {
  keys(): string[];
  (id: string): unknown;
};

function unwrapModule(mod: unknown): unknown {
  if (typeof mod === "object" && mod !== null && "default" in mod) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}

function unwrapAll(modules: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(modules)) {
    result[key] = unwrapModule(value);
  }
  return result;
}

/**
 * Build-time glob of `src/flows/*.v*.json`.
 * Vite/Vitest: `import.meta.glob`. Next.js webpack: `require.context`.
 * Both are compile-time enumerations — a new JSON file is picked up with
 * zero registry edits. Do not add per-flow imports.
 */
function discoverRawFlowModules(): Record<string, unknown> {
  try {
    // Vite statically replaces this call with a map of eager JSON modules.
    const globbed = import.meta.glob("./flows/*.v*.json", { eager: true });
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
    const context = require.context("./flows", false, /\.v.+\.json$/) as WebpackContext;
    const modules: Record<string, unknown> = {};
    for (const key of context.keys()) {
      modules[key] = unwrapModule(context(key));
    }
    if (Object.keys(modules).length > 0) {
      return modules;
    }
  } catch {
    // Vite/Node: require.context is undefined.
  }

  const fromFs = collectViaNodeFs();
  if (fromFs !== null && Object.keys(fromFs).length > 0) {
    return fromFs;
  }

  throw new Error(
    'No flow JSON files discovered under src/flows/ (expected *.v*.json).',
  );
}

/**
 * Last-resort loader for plain Node (no Vite glob, no webpack context).
 * Uses an indirect require so bundlers do not try to package `node:fs`.
 */
function collectViaNodeFs(): Record<string, unknown> | null {
  try {
    const nodeRequire = Function(
      "return typeof require === 'function' ? require : null",
    )() as ((id: string) => unknown) | null;
    if (nodeRequire === null) {
      return null;
    }

    const fs = nodeRequire("node:fs") as {
      readdirSync: (dir: string) => string[];
      readFileSync: (file: string, encoding: string) => string;
    };
    const path = nodeRequire("node:path") as {
      dirname: (p: string) => string;
      join: (...parts: string[]) => string;
    };
    const url = nodeRequire("node:url") as {
      fileURLToPath: (u: string) => string;
    };

    const flowsDir = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      "flows",
    );
    const files = fs
      .readdirSync(flowsDir)
      .filter((name) => /\.v.+\.json$/.test(name));
    if (files.length === 0) {
      return null;
    }

    const modules: Record<string, unknown> = {};
    for (const name of files) {
      const filePath = path.join(flowsDir, name);
      const text = fs.readFileSync(filePath, "utf8");
      try {
        modules[`./flows/${name}`] = JSON.parse(text) as unknown;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid JSON in src/flows/${name}: ${message}`);
      }
    }
    return modules;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid JSON")) {
      throw err;
    }
    return null;
  }
}

/**
 * Validate every discovered module. A single broken file throws — it must
 * fail the build/test run, not disappear from getFlow / listExperiments.
 */
export function buildFlowRegistry(
  modules: Record<string, unknown>,
): Record<string, FlowConfig> {
  const entries = Object.entries(modules);
  if (entries.length === 0) {
    throw new Error(
      'No flow JSON files discovered under src/flows/ (expected *.v*.json).',
    );
  }

  const registry: Record<string, FlowConfig> = {};
  const sources: Record<string, string> = {};

  for (const [source, mod] of entries) {
    let config: FlowConfig;
    try {
      config = validateFlowConfig(unwrapModule(mod));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid flow config in ${source}: ${message}`);
    }

    const existingSource = sources[config.flowId];
    if (existingSource !== undefined) {
      throw new Error(
        `Duplicate flowId "${config.flowId}" in ${source} (already loaded from ${existingSource}).`,
      );
    }

    registry[config.flowId] = config;
    sources[config.flowId] = source;
  }

  return registry;
}

/** Validated flowId → config. Built once at module init from glob discovery. */
export const flowRegistry: Record<string, FlowConfig> = buildFlowRegistry(
  discoverRawFlowModules(),
);
