import {
  validateMessageTemplate,
  type MessageTemplate,
} from "@isitfr/schemas";

import {
  collectJsonViaNodeFs,
  modulesFromWebpackContext,
  unwrapAll,
  unwrapModule,
  type WebpackContext,
} from "./discoverJson";

function discoverRawTemplateModules(): Record<string, unknown> {
  try {
    const globbed = import.meta.glob("./templates/*.json", { eager: true });
    const unwrapped = unwrapAll(globbed);
    if (Object.keys(unwrapped).length > 0) {
      return unwrapped;
    }
  } catch {
    // webpack: import.meta.glob is not a function.
  }

  try {
    // webpack compile-time glob (arguments must stay literals).
    // @ts-expect-error require.context is a webpack runtime, not in ESM types
    const context = require.context(
      "./templates",
      false,
      /\.json$/,
    ) as WebpackContext;
    const modules = modulesFromWebpackContext(context);
    if (Object.keys(modules).length > 0) {
      return modules;
    }
  } catch {
    // Vite/Node: require.context is undefined.
  }

  const fromFs = collectJsonViaNodeFs("templates", /\.json$/);
  if (fromFs !== null && Object.keys(fromFs).length > 0) {
    return fromFs;
  }

  throw new Error(
    "No template JSON files discovered under src/templates/ (expected *.json).",
  );
}

export type MessageTemplateRegistry = Record<
  string,
  Record<string, MessageTemplate>
>;

export function buildMessageTemplateRegistry(
  modules: Record<string, unknown>,
): MessageTemplateRegistry {
  const entries = Object.entries(modules);
  if (entries.length === 0) {
    throw new Error(
      "No template JSON files discovered under src/templates/ (expected *.json).",
    );
  }

  const registry: MessageTemplateRegistry = {};
  const sources: Record<string, string> = {};

  for (const [source, mod] of entries) {
    let template: MessageTemplate;
    try {
      template = validateMessageTemplate(unwrapModule(mod));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid message template in ${source}: ${message}`);
    }

    const identity = `${template.key}::${template.locale}`;
    const existingSource = sources[identity];
    if (existingSource !== undefined) {
      throw new Error(
        `Duplicate template "${identity}" in ${source} (already loaded from ${existingSource}).`,
      );
    }

    const byLocale = registry[template.key] ?? {};
    byLocale[template.locale] = template;
    registry[template.key] = byLocale;
    sources[identity] = source;
  }

  return registry;
}

export const messageTemplateRegistry: MessageTemplateRegistry =
  buildMessageTemplateRegistry(discoverRawTemplateModules());
