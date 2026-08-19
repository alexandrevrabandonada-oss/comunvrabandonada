-- A3 disposable proof: run only against local/branch Supabase, never Production.
begin;

create temporary table a3_intakes(route_kind text primary key, protocol text not null, resume_hash text not null);
create temporary table a3_baseline(table_name text primary key, row_count bigint not null);

do $$
declare t text; n bigint;
begin
  foreach t in array array['comun_archive_submissions','comun_archive_artwork_submissions','comun_archive_oral_history_suggestions','comun_radio_contributions','comun_archive_items'] loop
    execute format('select count(*) from public.%I', t) into n;
    insert into a3_baseline values(t,n);
  end loop;
end $$;

do $$
declare r record; replay record; route text; p text; h text;
begin
  if has_function_privilege('anon','public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid)','execute')
     or has_function_privilege('authenticated','public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid)','execute')
     or not has_function_privilege('service_role','public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid)','execute') then
    raise exception 'A3 handoff RPC grants are not service-role-only';
  end if;
  if pg_get_function_result('public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid)'::regprocedure) ~* 'target_id|resume_token_hash|member_user_id' then
    raise exception 'A3 handoff result exposes an internal field';
  end if;

  foreach route in array array['photo_or_document','art','oral_history','radio','unknown'] loop
    h := 'a3-disposable-' || route;
    select * into r from public.comun_create_cultural_contribution_intake_v1(
      'Texto sintético A3 ' || route, 'a3-disposable', gen_random_uuid(), h,
      'a3f10000-0000-4000-8000-000000000001'::uuid);
    select * into replay from public.comun_route_cultural_contribution_intake_v1(r.public_protocol, route, h, null);
    if replay.route_kind <> route then raise exception 'route not stored for %', route; end if;
    insert into a3_intakes values(route,r.public_protocol,h);
    p := r.public_protocol;
    if exists(select 1 from public.comun_prepare_cultural_contribution_handoff_v1(p, 'wrong-hash', null)) then
      raise exception 'wrong token exposed %', route;
    end if;
    select * into r from public.comun_prepare_cultural_contribution_handoff_v1(p,h,null);
    if route='unknown' then
      if r.target_created or r.handoff_state <> 'handoff_pending' then raise exception 'unknown created target'; end if;
    else
      if not r.target_created or r.handoff_state <> 'handed_off' then raise exception 'safe route did not handoff: %', route; end if;
      select * into replay from public.comun_prepare_cultural_contribution_handoff_v1(p,h,null);
      if not replay.target_created or replay.target_kind <> r.target_kind then raise exception 'retry changed handoff: %', route; end if;
    end if;
  end loop;
end $$;

do $$
declare t text; before_count bigint; after_count bigint; route text; p text; h text; r record;
begin
  foreach route in array array['photo_or_document','art','oral_history','radio'] loop
    select protocol,resume_hash into p,h from a3_intakes where route_kind=route;
    select * into r from public.comun_prepare_cultural_contribution_handoff_v1(p,h,null);
    if not r.target_created then raise exception 'missing target %', route; end if;
  end loop;
  if exists(select 1 from private.comun_cultural_contribution_intakes where public_protocol in(select protocol from a3_intakes) and target_id is null and route_kind <> 'unknown') then
    raise exception 'known route has no private target link';
  end if;
  if exists(select 1 from public.comun_archive_items where title like '%Texto sintético A3%') then
    raise exception 'A3 created a public archive item';
  end if;
  foreach t in array array['comun_archive_submissions','comun_archive_artwork_submissions','comun_archive_oral_history_suggestions','comun_radio_contributions'] loop
    execute format('select row_count from a3_baseline where table_name=%L',t) into before_count;
    execute format('select count(*) from public.%I where created_at >= now()-interval ''5 minutes''',t) into after_count;
    if after_count < 1 then raise exception 'target missing from %',t; end if;
  end loop;
end $$;

savepoint a3_business_rollback;
do $$
declare r record; h text := 'a3-rollback-only';
begin
  select * into r from public.comun_create_cultural_contribution_intake_v1(
    'Rollback-only synthetic A3', 'a3-disposable', gen_random_uuid(), h, null);
  perform public.comun_route_cultural_contribution_intake_v1(r.public_protocol, 'radio', h, null);
  perform public.comun_prepare_cultural_contribution_handoff_v1(r.public_protocol, h, null);
end $$;
rollback to savepoint a3_business_rollback;

do $$
declare t text; before_count bigint; after_count bigint;
begin
  foreach t in array array['comun_archive_submissions','comun_archive_artwork_submissions','comun_archive_oral_history_suggestions','comun_radio_contributions','comun_archive_items'] loop
    execute format('select row_count from a3_baseline where table_name=%L',t) into before_count;
    execute format('select count(*) from public.%I',t) into after_count;
    if after_count <> before_count then raise exception 'businessWritesAfterRollback for %',t; end if;
  end loop;
end $$;

rollback;
