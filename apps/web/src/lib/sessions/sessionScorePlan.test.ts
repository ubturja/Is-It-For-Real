import { describe, expect, it } from "vitest";
import { getFlow } from "@isitfr/content-config";

import { sessionScorePlan } from "./sessionScorePlan";

describe("sessionScorePlan", () => {
  it("rejects a partial framing run so the owner cannot score mid-flow", () => {
    expect(
      sessionScorePlan({
        flow: getFlow("framing-headlines"),
        recordedStepIds: [],
        status: "in_progress",
        existingScoreCount: 0,
        hasScoringRules: true,
      }),
    ).toBe("reject_incomplete");
  });

  it("writes scores when a BRANCH arm's MEASURE is present", () => {
    expect(
      sessionScorePlan({
        flow: getFlow("framing-headlines"),
        recordedStepIds: ["measure_emotional"],
        status: "in_progress",
        existingScoreCount: 0,
        hasScoringRules: true,
      }),
    ).toBe("write_scores");
  });

  it("only marks complete when rules are absent (stub) or scores already exist", () => {
    expect(
      sessionScorePlan({
        flow: getFlow("experiment-stub"),
        recordedStepIds: ["probe"],
        status: "in_progress",
        existingScoreCount: 0,
        hasScoringRules: false,
      }),
    ).toBe("mark_complete_only");

    expect(
      sessionScorePlan({
        flow: getFlow("echo-chamber"),
        recordedStepIds: ["perspective_diversity"],
        status: "in_progress",
        existingScoreCount: 1,
        hasScoringRules: true,
      }),
    ).toBe("mark_complete_only");
  });

  it("is a no-op when already completed with scores", () => {
    expect(
      sessionScorePlan({
        flow: getFlow("echo-chamber"),
        recordedStepIds: ["perspective_diversity"],
        status: "completed",
        existingScoreCount: 1,
        hasScoringRules: true,
      }),
    ).toBe("noop");
  });

  it("requires both MEASURE diamonds on memory-recall", () => {
    expect(
      sessionScorePlan({
        flow: getFlow("memory-recall"),
        recordedStepIds: ["measure_color_accurate"],
        status: "in_progress",
        existingScoreCount: 0,
        hasScoringRules: true,
      }),
    ).toBe("reject_incomplete");

    expect(
      sessionScorePlan({
        flow: getFlow("memory-recall"),
        recordedStepIds: [
          "measure_color_accurate",
          "measure_action_misleading",
        ],
        status: "in_progress",
        existingScoreCount: 0,
        hasScoringRules: true,
      }),
    ).toBe("write_scores");
  });
});
