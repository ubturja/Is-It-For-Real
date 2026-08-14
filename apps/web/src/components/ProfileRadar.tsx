"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import type { RadarAxis } from "@/lib/profile/radarAxes";

type ProfileRadarProps = {
  axes: RadarAxis[];
};

/**
 * Radar of the current user's aggregated_scores. Axes come from `axes`
 * (derived from the JSON keys) — this component has no dimension list.
 */
export function ProfileRadar({ axes }: ProfileRadarProps) {
  const domainMax = Math.max(1, ...axes.map((axis) => axis.value));

  return (
    <div className="mx-auto aspect-square w-full max-w-md">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={axes} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, domainMax]} tickCount={5} />
          <Radar
            name="profile"
            dataKey="value"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
      <ul className="text-muted-foreground mx-auto mt-2 max-w-md space-y-1 text-center text-sm">
        {axes.map((axis) => (
          <li key={axis.metric}>
            {axis.label}: {axis.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
