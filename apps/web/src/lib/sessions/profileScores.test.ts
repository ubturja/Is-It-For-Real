import { describe, expect, it } from "vitest";

import { aggregatedScoresFromRows } from "./profileScores";

describe("aggregatedScoresFromRows", () => {
  it("averages a dimension across two completed sessions in time order", () => {
    expect(
      aggregatedScoresFromRows(
        [
          {
            id: "later",
            completed_at: "2026-08-13T12:00:00.000Z",
            started_at: "2026-08-13T11:50:00.000Z",
          },
          {
            id: "earlier",
            completed_at: "2026-08-13T10:00:00.000Z",
            started_at: "2026-08-13T09:50:00.000Z",
          },
        ],
        [
          {
            session_id: "later",
            metric_name: "framing_bias",
            metric_value: 2,
          },
          {
            session_id: "earlier",
            metric_name: "framing_bias",
            metric_value: 0,
          },
          {
            session_id: "earlier",
            metric_name: "perspective_diversity",
            metric_value: 0.25,
          },
        ],
      ),
    ).toEqual({
      framing_bias: 1,
      perspective_diversity: 0.25,
    });
  });
});
