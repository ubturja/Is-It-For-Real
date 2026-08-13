import { describe, expect, it } from "vitest";

import { buildFlowRegistry } from "./loadFlows";

const validExperiment = {
  flowId: "audit-probe",
  version: 1,
  type: "experiment" as const,
  title: "Audit probe",
  track: "Foundation",
  teaser: "A throwaway scenario used only to test registry construction.",
  initial: "probe",
  steps: {
    probe: {
      type: "MEASURE" as const,
      prompt: "Probe",
      metric: "audit_signal",
      weight: 1,
      next: "done",
    },
    done: {
      type: "STOP" as const,
      prompt: "Done",
    },
  },
};

describe("buildFlowRegistry", () => {
  it("throws when no modules are discovered", () => {
    expect(() => buildFlowRegistry({})).toThrow(/No flow JSON files discovered/);
  });

  it("throws (does not skip) when a discovered file fails FlowConfig validation", () => {
    expect(() =>
      buildFlowRegistry({
        "./flows/broken.v1.json": { flowId: "broken" },
      }),
    ).toThrow(/Invalid flow config in \.\/flows\/broken\.v1\.json/);
  });

  it("throws on duplicate flowId across two files", () => {
    expect(() =>
      buildFlowRegistry({
        "./flows/audit-probe.v1.json": validExperiment,
        "./flows/audit-probe-copy.v1.json": validExperiment,
      }),
    ).toThrow(/Duplicate flowId "audit-probe"/);
  });

  it("keys the map by flowId from the JSON, not the filename", () => {
    const registry = buildFlowRegistry({
      "./flows/any-name.v1.json": validExperiment,
    });
    expect(registry["audit-probe"]?.title).toBe("Audit probe");
  });
});
