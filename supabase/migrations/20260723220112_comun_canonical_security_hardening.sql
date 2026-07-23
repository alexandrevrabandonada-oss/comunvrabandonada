begin;

-- Forward-only hardening for the canonical post-PR23 schema. The immutable
-- pre-fingerprint is enforced by the release runner before this transaction.
do $preflight$
declare
  view_owner text;
  function_owner text;
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'comun_public_reports'
      and c.relkind = 'v'
  ) then
    raise exception 'COMUN_HARDENING_PREFLIGHT_VIEW_MISSING';
  end if;

  select pg_catalog.pg_get_userbyid(c.relowner)
    into view_owner
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'comun_public_reports';
  if view_owner <> 'postgres' then
    raise exception 'COMUN_HARDENING_PREFLIGHT_VIEW_OWNER:%', view_owner;
  end if;

  if pg_catalog.to_regprocedure('public.claim_next_archive_processing_job(text)') is null then
    raise exception 'COMUN_HARDENING_PREFLIGHT_ARCHIVE_FUNCTION_MISSING';
  end if;
  select pg_catalog.pg_get_userbyid(p.proowner)
    into function_owner
  from pg_catalog.pg_proc p
  where p.oid = 'public.claim_next_archive_processing_job(text)'::pg_catalog.regprocedure;
  if function_owner <> 'postgres' then
    raise exception 'COMUN_HARDENING_PREFLIGHT_ARCHIVE_OWNER:%', function_owner;
  end if;

  -- Clean installations may not use Supabase Auth. On the canonical remote,
  -- the function and its exact trigger are mandatory and checked together.
  if pg_catalog.to_regprocedure('public.handle_new_user()') is not null then
    select pg_catalog.pg_get_userbyid(p.proowner)
      into function_owner
    from pg_catalog.pg_proc p
    where p.oid = 'public.handle_new_user()'::pg_catalog.regprocedure;
    if function_owner <> 'postgres' then
      raise exception 'COMUN_HARDENING_PREFLIGHT_ONBOARDING_OWNER:%', function_owner;
    end if;
    if pg_catalog.to_regclass('auth.users') is not null and not exists (
      select 1
      from pg_catalog.pg_trigger t
      where t.tgrelid = 'auth.users'::pg_catalog.regclass
        and t.tgname = 'on_auth_user_created'
        and t.tgfoid = 'public.handle_new_user()'::pg_catalog.regprocedure
        and not t.tgisinternal
    ) then
      raise exception 'COMUN_HARDENING_PREFLIGHT_ONBOARDING_TRIGGER_MISSING';
    end if;
  end if;
end
$preflight$;

revoke all privileges on table public.comun_public_reports
  from public, anon, authenticated;
alter view public.comun_public_reports set (security_invoker = true);
grant select on table public.comun_public_reports to anon, authenticated;

-- security_invoker makes the base relation's RLS and privileges effective.
-- Grant only columns required by the public projection and its predicate.
revoke select on table public.comun_reports from anon, authenticated;
grant select (
  id, protocol, community_slug, issue_slug, title, public_text, period_text,
  approximate_location, neighborhood, status, risk_level, created_at,
  published_at, can_publish_sanitized
) on table public.comun_reports to anon, authenticated;

do $policy$
begin
  if not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'comun_reports'
      and policyname = 'Public can read sanitized published reports'
  ) then
    execute $sql$
      create policy "Public can read sanitized published reports"
      on public.comun_reports for select
      to anon, authenticated
      using (
        status = 'published'
        and public_text is not null
        and can_publish_sanitized is true
      )
    $sql$;
  end if;
end
$policy$;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

do $defaults$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'supabase_admin') then
    execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated';
    execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated';
    execute 'alter default privileges for role supabase_admin in schema public revoke execute on functions from public, anon, authenticated';
  end if;
end
$defaults$;

alter function public.claim_next_archive_processing_job(text)
  set search_path = pg_catalog;
revoke all on function public.claim_next_archive_processing_job(text)
  from public, anon, authenticated;
grant execute on function public.claim_next_archive_processing_job(text)
  to service_role;

do $onboarding$
begin
  if pg_catalog.to_regprocedure('public.handle_new_user()') is not null then
    execute 'alter function public.handle_new_user() set search_path = pg_catalog';
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
    if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
      execute 'grant execute on function public.handle_new_user() to service_role';
    end if;
  end if;
end
$onboarding$;

do $postflight$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'comun_public_reports'
      and 'security_invoker=true' = any(coalesce(c.reloptions, array[]::text[]))
  ) then
    raise exception 'COMUN_HARDENING_POSTFLIGHT_VIEW';
  end if;
  if pg_catalog.has_table_privilege('anon', 'public.comun_public_reports', 'INSERT')
    or pg_catalog.has_table_privilege('anon', 'public.comun_public_reports', 'UPDATE')
    or pg_catalog.has_table_privilege('anon', 'public.comun_public_reports', 'DELETE')
    or pg_catalog.has_table_privilege('anon', 'public.comun_public_reports', 'TRUNCATE')
    or pg_catalog.has_table_privilege('anon', 'public.comun_public_reports', 'REFERENCES')
    or pg_catalog.has_table_privilege('anon', 'public.comun_public_reports', 'TRIGGER')
    or not pg_catalog.has_table_privilege('anon', 'public.comun_public_reports', 'SELECT')
  then
    raise exception 'COMUN_HARDENING_POSTFLIGHT_ANON_VIEW_GRANTS';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'comun_reports' and c.relrowsecurity
  ) then
    raise exception 'COMUN_HARDENING_POSTFLIGHT_RLS';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = 'public.claim_next_archive_processing_job(text)'::pg_catalog.regprocedure
      and p.prosecdef
      and p.proconfig = array['search_path=pg_catalog']
  ) then
    raise exception 'COMUN_HARDENING_POSTFLIGHT_ARCHIVE_FUNCTION';
  end if;
  if pg_catalog.to_regprocedure('public.handle_new_user()') is not null
     and not exists (
       select 1 from pg_catalog.pg_proc p
       where p.oid = 'public.handle_new_user()'::pg_catalog.regprocedure
         and p.prosecdef
         and p.proconfig = array['search_path=pg_catalog']
     )
  then
    raise exception 'COMUN_HARDENING_POSTFLIGHT_ONBOARDING_FUNCTION';
  end if;
end
$postflight$;

commit;
