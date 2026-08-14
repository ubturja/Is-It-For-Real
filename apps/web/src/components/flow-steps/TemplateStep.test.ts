import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("TemplateStep personalize enhancement", () => {
  const src = readFileSync(resolve(__dirname, "TemplateStep.tsx"), "utf8");

  it("starts from the static template and silently ignores personalize failures", () => {
    expect(src).toMatch(/getMessageTemplate/);
    expect(src).toMatch(/requestPersonalizedTemplate/);
    expect(src).toMatch(/navigator\.onLine/);
    expect(src).toMatch(/PERSONALIZE_CLIENT_TIMEOUT_MS/);
    expect(src).toMatch(/Silent: keep the P3\.3 static template/);
    expect(src).toMatch(/applyLocalName/);
    expect(src).toMatch(/const onPersonalize = useCallback/);
    expect(src).toMatch(/onClick=\{onPersonalize\}/);
    expect(src).toMatch(/chrome\.stepTypes\.TEMPLATE\.personalize/);
    expect(src).toMatch(/disabled=\{!template \|\| !online\}/);
    expect(src.indexOf("requestPersonalizedTemplate(template.key")).toBeGreaterThan(
      src.indexOf("const onPersonalize"),
    );
    expect(src).not.toMatch(/context:\s*\{/);
    expect(src).not.toMatch(/debouncedName/);
    expect(src).not.toMatch(/AI failed/i);
    expect(src).not.toMatch(/destructive/);
    expect(src).not.toMatch(/text-destructive/);
  });
});
