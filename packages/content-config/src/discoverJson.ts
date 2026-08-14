declare global {
  interface ImportMeta {
    glob(
      pattern: string,
      options?: { eager?: boolean; import?: string },
    ): Record<string, unknown>;
  }
}

export type WebpackContext = {
  keys(): string[];
  (id: string): unknown;
};

export function unwrapModule(mod: unknown): unknown {
  if (typeof mod === "object" && mod !== null && "default" in mod) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}

export function unwrapAll(modules: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(modules)) {
    result[key] = unwrapModule(value);
  }
  return result;
}

export function modulesFromWebpackContext(
  context: WebpackContext,
): Record<string, unknown> {
  const modules: Record<string, unknown> = {};
  for (const key of context.keys()) {
    modules[key] = unwrapModule(context(key));
  }
  return modules;
}

/**
 * Last-resort loader for plain Node (no Vite glob, no webpack context).
 * Uses an indirect require so bundlers do not try to package `node:fs`.
 */
export function collectJsonViaNodeFs(
  dirName: string,
  filenameRe: RegExp,
): Record<string, unknown> | null {
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

    const dir = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      dirName,
    );
    const files = fs.readdirSync(dir).filter((name) => filenameRe.test(name));
    if (files.length === 0) {
      return null;
    }

    const modules: Record<string, unknown> = {};
    for (const name of files) {
      const filePath = path.join(dir, name);
      const text = fs.readFileSync(filePath, "utf8");
      try {
        modules[`./${dirName}/${name}`] = JSON.parse(text) as unknown;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid JSON in src/${dirName}/${name}: ${message}`);
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
