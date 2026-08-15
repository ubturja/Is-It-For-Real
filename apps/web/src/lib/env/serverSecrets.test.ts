import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "../..");

const FORBIDDEN_PUBLIC_PREFIXES = [
  "NEXT_PUBLIC_OPENAI",
  "NEXT_PUBLIC_GROQ",
  "NEXT_PUBLIC_AI_",
  "NEXT_PUBLIC_SUPABASE_SERVICE",
];

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") {
      continue;
    }
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkFiles(full, acc);
    } else if (/\.(ts|tsx|mjs|js)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("server-only secrets", () => {
  it("never exposes the AI SDK key or service role via NEXT_PUBLIC_*", () => {
    const files = walkFiles(SRC_ROOT);
    const leaks: string[] = [];
    for (const file of files) {
      if (file.endsWith("serverSecrets.test.ts")) {
        continue;
      }
      const src = readFileSync(file, "utf8");
      for (const prefix of FORBIDDEN_PUBLIC_PREFIXES) {
        if (src.includes(prefix)) {
          leaks.push(`${relative(SRC_ROOT, file)}: ${prefix}`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it("does not read GROQ_API_KEY from client modules", () => {
    const client = readFileSync(join(SRC_ROOT, "lib/supabase/client.ts"), "utf8");
    expect(client).not.toMatch(/GROQ_API_KEY/);
    expect(client).not.toMatch(/OPENAI_API_KEY/);
    expect(client).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
