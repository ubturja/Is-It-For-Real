import { z } from "zod";

/**
 * Stricter echo-feed shape. Core StepSchema only types payload as
 * Record<string, unknown>; this is the component-level contract.
 */
export const EchoFeedPayloadSchema = z.object({
  kind: z.literal("echo-feed"),
  feedKey: z.string().min(1),
  clicks: z.number().int().positive(),
});

export type EchoFeedPayload = z.infer<typeof EchoFeedPayloadSchema>;

export function isEchoFeedKind(payload: unknown): boolean {
  return (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "kind" in payload &&
    payload.kind === "echo-feed"
  );
}

export function parseEchoFeedPayload(payload: unknown): EchoFeedPayload {
  const result = EchoFeedPayloadSchema.safeParse(payload);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      })
      .join("\n");
    throw new Error(`Invalid echo-feed payload:\n${details}`);
  }
  return result.data;
}

/** unique topics on clicked items ÷ unique topics in the catalog */
export function perspectiveDiversity(
  clickedItems: readonly { topics: readonly string[] }[],
  catalog: readonly { topics: readonly string[] }[],
): number {
  const available = new Set<string>();
  for (const item of catalog) {
    for (const topic of item.topics) {
      available.add(topic);
    }
  }
  if (available.size === 0) {
    return 0;
  }

  const seen = new Set<string>();
  for (const item of clickedItems) {
    for (const topic of item.topics) {
      seen.add(topic);
    }
  }

  return seen.size / available.size;
}
