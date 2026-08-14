import { z } from "zod";

/**
 * Stricter article-compare shape. Core StepSchema only types payload as
 * Record<string, unknown>; this is the component-level contract.
 */
export const ArticleComparePayloadSchema = z.object({
  kind: z.literal("article-compare"),
  variants: z
    .array(
      z.object({
        id: z.string().min(1),
        headline: z.string().min(1),
        body: z.string().min(1),
        source: z.string().optional(),
      }),
    )
    .min(1),
  actions: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
      }),
    )
    .min(1),
});

export type ArticleComparePayload = z.infer<typeof ArticleComparePayloadSchema>;

export function isArticleCompareKind(payload: unknown): boolean {
  return (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "kind" in payload &&
    payload.kind === "article-compare"
  );
}

export function parseArticleComparePayload(
  payload: unknown,
): ArticleComparePayload {
  const result = ArticleComparePayloadSchema.safeParse(payload);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      })
      .join("\n");
    throw new Error(`Invalid article-compare payload:\n${details}`);
  }
  return result.data;
}

export function articleCompareChoiceValue(
  variantId: string,
  actionValue: string,
): string {
  return `${variantId}_${actionValue}`;
}
