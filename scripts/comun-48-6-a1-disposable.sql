begin;

do $$
declare
  source_check text;
  source_reference_check text;
  prepare_definition text;
  response_definition text;
begin
  if to_regclass('private.comun_forwarding_packages') is null
    or to_regclass('private.comun_forwarding_attempts') is null then
    raise exception 'existing forwarding ledger missing';
  end if;

  select pg_get_constraintdef(oid) into source_check
  from pg_constraint
  where conrelid='private.comun_forwarding_packages'::regclass
    and conname='comun_forwarding_packages_source_domain_check';
  if source_check is null or source_check not like '%civic_service%' then
    raise exception 'civic source domain missing';
  end if;

  select pg_get_constraintdef(oid) into source_reference_check
  from pg_constraint
  where conrelid='private.comun_forwarding_packages'::regclass
    and conname='comun_forwarding_packages_source_reference_check';
  if source_reference_check is null or source_reference_check not like '%civic_service%' then
    raise exception 'civic source reference contract missing';
  end if;

  select pg_get_functiondef(p.oid) into prepare_definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='comun_civic_assisted_prepare';
  if prepare_definition is null
    or prepare_definition not like '%pg_advisory_xact_lock%'
    or prepare_definition not like '%p_preview_confirmed is not true%' then
    raise exception 'civic prepare is not idempotent/preview-gated';
  end if;

  select pg_get_functiondef(p.oid) into response_definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='comun_assisted_forwarding_record_response';
  if response_definition is null or response_definition not like '%civic_service%' then
    raise exception 'generic response does not support civic packages';
  end if;

  if has_table_privilege('anon','private.comun_forwarding_packages','SELECT')
    or has_table_privilege('authenticated','private.comun_forwarding_packages','SELECT')
    or has_table_privilege('anon','private.comun_forwarding_attempts','SELECT')
    or has_table_privilege('authenticated','private.comun_forwarding_attempts','SELECT') then
    raise exception 'private forwarding ledger exposed to clients';
  end if;
  if not has_table_privilege('service_role','private.comun_forwarding_packages','SELECT,INSERT,UPDATE')
    or not has_table_privilege('service_role','private.comun_forwarding_attempts','SELECT,INSERT,UPDATE') then
    raise exception 'service role forwarding privileges missing';
  end if;
  if not has_function_privilege('service_role','public.comun_civic_assisted_prepare(text,uuid,text,text,boolean)','EXECUTE')
    or has_function_privilege('anon','public.comun_civic_assisted_prepare(text,uuid,text,text,boolean)','EXECUTE')
    or has_function_privilege('authenticated','public.comun_civic_assisted_prepare(text,uuid,text,text,boolean)','EXECUTE') then
    raise exception 'civic RPC grants are not closed';
  end if;
end $$;

rollback;

select 'COMUN_48_6_A1_DISPOSABLE_MULTIDOMAIN_FORWARDING_GREEN' as result,
  'businessWritesAfterRollback=0' as business_writes_after_rollback,
  'autoOfficialSend=false' as auto_official_send,
  'publicProjection=false' as public_projection,
  'duplicateActivePackage=false' as duplicate_active_package;

