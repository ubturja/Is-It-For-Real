import { jsonError, jsonSuccess } from "@/lib/api/response";
import { completeAndScoreSession } from "@/lib/sessions/completeAndScore";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: { id: string } },
) {
  const sessionId = context.params.id;
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError(
      { code: "unauthorized", message: "Authentication required" },
      401,
    );
  }

  const result = await completeAndScoreSession(sessionId, user.id);
  if (!result.ok) {
    const status =
      result.code === "unauthorized"
        ? 401
        : result.code === "not_found"
          ? 404
          : result.code === "incomplete"
            ? 409
            : 500;
    return jsonError(
      {
        code: result.code,
        message: result.message,
        ...(result.details !== undefined ? { details: result.details } : {}),
      },
      status,
    );
  }

  return jsonSuccess(result.scores);
}
