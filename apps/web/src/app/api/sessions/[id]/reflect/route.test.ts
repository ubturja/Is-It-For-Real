import { beforeEach, describe, expect, it, vi } from "vitest";

import { getScoringRules } from "@isitfr/content-config";

const generateObjectMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const userFromMock = vi.hoisted(() => vi.fn());
const adminFromMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: (id: string) => ({ modelId: id }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: userFromMock,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: adminFromMock,
  }),
}));

import { POST } from "./route";

const USER_ID = "user-1";
const SESSION_ID = "session-1";
const POISON_CHOICE = "SECRET_USER_CHOICE_emotional_share";
const POISON_TEXT = "I think this classmate is lying about the video";

const validReport = {
  summary: "You compared frames without rushing to share.",
  strengths: ["You sat with more than one headline."],
  growthAreas: ["Notice when a frame pulls for a fast reaction."],
  tone: "supportive" as const,
};

type QueryResult = { data: unknown; error: { message: string } | null };

function thenableBuilder(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    upsert: vi.fn(async () => result),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

describe("POST /api/sessions/[id]/reflect", () => {
  const adminTables: string[] = [];
  const userTables: string[] = [];
  let reportsUpsert: unknown;

  beforeEach(() => {
    adminTables.length = 0;
    userTables.length = 0;
    reportsUpsert = undefined;
    generateObjectMock.mockReset();
    generateObjectMock.mockResolvedValue({ object: validReport });
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });

    userFromMock.mockImplementation((table: string) => {
      userTables.push(table);
      if (table === "flow_sessions") {
        return thenableBuilder({
          data: {
            id: SESSION_ID,
            flow_id: "framing-headlines",
            user_id: USER_ID,
            status: "completed",
          },
          error: null,
        });
      }
      if (table === "flow_interactions") {
        return thenableBuilder({
          data: [
            {
              step_id: "compare",
              choice_value: POISON_CHOICE,
              prompt: POISON_TEXT,
            },
          ],
          error: null,
        });
      }
      return thenableBuilder({ data: null, error: null });
    });

    adminFromMock.mockImplementation((table: string) => {
      adminTables.push(table);
      if (table === "flow_scores") {
        return thenableBuilder({
          data: [{ metric_name: "framing_bias", metric_value: 1 }],
          error: null,
        });
      }
      if (table === "flow_interactions") {
        return thenableBuilder({
          data: [
            {
              step_id: "compare",
              choice_value: POISON_CHOICE,
              prompt: POISON_TEXT,
            },
          ],
          error: null,
        });
      }
      if (table === "reports") {
        const builder = thenableBuilder({ data: null, error: null });
        builder.upsert.mockImplementation(async (row?: unknown) => {
          reportsUpsert = row;
          return { data: null, error: null };
        });
        return builder;
      }
      return thenableBuilder({ data: null, error: null });
    });
  });

  it("calls generateObject with scores + descriptions only and persists reports", async () => {
    const response = await POST(new Request("http://localhost/api/sessions/session-1/reflect", {
      method: "POST",
    }), { params: { id: SESSION_ID } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(validReport);

    expect(userTables).toEqual(["flow_sessions"]);
    expect(adminTables).toEqual(["flow_scores", "reports"]);
    expect(userTables.concat(adminTables)).not.toContain("flow_interactions");

    expect(generateObjectMock).toHaveBeenCalledOnce();
    const request = generateObjectMock.mock.calls[0]?.[0] as {
      system: string;
      prompt: string;
    };
    const payload = JSON.parse(request.prompt) as {
      metrics: Array<{ metric: string; value: number; description: string }>;
    };
    expect(Object.keys(payload)).toEqual(["metrics"]);
    expect(payload.metrics).toEqual([
      {
        metric: "framing_bias",
        value: 1,
        description: getScoringRules("framing-headlines")[0]?.description,
      },
    ]);
    expect(Object.keys(payload.metrics[0] ?? {}).sort()).toEqual([
      "description",
      "metric",
      "value",
    ]);

    const sent = `${request.system}\n${request.prompt}`;
    expect(sent).not.toContain(POISON_CHOICE);
    expect(sent).not.toContain(POISON_TEXT);
    expect(sent).not.toContain("choice_value");
    expect(sent).not.toContain("step_id");
    expect(sent).not.toContain("flow_interactions");

    expect(reportsUpsert).toEqual({
      session_id: SESSION_ID,
      user_id: USER_ID,
      content: JSON.stringify(validReport),
      model_used: "gpt-4o-mini",
    });
  });
});
