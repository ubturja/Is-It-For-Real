import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReflectionReportSchema } from "@isitfr/schemas";
import { getScoringRules } from "@isitfr/content-config";

import { metricsForReflection } from "./metrics";

const generateObjectMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: (id: string) => ({ modelId: id }),
}));

import {
  REFLECTION_MODEL_ID,
  REFLECTION_SYSTEM_PROMPT,
  generateReflection,
  serializeReflectionPrompt,
} from "./generateReflection";

const validReport = {
  summary: "Scores suggest attention to framing.",
  strengths: ["You engaged the comparison."],
  growthAreas: ["Watch for emotional framing next time."],
  tone: "supportive" as const,
};

describe("generateReflection prompt payload", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
    generateObjectMock.mockResolvedValue({ object: validReport });
  });

  it("sends generateObject only scores + descriptions, never interaction data", async () => {
    const poisonChoice = "SECRET_USER_CHOICE_emotional_share";
    const poisonStep = "compare";
    const poisonText = "I think this classmate is lying about the video";

    const metrics = metricsForReflection("framing-headlines", [
      { metric_name: "framing_bias", metric_value: 1 },
    ]);

    const { report, model_used } = await generateReflection(metrics);

    expect(generateObjectMock).toHaveBeenCalledOnce();
    const request = generateObjectMock.mock.calls[0]?.[0] as {
      system: string;
      prompt: string;
      schema: unknown;
      model: { modelId: string };
    };

    expect(request.model.modelId).toBe(REFLECTION_MODEL_ID);
    expect(request.schema).toBe(ReflectionReportSchema);
    expect(request.system).toBe(REFLECTION_SYSTEM_PROMPT);
    expect(request.system).toMatch(/judgmental language/i);
    expect(request.system).toMatch(/diagnose the user/i);
    expect(request.system).toMatch(/invent any claim/i);

    const payload = JSON.parse(request.prompt) as unknown;
    expect(payload).toEqual({
      metrics: [
        {
          metric: "framing_bias",
          value: 1,
          description: getScoringRules("framing-headlines")[0]?.description,
        },
      ],
    });
    expect(Object.keys(payload as object)).toEqual(["metrics"]);
    const metric = (payload as { metrics: object[] }).metrics[0];
    expect(Object.keys(metric ?? {}).sort()).toEqual([
      "description",
      "metric",
      "value",
    ]);

    expect(JSON.stringify(payload)).not.toMatch(
      /"steps"|"initial"|"next"|"options"|"flowId"/,
    );

    const sent = `${request.system}\n${request.prompt}`;
    expect(sent).not.toContain(poisonChoice);
    expect(sent).not.toContain(poisonStep);
    expect(sent).not.toContain(poisonText);
    expect(sent).not.toContain("choice_value");
    expect(sent).not.toContain("step_id");
    expect(sent).not.toContain("reaction_time_ms");
    expect(sent).not.toContain("flow_interactions");

    expect(report).toEqual(validReport);
    expect(model_used).toBe(REFLECTION_MODEL_ID);
  });

  it("rejects extra keys before they can reach generateObject", () => {
    expect(() =>
      serializeReflectionPrompt([
        {
          metric: "framing_bias",
          value: 1,
          description: "desc",
          choice_value: "leaked",
        } as never,
      ]),
    ).toThrow(/Unrecognized key/i);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });
});
