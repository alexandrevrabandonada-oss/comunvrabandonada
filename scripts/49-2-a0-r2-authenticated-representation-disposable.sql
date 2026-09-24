\set ON_ERROR_STOP on
select pg_catalog.set_config('comun.r2.actor_a', :'actor_a', false);
select pg_catalog.set_config('comun.r2.actor_b', :'actor_b', false);

do $$
declare
  v_bridge text;
  v_signature text;
  v_config text[];
begin
  for v_bridge, v_signature in
    select name, signature from (values
      ('create','public.comun_relata_collective_entity_server_create(uuid,uuid,text,text)'),
      ('consent','public.comun_relata_collective_entity_server_consent_set(uuid,uuid,boolean)'),
      ('revoke','public.comun_relata_collective_entity_server_representation_revoke(uuid,uuid)'),
      ('list','public.comun_relata_collective_entity_server_list_own(uuid)')
    ) as bridges(name,signature)
  loop
    if exists (
      select 1 from pg_catalog.pg_proc p,
        pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
      where p.oid=v_signature::pg_catalog.regprocedure
        and acl.grantee=0 and acl.privilege_type='EXECUTE'
    ) or pg_catalog.has_function_privilege('anon',v_signature,'EXECUTE')
       or pg_catalog.has_function_privilege('authenticated',v_signature,'EXECUTE')
       or not pg_catalog.has_function_privilege('service_role',v_signature,'EXECUTE') then
      raise exception 'R2 bridge grant invalid: %',v_bridge;
    end if;
    select p.proconfig into v_config from pg_catalog.pg_proc p
      where p.oid=v_signature::pg_catalog.regprocedure
        and p.prosecdef and p.proowner='postgres'::pg_catalog.regrole;
    if v_config is null or not 'search_path=pg_catalog'=any(v_config) then
      raise exception 'R2 bridge hardening invalid: %',v_bridge;
    end if;
  end loop;
  if pg_catalog.has_schema_privilege('anon','private','USAGE')
    or pg_catalog.has_schema_privilege('authenticated','private','USAGE')
    or pg_catalog.has_function_privilege('service_role',
      'private.comun_relata_collective_entity_create_internal(uuid,uuid,text,text)','EXECUTE') then
    raise exception 'R1 privacy regression';
  end if;
end;
$$;

begin;
set local role service_role;
select entity_id as entity_a from public.comun_relata_collective_entity_server_create(
  '49200000-0000-4000-8000-000000000201',
  pg_catalog.current_setting('comun.r2.actor_a')::uuid,
  'Coletivo privado A','collective'
) \gset
select entity_id as replay_a from public.comun_relata_collective_entity_server_create(
  '49200000-0000-4000-8000-000000000201',
  pg_catalog.current_setting('comun.r2.actor_a')::uuid,
  'Coletivo privado A','collective'
) \gset
select entity_id as entity_b from public.comun_relata_collective_entity_server_create(
  '49200000-0000-4000-8000-000000000202',
  pg_catalog.current_setting('comun.r2.actor_b')::uuid,
  'Coletivo privado B','collective'
) \gset
select consent_id as consent_a from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r2.actor_a')::uuid, :'entity_a'::uuid,true
) \gset
commit;
select pg_catalog.set_config('comun.r2.entity_a', :'entity_a', false);
select pg_catalog.set_config('comun.r2.entity_b', :'entity_b', false);
select pg_catalog.set_config('comun.r2.replay_a', :'replay_a', false);

do $$
declare
  a uuid:=pg_catalog.current_setting('comun.r2.actor_a')::uuid;
  b uuid:=pg_catalog.current_setting('comun.r2.actor_b')::uuid;
  ea uuid:=pg_catalog.current_setting('comun.r2.entity_a')::uuid;
  eb uuid:=pg_catalog.current_setting('comun.r2.entity_b')::uuid;
  v_count integer;
  v_candidate_exists boolean;
begin
  if ea<>pg_catalog.current_setting('comun.r2.replay_a')::uuid then
    raise exception 'R2 request replay changed entity';
  end if;
  if (select count(*) from public.comun_relata_collective_entity_server_list_own(a))<>1
    or (select count(*) from public.comun_relata_collective_entity_server_list_own(b))<>1
    or exists(select 1 from public.comun_relata_collective_entity_server_list_own(a) where entity_id=eb)
    or exists(select 1 from public.comun_relata_collective_entity_server_list_own(b) where entity_id=ea) then
    raise exception 'R2 owner listing leaked';
  end if;
  select count(*) into v_count from private.comun_relata_collective_entity_events
    where entity_id=ea and event_type in ('entity_created','representation_declared','consent_granted');
  if v_count<>3 then raise exception 'R2 initial audit not exactly once'; end if;
  begin
    perform public.comun_relata_collective_entity_server_create(
      '49200000-0000-4000-8000-000000000201',b,'Coletivo privado A','collective');
    raise exception 'cross-actor request accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.comun_relata_collective_entity_server_consent_set(b,ea,true);
    raise exception 'cross-actor consent accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.comun_relata_collective_entity_server_consent_set(b,ea,false);
    raise exception 'cross-actor withdrawal accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.comun_relata_collective_entity_server_representation_revoke(b,ea);
    raise exception 'cross-actor representation revoke accepted';
  exception when insufficient_privilege then null;
  end;
  if exists(select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and (c.relname like '%collective%candidate%'
        or c.relname like '%collective%map_feature%')) then
    raise exception 'R2 public side effect appeared';
  end if;
  if pg_catalog.to_regclass('private.comun_relata_collective_entity_candidates') is not null then
    execute 'select exists(select 1 from private.comun_relata_collective_entity_candidates)'
      into v_candidate_exists;
    if v_candidate_exists then raise exception 'R2 consent alone created candidate'; end if;
  end if;
end;
$$;

-- A second legitimate representative must not withdraw the first person's
-- private consent when using the authenticated owner bridge.
do $$
declare
  b uuid:=pg_catalog.current_setting('comun.r2.actor_b')::uuid;
  ea uuid:=pg_catalog.current_setting('comun.r2.entity_a')::uuid;
  r uuid;
begin
  insert into private.comun_relata_collective_entity_representations(entity_id,user_id)
    values(ea,b) returning id into r;
  insert into private.comun_relata_collective_entity_events(
    entity_id,representation_id,actor_user_id,event_type
  ) values(ea,r,b,'representation_declared');
  begin
    perform public.comun_relata_collective_entity_server_consent_set(b,ea,false);
    raise exception 'representative withdrew another consent';
  exception when insufficient_privilege then null;
  end;
  perform public.comun_relata_collective_entity_server_representation_revoke(b,ea);
  if not exists(select 1 from private.comun_relata_collective_entity_consents
      where entity_id=ea and active
        and consented_by_user_id=pg_catalog.current_setting('comun.r2.actor_a')::uuid) then
    raise exception 'revoking B withdrew A consent';
  end if;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_representation_revoke(
  pg_catalog.current_setting('comun.r2.actor_a')::uuid, :'entity_a'::uuid
);
commit;

do $$
declare
  a uuid:=pg_catalog.current_setting('comun.r2.actor_a')::uuid;
  ea uuid:=pg_catalog.current_setting('comun.r2.entity_a')::uuid;
  r text;
begin
  if exists(select 1 from private.comun_relata_collective_entity_consents
      where entity_id=ea and consented_by_user_id=a and active)
    or (select count(*) from private.comun_relata_collective_entity_events
        where entity_id=ea and event_type='consent_revoked')<>1
    or (select count(*) from private.comun_relata_collective_entity_events
        where entity_id=ea and event_type='representation_revoked'
          and actor_user_id=a)<>1 then
    raise exception 'R2 revoke left orphan consent or incorrect audit';
  end if;
  select representation_status into r from public.comun_relata_collective_entity_server_create(
    '49200000-0000-4000-8000-000000000201',a,'Coletivo privado A','collective');
  if r<>'revoked' then raise exception 'R2 replay resurrected representation'; end if;
  begin
    perform public.comun_relata_collective_entity_server_consent_set(a,ea,true);
    raise exception 'revoked representative reconsented';
  exception when insufficient_privilege then null;
  end;
  begin
    update private.comun_relata_collective_entity_events set event_type=event_type where entity_id=ea;
    raise exception 'R1 append-only audit changed';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from private.comun_relata_collective_entity_representations
      where entity_id=ea and user_id=a)<>1 then
    raise exception 'R2 replay duplicated representation';
  end if;
end;
$$;
\echo COMUN_49_2_A0_R2_DISPOSABLE_GREEN
