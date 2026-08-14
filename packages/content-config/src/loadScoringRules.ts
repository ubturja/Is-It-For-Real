import { validateScoringRules, type ScoringRules } from "@isitfr/schemas";

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

const RULE_FILENAME_RE = /^(.+)\.v.+\.json$/;

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

function flowIdFromSource(source: string): string {
  const base = source.split("/").pop() ?? source;
  const match = RULE_FILENAME_RE.exec(base);
  if (match === null || match[1] === undefined) {
    throw new Error(
      `Scoring-rules filename must be {flowId}.v{version}.json (got "${source}")`,
    );
  }
  return match[1];
}

/**
 * Build-time glob of `src/scoring-rules/*.v*.json`.
 * Vite/Vitest: `import.meta.glob`. Next.js webpack: `require.context`.
 * Do not add per-experiment imports.
 */
function discoverRawRuleModules(): Record<string, unknown> {
  try {
    const globbed = import.meta.glob("./scoring-rules/*.v*.json", {
      eager: true,
    });
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
      "./scoring-rules",
      false,
      /\.v.+\.json$/,
    ) as WebpackContext;
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
    "No scoring-rules JSON files discovered under src/scoring-rules/ (expected *.v*.json).",
  );
}

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

    const rulesDir = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      "scoring-rules",
    );
    const files = fs
      .readdirSync(rulesDir)
      .filter((name) => /\.v.+\.json$/.test(name));
    if (files.length === 0) {
      return null;
    }

    const modules: Record<string, unknown> = {};
    for (const name of files) {
      const filePath = path.join(rulesDir, name);
      const text = fs.readFileSync(filePath, "utf8");
      try {
        modules[`./scoring-rules/${name}`] = JSON.parse(text) as unknown;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid JSON in src/scoring-rules/${name}: ${message}`);
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

export function buildScoringRuleRegistry(
  modules: Record<string, unknown>,
): Record<string, ScoringRules> {
  const entries = Object.entries(modules);
  if (entries.length === 0) {
    throw new Error(
      "No scoring-rules JSON files discovered under src/scoring-rules/ (expected *.v*.json).",
    );
  }

  const registry: Record<string, ScoringRules> = {};
  const sources: Record<string, string> = {};

  for (const [source, mod] of entries) {
    const flowId = flowIdFromSource(source);
    let rules: ScoringRules;
    try {
      rules = validateScoringRules(unwrapModule(mod));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid scoring rules in ${source}: ${message}`);
    }

    const existingSource = sources[flowId];
    if (existingSource !== undefined) {
      throw new Error(
        `Duplicate scoring rules for flowId "${flowId}" in ${source} (already loaded from ${existingSource}).`,
      );
    }

    registry[flowId] = rules;
    sources[flowId] = source;
  }

  return registry;
}

/** Validated flowId → rules. Built once at module init from glob discovery. */
export const scoringRuleRegistry: Record<string, ScoringRules> =
  buildScoringRuleRegistry(discoverRawRuleModules());
