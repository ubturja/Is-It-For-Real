import { describe, expect, it } from "vitest";

import {
  validateFeedCatalog,
  validateMessageTemplate,
  validateResourceSet,
} from "./contentAssets";

const validTemplate = {
  key: "probe-template",
  locale: "en",
  body: "Hello.",
};

const validResources = {
  key: "probe-resources",
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

const validFeed = {
  key: "probe-feed",
  items: [
    {
      id: "post-1",
      topics: ["news"],
      headline: "Headline",
      source: "Desk",
      body: "Body",
    },
  ],
};

describe("validateMessageTemplate", () => {
  it("accepts a complete template", () => {
    expect(validateMessageTemplate(validTemplate)).toEqual(validTemplate);
  });

  it("rejects a missing body", () => {
    const { body: _body, ...without } = validTemplate;
    expect(() => validateMessageTemplate(without)).toThrow(/body/i);
  });
});

describe("validateResourceSet", () => {
  it("accepts a complete set", () => {
    expect(validateResourceSet(validResources)).toEqual(validResources);
  });

  it("rejects an empty resources array", () => {
    expect(() =>
      validateResourceSet({ ...validResources, resources: [] }),
    ).toThrow(/resources/i);
  });
});

describe("validateFeedCatalog", () => {
  it("accepts a complete catalog", () => {
    expect(validateFeedCatalog(validFeed)).toEqual(validFeed);
  });

  it("rejects an empty items array", () => {
    expect(() => validateFeedCatalog({ ...validFeed, items: [] })).toThrow(
      /items/i,
    );
  });
});
