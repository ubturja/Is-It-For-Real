import { z } from "zod";

export const VideoDisplayPayloadSchema = z.object({
  kind: z.literal("video-display"),
  heading: z.string().min(1),
  src: z.string().url(),
  credit: z.string().min(1),
});

export type VideoDisplayPayload = z.infer<typeof VideoDisplayPayloadSchema>;

export const DelayPayloadSchema = z.object({
  kind: z.literal("delay"),
  heading: z.string().min(1),
  durationMs: z.number().int().positive(),
});

export type DelayPayload = z.infer<typeof DelayPayloadSchema>;

export function isVideoDisplayKind(payload: unknown): boolean {
  return (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "kind" in payload &&
    payload.kind === "video-display"
  );
}

export function isDelayKind(payload: unknown): boolean {
  return (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "kind" in payload &&
    payload.kind === "delay"
  );
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function parseVideoDisplayPayload(
  payload: unknown,
): VideoDisplayPayload {
  const result = VideoDisplayPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(`Invalid video-display payload:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

export function parseDelayPayload(payload: unknown): DelayPayload {
  const result = DelayPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(`Invalid delay payload:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

/** True once `durationMs` has passed since `startedAt`. */
export function delayElapsed(
  startedAt: number,
  durationMs: number,
  now: number,
): boolean {
  return now - startedAt >= durationMs;
}
