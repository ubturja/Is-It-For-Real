import { describe, expect, it } from "vitest";

import { scoresForSession, toFlowInteractions } from "./scoreSession";
import { getFlow } from "@isitfr/content-config";

describe("toFlowInteractions", () => {
  it("maps MEASURE choice_value through the flow metric; skips unknown steps", () => {
    const flow = getFlow("framing-headlines");
    expect(
      toFlowInteractions(
        [
          { step_id: "measure_emotional", choice_value: "1" },
          { step_id: "compare", choice_value: "emotional_share" },
          { step_id: "measure_emotional", choice_value: "not-a-number" },
        ],
        flow,
      ),
    ).toEqual([{ metric: "framing_bias", value: 1 }]);
  });
});

describe("scoresForSession", () => {
  it("scores each Phase 5 experiment from its MEASURE rows and rules", () => {
    expect(
      scoresForSession("framing-headlines", [
        { step_id: "measure_political", choice_value: "2" },
      ]),
    ).toEqual({ framing_bias: 2 });

    expect(
      scoresForSession("echo-chamber", [
        { step_id: "perspective_diversity", choice_value: "0.25" },
      ]),
    ).toEqual({ perspective_diversity: 0.25 });

    expect(
      scoresForSession("memory-recall", [
        { step_id: "measure_color_accurate", choice_value: "1" },
        { step_id: "measure_action_misleading", choice_value: "0" },
      ]),
    ).toEqual({ memory_reliability: 0.5 });

    expect(
      scoresForSession("read-the-room", [
        { step_id: "measure_verify", choice_value: "1" },
        { step_id: "measure_adult", choice_value: "1" },
      ]),
    ).toEqual({ deepfake_resilience: 1 });
  });
});
