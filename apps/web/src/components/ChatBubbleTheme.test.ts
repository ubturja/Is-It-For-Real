import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("ChatBubbleTheme", () => {
  const theme = readFileSync(resolve(__dirname, "ChatBubbleTheme.tsx"), "utf8");
  const runner = readFileSync(
    resolve(__dirname, "ExperimentRunner.tsx"),
    "utf8",
  );
  const help = readFileSync(
    resolve(__dirname, "help/HelpFlow.tsx"),
    "utf8",
  );
  const renderer = readFileSync(
    resolve(__dirname, "flow-steps/StepRenderer.tsx"),
    "utf8",
  );
  const machine = readFileSync(
    resolve(__dirname, "../hooks/useFlowMachine.ts"),
    "utf8",
  );

  it("wraps children and does not reimplement step rendering", () => {
    expect(theme).toMatch(/children: ReactNode/);
    expect(theme).not.toMatch(/from ["']@\/components\/flow-steps/);
    expect(theme).not.toMatch(/step\.type/);
    expect(theme).not.toMatch(/STOP|PRESERVE|BRANCH|TEMPLATE|RESOURCES|MEASURE/);
    expect(theme).not.toMatch(/compileFlowToMachine/);
  });

  it("is applied around StepRenderer from ExperimentRunner, not HelpFlow", () => {
    expect(runner).toMatch(/ChatBubbleTheme/);
    expect(runner).toMatch(/StepRenderer/);
    expect(help).not.toMatch(/ChatBubbleTheme/);
    expect(help).toMatch(/useFlowMachine/);
    expect(renderer).not.toMatch(/ChatBubbleTheme|chat-bubble|read-the-room/);
  });

  it("leaves the shared compiler on useFlowMachine for both /help and experiments", () => {
    expect(machine).toMatch(/compileFlowToMachine\(getFlow\(flowId\)\)/);
  });
});
