import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUserAndTrainingRows,
  requirePublicSupabaseEnv,
  requireServiceRoleKey,
} from "./helpers/auth";

test.describe("profiles aggregated_scores + reports RLS", () => {
  test("owner cannot paint aggregated_scores; can bump updated_at; can select own reports", async () => {
    const { url: supabaseUrl, anonKey } = requirePublicSupabaseEnv();
    const admin = createClient(supabaseUrl, requireServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ownerUser = await createConfirmedUser(admin, "e2e-profile-rls");
    const otherUser = await createConfirmedUser(admin, "e2e-profile-rls-other");
    let sessionId: string | undefined;
    let reportId: string | undefined;

    try {
      const owner = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: signInError } = await owner.auth.signInWithPassword({
        email: ownerUser.email,
        password: ownerUser.password,
      });
      expect(signInError).toBeNull();

      const { error: insertProfileError } = await owner.from("profiles").insert({
        user_id: ownerUser.userId,
        updated_at: new Date().toISOString(),
      });
      expect(insertProfileError).toBeNull();

      const painted = { framing_bias: 1, perspective_diversity: 1 };
      const { error: paintError } = await owner
        .from("profiles")
        .update({ aggregated_scores: painted })
        .eq("user_id", ownerUser.userId);
      expect(paintError).not.toBeNull();

      const { data: afterPaint, error: afterPaintError } = await owner
        .from("profiles")
        .select("aggregated_scores, updated_at")
        .eq("user_id", ownerUser.userId)
        .single();
      expect(afterPaintError).toBeNull();
      expect(afterPaint?.aggregated_scores).toEqual({});

      const bumped = new Date(Date.now() + 60_000).toISOString();
      const { error: bumpError } = await owner
        .from("profiles")
        .update({ updated_at: bumped })
        .eq("user_id", ownerUser.userId);
      expect(bumpError).toBeNull();

      const { data: afterBump, error: afterBumpError } = await owner
        .from("profiles")
        .select("updated_at")
        .eq("user_id", ownerUser.userId)
        .single();
      expect(afterBumpError).toBeNull();
      expect(Date.parse(String(afterBump?.updated_at))).toBe(Date.parse(bumped));

      const { data: sessionRow, error: sessionError } = await admin
        .from("flow_sessions")
        .insert({
          user_id: ownerUser.userId,
          flow_id: "experiment-stub",
          flow_version: 1,
          status: "completed",
        })
        .select("id")
        .single();
      expect(sessionError).toBeNull();
      expect(sessionRow?.id).toBeTruthy();
      sessionId = sessionRow?.id;

      const { data: reportRow, error: reportInsertError } = await admin
        .from("reports")
        .insert({
          session_id: sessionId,
          user_id: ownerUser.userId,
          content: "{}",
          model_used: "e2e",
        })
        .select("id")
        .single();
      expect(reportInsertError).toBeNull();
      expect(reportRow?.id).toBeTruthy();
      reportId = reportRow?.id;

      const { data: ownReports, error: ownReportError } = await owner
        .from("reports")
        .select("id, user_id, session_id")
        .eq("user_id", ownerUser.userId);
      expect(ownReportError).toBeNull();
      expect(ownReports).toEqual([
        {
          id: reportId,
          user_id: ownerUser.userId,
          session_id: sessionId,
        },
      ]);

      const other = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: otherSignInError } = await other.auth.signInWithPassword({
        email: otherUser.email,
        password: otherUser.password,
      });
      expect(otherSignInError).toBeNull();

      const { data: hiddenReports, error: hiddenReportError } = await other
        .from("reports")
        .select("id")
        .eq("user_id", ownerUser.userId);
      expect(hiddenReportError).toBeNull();
      expect(hiddenReports ?? []).toEqual([]);
    } finally {
      if (reportId) {
        await admin.from("reports").delete().eq("id", reportId);
      }
      if (sessionId) {
        await admin.from("flow_sessions").delete().eq("id", sessionId);
      }
      await deleteUserAndTrainingRows(admin, ownerUser.userId);
      await deleteUserAndTrainingRows(admin, otherUser.userId);
    }
  });
});
