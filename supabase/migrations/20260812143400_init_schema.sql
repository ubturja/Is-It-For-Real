-- IsItFR initial schema (SYSTEM_REFERENCE.md §5)
-- Content for Phases 1–4 is served from packages/content-config, not these tables.
-- Do not seed flow_versions with real flow JSON here.

-- gen_random_uuid() is provided by pgcrypto (enabled on Supabase under extensions).
create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  aggregated_scores jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.flows (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  type text not null check (type in ('crisis', 'experiment')),
  title text not null,
  track text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.flow_versions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  config jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (flow_id, version_number)
);

create table public.flow_sessions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows (id) on delete restrict,
  flow_version_id uuid not null references public.flow_versions (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  is_anonymous boolean not null default false,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.flow_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.flow_sessions (id) on delete cascade,
  step_id text not null,
  choice_value text,
  reaction_time_ms integer,
  confidence integer,
  created_at timestamptz not null default now()
);

create table public.flow_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.flow_sessions (id) on delete cascade,
  metric_name text not null,
  metric_value double precision not null
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.flow_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  model_used text not null,
  generated_at timestamptz not null default now(),
  unique (session_id)
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows (id) on delete cascade,
  key text not null,
  locale text not null default 'en',
  body text not null,
  unique (flow_id, key, locale)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows (id) on delete cascade,
  region text,
  category text,
  title text not null,
  url text not null
);

create index flow_versions_flow_id_idx on public.flow_versions (flow_id);
create index flow_sessions_flow_id_idx on public.flow_sessions (flow_id);
create index flow_sessions_user_id_idx on public.flow_sessions (user_id);
create index flow_interactions_session_id_idx on public.flow_interactions (session_id);
create index flow_scores_session_id_idx on public.flow_scores (session_id);
create index reports_user_id_idx on public.reports (user_id);
create index message_templates_flow_id_idx on public.message_templates (flow_id);
create index resources_flow_id_idx on public.resources (flow_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — default deny (no permissive policies yet)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.flows enable row level security;
alter table public.flow_versions enable row level security;
alter table public.flow_sessions enable row level security;
alter table public.flow_interactions enable row level security;
alter table public.flow_scores enable row level security;
alter table public.reports enable row level security;
alter table public.message_templates enable row level security;
alter table public.resources enable row level security;

-- Force RLS for table owners as well (service_role still bypasses RLS).
alter table public.profiles force row level security;
alter table public.flows force row level security;
alter table public.flow_versions force row level security;
alter table public.flow_sessions force row level security;
alter table public.flow_interactions force row level security;
alter table public.flow_scores force row level security;
alter table public.reports force row level security;
alter table public.message_templates force row level security;
alter table public.resources force row level security;
