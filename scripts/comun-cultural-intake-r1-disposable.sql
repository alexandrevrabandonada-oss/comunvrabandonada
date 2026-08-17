begin;

create temporary table r1_intake_ids (
  route_kind text primary key,
  intake_id uuid not null,
  public_protocol text not null,
  resume_token_hash text not null,
  member_user_id uuid not null
);
create temporary table r1_specialized_counts (table_name text primary key, row_count bigint not null);

do $$
declare v_table text; v_count bigint;
begin
  foreach v_table in array array['comun_archive_submissions','comun_archive_artwork_submissions','comun_archive_oral_history_suggestions','comun_radio_contributions','comun_archive_items'] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('select count(*) from public.%I', v_table) into v_count;
      insert into r1_specialized_counts values (v_table, v_count);
    end if;
  end loop;
end $$;

do $$
declare
  v_created record;
  v_replay record;
  v_protocol text;
  v_row_count integer;
  v_forbidden text;
  v_table text;
  v_before bigint;
  v_after bigint;
begin
  select * into v_created
    from public.comun_create_cultural_contribution_intake_v1(
      'Memória descartável R1', 'r1-disposable', 'a2f10000-0000-4000-8000-000000000001'::uuid,
      'r1-known-resume-hash', 'a2f10000-0000-4000-8000-000000000001'::uuid
    );
  if v_created.status <> 'draft' then raise exception 'initial status is not draft'; end if;

  select * into v_replay
    from public.comun_create_cultural_contribution_intake_v1(
      'Texto diferente não deve duplicar', 'r1-disposable', 'a2f10000-0000-4000-8000-000000000001'::uuid,
      'r1-known-resume-hash', 'a2f10000-0000-4000-8000-000000000001'::uuid
    );
  if v_replay.intake_id <> v_created.intake_id or v_replay.public_protocol <> v_created.public_protocol then
    raise exception 'request_id idempotency failed';
  end if;

  if exists(select 1 from public.comun_get_cultural_contribution_intake_v1(v_created.public_protocol, null, null)) then
    raise exception 'unauthorized null authorization returned a row';
  end if;
  if exists(select 1 from public.comun_get_cultural_contribution_intake_v1(v_created.public_protocol, 'wrong-hash', null)) then
    raise exception 'wrong token returned a row';
  end if;
  select count(*) into v_row_count from public.comun_get_cultural_contribution_intake_v1(v_created.public_protocol, 'r1-known-resume-hash', null);
  if v_row_count <> 1 then raise exception 'correct token did not return exactly one row'; end if;
  if exists(select 1 from public.comun_get_cultural_contribution_intake_v1(v_created.public_protocol, null, 'a2f10000-0000-4000-8000-000000000099'::uuid)) then
    raise exception 'wrong member returned a row';
  end if;
  select count(*) into v_row_count from public.comun_get_cultural_contribution_intake_v1(v_created.public_protocol, null, 'a2f10000-0000-4000-8000-000000000001'::uuid);
  if v_row_count <> 1 then raise exception 'correct member did not return exactly one row'; end if;

  select pg_get_function_result('public.comun_get_cultural_contribution_intake_v1(text,text,uuid)'::regprocedure) into v_forbidden;
  if v_forbidden ~* '(resume_token_hash|member_user_id|request_id|target_kind|target_id)' then
    raise exception 'forbidden authorization/output field in read RPC: %', v_forbidden;
  end if;

  foreach v_protocol in array array['photo_or_document','art','oral_history','radio','unknown'] loop
    select * into v_created
      from public.comun_create_cultural_contribution_intake_v1(
        'Rota descartável ' || v_protocol, 'r1-disposable', gen_random_uuid(),
        'r1-hash-' || v_protocol, 'a2f10000-0000-4000-8000-000000000001'::uuid
      );
    insert into r1_intake_ids(route_kind, intake_id, public_protocol, resume_token_hash, member_user_id)
      values(v_protocol, v_created.intake_id, v_created.public_protocol, 'r1-hash-' || v_protocol, 'a2f10000-0000-4000-8000-000000000001'::uuid);
    select * into v_replay from public.comun_route_cultural_contribution_intake_v1(v_created.public_protocol, v_protocol, 'r1-hash-' || v_protocol, null);
    if v_replay.status <> case when v_protocol = 'unknown' then 'routing' else 'routed' end then
      raise exception 'wrong route status for %: %', v_protocol, v_replay.status;
    end if;
  end loop;

  if exists(select 1 from private.comun_cultural_contribution_intakes where target_kind is not null or target_id is not null) then
    raise exception 'specialized target was created in A2-R1';
  end if;

  foreach v_table in array array['comun_archive_submissions','comun_archive_artwork_submissions','comun_archive_oral_history_suggestions','comun_radio_contributions','comun_archive_items'] loop
    if to_regclass('public.' || v_table) is not null then
      select row_count into v_before from r1_specialized_counts where table_name = v_table;
      execute format('select count(*) from public.%I', v_table) into v_after;
      if v_after <> v_before then raise exception 'specialized row count changed for %', v_table; end if;
    end if;
  end loop;

  if has_function_privilege('public','public.comun_get_cultural_contribution_intake_v1(text,text,uuid)','execute')
     or has_function_privilege('anon','public.comun_get_cultural_contribution_intake_v1(text,text,uuid)','execute')
     or has_function_privilege('authenticated','public.comun_get_cultural_contribution_intake_v1(text,text,uuid)','execute')
     or not has_function_privilege('service_role','public.comun_get_cultural_contribution_intake_v1(text,text,uuid)','execute') then
    raise exception 'read RPC execute grants are not service-role-only';
  end if;

  begin
    perform public.comun_create_cultural_contribution_intake_v1('rate test', 'r1-disposable', gen_random_uuid(), 'r1-rate-hash', null);
    perform public.comun_create_cultural_contribution_intake_v1('rate test', 'r1-disposable', gen_random_uuid(), 'r1-rate-hash', null);
    perform public.comun_create_cultural_contribution_intake_v1('rate test', 'r1-disposable', gen_random_uuid(), 'r1-rate-hash', null);
    perform public.comun_create_cultural_contribution_intake_v1('rate test', 'r1-disposable', gen_random_uuid(), 'r1-rate-hash', null);
    perform public.comun_create_cultural_contribution_intake_v1('rate test', 'r1-disposable', gen_random_uuid(), 'r1-rate-hash', null);
    perform public.comun_create_cultural_contribution_intake_v1('rate test', 'r1-disposable', gen_random_uuid(), 'r1-rate-hash', null);
    raise exception 'rate limit did not fire';
  exception when raise_exception then
    if sqlerrm <> 'rate_limited' then raise; end if;
  end;
end $$;

rollback;
