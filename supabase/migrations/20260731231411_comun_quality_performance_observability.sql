begin;

create table if not exists public.comun_quality_metrics_hourly (
  bucket timestamptz not null,
  metric_name text not null check (metric_name in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')),
  route_class text not null check (route_class in ('home', 'discovery', 'search', 'process', 'territory', 'community', 'action', 'result', 'sidewalks', 'culture', 'help_security', 'auth', 'personal', 'admin', 'offline', 'other')),
  device_class text not null check (device_class in ('mobile', 'desktop')),
  app_version text not null check (app_version ~ '^[A-Za-z0-9._-]{1,40}$'),
  value_bucket integer not null check (value_bucket between 0 and 120000),
  rating text not null check (rating in ('good', 'needs-improvement', 'poor')),
  total bigint not null default 0 check (total >= 0),
  primary key (bucket, metric_name, route_class, device_class, app_version, value_bucket, rating)
);

create index if not exists comun_quality_metrics_recent_idx
  on public.comun_quality_metrics_hourly (bucket desc, metric_name, device_class);

alter table public.comun_quality_metrics_hourly enable row level security;
revoke all on table public.comun_quality_metrics_hourly from public, anon, authenticated;
grant select on table public.comun_quality_metrics_hourly to service_role;

create or replace function public.comun_record_quality_metric(
  p_metric_name text,
  p_route_class text,
  p_device_class text,
  p_app_version text,
  p_value_bucket integer,
  p_rating text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'COMUN_QUALITY_SERVER_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_metric_name not in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')
    or p_route_class not in ('home', 'discovery', 'search', 'process', 'territory', 'community', 'action', 'result', 'sidewalks', 'culture', 'help_security', 'auth', 'personal', 'admin', 'offline', 'other')
    or p_device_class not in ('mobile', 'desktop')
    or p_rating not in ('good', 'needs-improvement', 'poor')
    or p_app_version !~ '^[A-Za-z0-9._-]{1,40}$'
    or p_value_bucket not between 0 and 120000 then
    raise exception 'COMUN_QUALITY_METRIC_INVALID' using errcode = '22023';
  end if;

  insert into public.comun_quality_metrics_hourly (
    bucket, metric_name, route_class, device_class, app_version, value_bucket, rating, total
  ) values (
    date_trunc('hour', now()), p_metric_name, p_route_class, p_device_class,
    p_app_version, p_value_bucket, p_rating, 1
  )
  on conflict (bucket, metric_name, route_class, device_class, app_version, value_bucket, rating)
  do update set total = public.comun_quality_metrics_hourly.total + 1;
end
$$;

revoke all on function public.comun_record_quality_metric(text, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.comun_record_quality_metric(text, text, text, text, integer, text) to service_role;

comment on table public.comun_quality_metrics_hourly is
  'Hourly aggregate Web Vitals only. Raw paths, queries, identities, IPs, sessions and individual navigation are prohibited.';

do $ledger$
declare
  expected_path constant text := 'supabase/migrations/20260731231411_comun_quality_performance_observability.sql';
  expected_sha text := coalesce(nullif(pg_catalog.current_setting('comun.release_sha256', true), ''), 'LOCAL_VALIDATION');
  existing public.comun_schema_releases%rowtype;
begin
  select * into existing from public.comun_schema_releases where release = '20260731231411-comun-quality-performance-observability';
  if found then
    if existing.migration_path <> expected_path or existing.migration_sha256 <> expected_sha or existing.status <> 'applied' then
      raise exception 'COMUN_QUALITY_PERFORMANCE_LEDGER_DIVERGENCE';
    end if;
  else
    insert into public.comun_schema_releases (release, migration_path, migration_sha256, pre_fingerprint, post_fingerprint, status, applied_by)
    values ('20260731231411-comun-quality-performance-observability', expected_path, expected_sha, 'QUALITY_METRICS_ABSENT', 'QUALITY_AGGREGATE_ONLY', 'applied', current_user);
  end if;
end
$ledger$;

commit;
