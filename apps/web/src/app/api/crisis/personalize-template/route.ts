import { hasMessageTemplate } from "@isitfr/content-config";
import {
  PersonalizeTemplateRequestSchema,
  PersonalizeTemplateResponseSchema,
} from "@isitfr/schemas";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { personalizeTemplate } from "@/lib/crisis/personalizeTemplate";
import {
  PERSONALIZE_RATE_WINDOW_MS,
  allowPersonalizeRequest,
} from "@/lib/crisis/personalizeRateLimit";

export async function POST(request: Request) {
  if (!allowPersonalizeRequest(request)) {
    return jsonError(
      {
        code: "rate_limited",
        message: "Too many personalize requests. Try again in a minute.",
      },
      429,
      {
        "Retry-After": String(Math.ceil(PERSONALIZE_RATE_WINDOW_MS / 1000)),
      },
    );
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(
      { code: "invalid_json", message: "Request body must be JSON" },
      400,
    );
  }

  const parsed = PersonalizeTemplateRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      {
        code: "invalid_request",
        message: "Invalid personalize-template request",
        details: parsed.error.issues,
      },
      400,
    );
  }

  if (!hasMessageTemplate(parsed.data.templateKey)) {
    return jsonError(
      { code: "unknown_template", message: "Unknown template key" },
      404,
    );
  }

  let result;
  try {
    result = await personalizeTemplate(parsed.data.templateKey);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "personalize failed";
    return jsonError({ code: "personalize_failed", message }, 502);
  }

  const body = PersonalizeTemplateResponseSchema.safeParse(result);
  if (!body.success) {
    return jsonError(
      {
        code: "personalize_invalid",
        message: "Personalized template failed schema validation",
        details: body.error.issues,
      },
      500,
    );
  }

  return jsonSuccess(body.data);
}
