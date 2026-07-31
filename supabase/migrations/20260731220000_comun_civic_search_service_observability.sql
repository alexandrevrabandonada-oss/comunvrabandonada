begin;

grant select on table
  public.comun_search_documents,
  public.comun_search_sections,
  public.comun_search_embedding_jobs,
  public.comun_search_metrics_hourly
to service_role;

do $ledger$
declare
  expected_path constant text := 'supabase/migrations/20260731220000_comun_civic_search_service_observability.sql';
  expected_sha text := coalesce(nullif(pg_catalog.current_setting('comun.release_sha256', true), ''), 'LOCAL_VALIDATION');
  existing public.comun_schema_releases%rowtype;
begin
  select * into existing from public.comun_schema_releases where release = '20260731220000-comun-civic-search-service-observability';
  if found then
    if existing.migration_path <> expected_path or existing.migration_sha256 <> expected_sha or existing.status <> 'applied' then
      raise exception 'COMUN_CIVIC_SEARCH_SERVICE_GRANT_LEDGER_DIVERGENCE';
    end if;
  else
    insert into public.comun_schema_releases (release, migration_path, migration_sha256, pre_fingerprint, post_fingerprint, status, applied_by)
    values ('20260731220000-comun-civic-search-service-observability', expected_path, expected_sha, 'CIVIC_SEARCH_SERVER_RPC_ONLY', 'CIVIC_SEARCH_SANITIZED_SERVICE_OBSERVABILITY', 'applied', current_user);
  end if;
end
$ledger$;

commit;
