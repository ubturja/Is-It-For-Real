-- aggregated_scores is pipeline-written (service role). Clients may still
-- select their profile and update other columns (updated_at).
-- reports: own-row SELECT so a future history view is not silently empty.

revoke insert (aggregated_scores) on table public.profiles from anon, authenticated;
revoke update (aggregated_scores) on table public.profiles from anon, authenticated;

create or replace function public.profiles_protect_aggregated_scores()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.aggregated_scores is distinct from '{}'::jsonb then
      raise exception 'aggregated_scores is pipeline-written only'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.aggregated_scores is distinct from old.aggregated_scores then
    raise exception 'aggregated_scores is pipeline-written only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_aggregated_scores on public.profiles;

create trigger profiles_protect_aggregated_scores
  before insert or update on public.profiles
  for each row
  execute procedure public.profiles_protect_aggregated_scores();

create policy "reports_select_own"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = user_id);
