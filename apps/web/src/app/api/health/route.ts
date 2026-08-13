import { HealthResponseSchema } from "@isitfr/schemas";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export function GET() {
  const parsed = HealthResponseSchema.safeParse({
    status: "ok",
    timestamp: new Date().toISOString(),
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "health_response_invalid",
        message: "Health response failed schema validation",
        details: parsed.error.issues,
      },
      500,
    );
  }

  return jsonSuccess(parsed.data);
}
