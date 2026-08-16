import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { radarAxesFromScores } from "./radarAxes";

describe("radarAxesFromScores", () => {
  it("returns no axes for empty scores (empty state, not a blank chart)", () => {
    expect(radarAxesFromScores({})).toEqual([]);
  });

  it("builds axes from the score keys, including a metric not in the original four", () => {
    const axes = radarAxesFromScores(
      {
        framing_bias: 1,
        future_metric: 0.8,
      },
      {
        framing_bias: "Framing",
      },
    );

    expect(axes.map((axis) => axis.metric).sort()).toEqual([
      "framing_bias",
      "future_metric",
    ]);
    expect(axes.find((axis) => axis.metric === "framing_bias")).toEqual({
      metric: "framing_bias",
      label: "Framing",
      value: 1,
    });
    expect(axes.find((axis) => axis.metric === "future_metric")).toEqual({
      metric: "future_metric",
      label: "future metric",
      value: 0.8,
    });
  });

  it("does not hardcode the four experiment metrics in the radar UI", () => {
    const radar = readFileSync(resolve(__dirname, "../../components/ProfileRadar.tsx"), "utf8");
    const page = readFileSync(
      resolve(__dirname, "../../app/(site)/(train)/train/profile/page.tsx"),
      "utf8",
    );
    const combined = radar + page;
    expect(combined).not.toMatch(/framing_bias/);
    expect(combined).not.toMatch(/perspective_diversity/);
    expect(combined).not.toMatch(/memory_reliability/);
    expect(combined).not.toMatch(/deepfake_resilience/);
    expect(combined).not.toMatch(/PROFILE_DIMENSIONS/);
  });
});
