-- flow_scores: one row per metric per session; owners may read, never write.
-- Inserts go through the service-role Route Handler (bypasses RLS).
-- Completion is no longer a client UPDATE — POST /api/sessions/[id]/score
-- marks the session complete (service role) and writes scores in one step.

alter table public.flow_scores
  add constraint flow_scores_session_id_metric_name_key
  unique (session_id, metric_name);

create policy "flow_scores_select_own"
  on public.flow_scores
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.flow_sessions as sessions
      where sessions.id = flow_scores.session_id
        and sessions.user_id = auth.uid()
    )
  );

drop policy "flow_sessions_update_own" on public.flow_sessions;
