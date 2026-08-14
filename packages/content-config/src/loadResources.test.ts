import { describe, expect, it } from "vitest";

import { buildResourceSetRegistry } from "./loadResources";

const valid = {
  key: "audit-resources",
  title: "Help",
  description: "Links",
  resources: [
    {
      id: "one",
      title: "One",
      description: "Desc",
      url: "https://example.com",
    },
  ],
};

describe("buildResourceSetRegistry", () => {
  it("throws when no modules are discovered", () => {
    expect(() => buildResourceSetRegistry({})).toThrow(
      /No resource-set JSON files discovered/,
    );
  });

  it("throws (does not skip) when a discovered file fails validation", () => {
    expect(() =>
      buildResourceSetRegistry({
        "./resources/broken.json": { key: "broken" },
      }),
    ).toThrow(/Invalid resource set in \.\/resources\/broken\.json/);
  });

  it("throws on duplicate key across two files", () => {
    expect(() =>
      buildResourceSetRegistry({
        "./resources/a.json": valid,
        "./resources/b.json": valid,
      }),
    ).toThrow(/Duplicate resource set "audit-resources"/);
  });

  it("keys the map by JSON key, not the filename", () => {
    const registry = buildResourceSetRegistry({
      "./resources/any-name.json": valid,
    });
    expect(registry["audit-resources"]?.title).toBe("Help");
  });
});
