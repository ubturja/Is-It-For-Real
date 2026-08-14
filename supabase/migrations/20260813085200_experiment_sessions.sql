-- Experiment session persistence (Phase 4).
-- Content still comes from packages/content-config (§5 scope note), so sessions
-- store the JSON flowId + version rather than CMS catalog UUIDs. Wiring
-- flow_sessions.flow_id to public.flows is deferred until DB-backed flow loading.
--
-- RLS: default-deny remains; authenticated users may insert/select (and update
-- their own session to mark completion) only where user_id = auth.uid().
-- Interactions are authorized via session_id → flow_sessions.user_id.

alter table public.flow_sessions
  drop constraint flow_sessions_flow_id_fkey,
  drop constraint flow_sessions_flow_version_id_fkey;

alter table public.flow_sessions
  drop column flow_id,
  drop column flow_version_id;

alter table public.flow_sessions
  add column flow_id text not null,
  add column flow_version integer not null default 1
    check (flow_version > 0);

create index flow_sessions_flow_id_idx on public.flow_sessions (flow_id);

-- ---------------------------------------------------------------------------
-- flow_sessions: own rows only
-- ---------------------------------------------------------------------------

create policy "flow_sessions_select_own"
  on public.flow_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "flow_sessions_insert_own"
  on public.flow_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Completion writes status + completed_at; user_id must stay the owner.
create policy "flow_sessions_update_own"
  on public.flow_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- flow_interactions: own rows via parent session
-- ---------------------------------------------------------------------------

create policy "flow_interactions_select_own"
  on public.flow_interactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.flow_sessions as sessions
      where sessions.id = flow_interactions.session_id
        and sessions.user_id = auth.uid()
    )
  );

create policy "flow_interactions_insert_own"
  on public.flow_interactions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.flow_sessions as sessions
      where sessions.id = flow_interactions.session_id
        and sessions.user_id = auth.uid()
    )
  );
