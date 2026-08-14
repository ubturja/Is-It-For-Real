import { describe, expect, it } from "vitest";

import { buildMessageTemplateRegistry } from "./loadTemplates";

const valid = {
  key: "audit-template",
  locale: "en",
  body: "Hello.",
};

describe("buildMessageTemplateRegistry", () => {
  it("throws when no modules are discovered", () => {
    expect(() => buildMessageTemplateRegistry({})).toThrow(
      /No template JSON files discovered/,
    );
  });

  it("throws (does not skip) when a discovered file fails validation", () => {
    expect(() =>
      buildMessageTemplateRegistry({
        "./templates/broken.en.json": { key: "broken" },
      }),
    ).toThrow(/Invalid message template in \.\/templates\/broken\.en\.json/);
  });

  it("throws on duplicate key+locale across two files", () => {
    expect(() =>
      buildMessageTemplateRegistry({
        "./templates/a.en.json": valid,
        "./templates/b.en.json": valid,
      }),
    ).toThrow(/Duplicate template "audit-template::en"/);
  });

  it("keys the map by JSON key and locale, not the filename", () => {
    const registry = buildMessageTemplateRegistry({
      "./templates/any-name.en.json": valid,
    });
    expect(registry["audit-template"]?.en?.body).toBe("Hello.");
  });
});
