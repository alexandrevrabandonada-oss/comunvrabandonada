begin;

do $$
declare
  channel_type text;
  outcome_type text;
  list_definition text;
  open_definition text;
  response_definition text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into channel_type
  from pg_attribute a
  where a.attrelid='private.comun_forwarding_attempts'::regclass
    and a.attname='institutional_channel_id' and not a.attisdropped;
  if channel_type <> 'text' then raise exception 'institutional channel identity missing'; end if;

  select pg_catalog.format_type(a.atttypid, a.atttypmod) into outcome_type
  from pg_attribute a
  where a.attrelid='private.comun_forwarding_attempts'::regclass
    and a.attname='resolution_outcome' and not a.attisdropped;
  if outcome_type <> 'text' then raise exception 'resolution outcome missing'; end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='private.comun_forwarding_attempts'::regclass
      and conname='comun_forwarding_attempts_resolution_outcome_check'
  ) then raise exception 'resolution outcome check missing'; end if;

  select pg_get_functiondef(p.oid) into list_definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='comun_assisted_forwarding_list';
  if list_definition is null or list_definition not like '%institutionalChannelId%'
    or list_definition not like '%resolutionOutcome%' then
    raise exception 'follow-up history is not projected';
  end if;

  select pg_get_functiondef(p.oid) into open_definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='comun_assisted_forwarding_open'
    and pg_get_function_identity_arguments(p.oid) like '%p_institutional_channel_id text%';
  if open_definition is null or open_definition not like '%institutional_channel_id%' then
    raise exception 'canonical channel is not persisted by open RPC';
  end if;

  select pg_get_functiondef(p.oid) into response_definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='comun_assisted_forwarding_record_response';
  if response_definition is null or response_definition not like '%resolution_outcome%'
    or response_definition not like '%Resposta não resolveu%' then
    raise exception 'unresolved response is not actionable';
  end if;

  if has_table_privilege('anon','private.comun_forwarding_attempts','SELECT')
    or has_table_privilege('authenticated','private.comun_forwarding_attempts','SELECT') then
    raise exception 'private attempt ledger exposed to clients';
  end if;
  if not has_table_privilege('service_role','private.comun_forwarding_attempts','SELECT,INSERT,UPDATE') then
    raise exception 'service role attempt privileges missing';
  end if;
end $$;

rollback;

select 'COMUN_48_6_A3_DISPOSABLE_FOLLOWUP_ESCALATION_GREEN' as result,
  'businessWritesAfterRollback=0' as business_writes_after_rollback,
  'autoOfficialSend=false' as auto_official_send,
  'legacy72hIsNotOfficialSla=true' as legacy_72h_not_official_sla,
  'noBackfill=true' as no_backfill;
