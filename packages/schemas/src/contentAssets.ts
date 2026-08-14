import { z } from "zod";

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export const MessageTemplateSchema = z.object({
  key: z.string().min(1),
  locale: z.string().min(1),
  title: z.string().min(1).optional(),
  body: z.string().min(1),
});

export const ResourceLinkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  url: z.string().min(1),
});

export const ResourceSetSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  resources: z.array(ResourceLinkSchema).min(1),
});

export const FeedPostSchema = z.object({
  id: z.string().min(1),
  topics: z.array(z.string().min(1)).min(1),
  headline: z.string().min(1),
  source: z.string().min(1),
  body: z.string().min(1),
});

export const FeedCatalogSchema = z.object({
  key: z.string().min(1),
  items: z.array(FeedPostSchema).min(1),
});

export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;
export type ResourceLink = z.infer<typeof ResourceLinkSchema>;
export type ResourceSet = z.infer<typeof ResourceSetSchema>;
export type FeedPost = z.infer<typeof FeedPostSchema>;
export type FeedCatalog = z.infer<typeof FeedCatalogSchema>;

export function validateMessageTemplate(json: unknown): MessageTemplate {
  const result = MessageTemplateSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid MessageTemplate:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

export function validateResourceSet(json: unknown): ResourceSet {
  const result = ResourceSetSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid ResourceSet:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}

export function validateFeedCatalog(json: unknown): FeedCatalog {
  const result = FeedCatalogSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid FeedCatalog:\n${formatZodIssues(result.error)}`);
  }
  return result.data;
}
