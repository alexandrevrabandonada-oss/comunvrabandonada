\set ON_ERROR_STOP on
select pg_catalog.set_config('comun.r3.actor_a', :'actor_a', false);
select pg_catalog.set_config('comun.r3.actor_b', :'actor_b', false);

do $$
declare v_sig text:='public.comun_relata_collective_entity_server_candidate_prepare(uuid,uuid,uuid)';
begin
  if pg_catalog.has_function_privilege('anon',v_sig,'EXECUTE')
    or pg_catalog.has_function_privilege('authenticated',v_sig,'EXECUTE')
    or not pg_catalog.has_function_privilege('service_role',v_sig,'EXECUTE')
    or pg_catalog.has_table_privilege('service_role',
      'private.comun_relata_collective_entity_candidates','SELECT')
    or pg_catalog.has_table_privilege('authenticated',
      'private.comun_relata_collective_entity_candidates','SELECT')
    or exists(select 1 from pg_catalog.pg_proc p,
      pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where p.oid=v_sig::pg_catalog.regprocedure and a.grantee=0 and a.privilege_type='EXECUTE')
    or not exists(select 1 from pg_catalog.pg_proc p where p.oid=v_sig::pg_catalog.regprocedure
      and p.prosecdef and p.proowner='postgres'::pg_catalog.regrole
      and 'search_path=pg_catalog'=any(p.proconfig)) then
    raise exception 'R3 bridge/table privilege contract failed';
  end if;
  if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like '%collective_entity_candidate%') then
    raise exception 'R3 public candidate relation appeared';
  end if;
  if (select pg_catalog.array_agg(a.attname::text order by a.attnum)
      from pg_catalog.pg_attribute a
      where a.attrelid='private.comun_relata_collective_entity_candidates'::pg_catalog.regclass
        and a.attnum>0 and not a.attisdropped) is distinct from array[
      'id','entity_id','generation_request_id','source_representation_id',
      'source_consent_id','candidate_version','candidate_state','public_name',
      'entity_type','generated_at','invalidated_at','invalidation_reason'] then
    raise exception 'R3 candidate column allowlist changed';
  end if;
end;
$$;

begin;
set local role service_role;
select entity_id as entity_a from public.comun_relata_collective_entity_server_create(
  '49200000-0000-4000-8000-000000000301',
  pg_catalog.current_setting('comun.r3.actor_a')::uuid,'Coletivo A privado','collective') \gset
select entity_id as entity_b from public.comun_relata_collective_entity_server_create(
  '49200000-0000-4000-8000-000000000302',
  pg_catalog.current_setting('comun.r3.actor_b')::uuid,'Coletivo B privado','association') \gset
select consent_id as consent_a from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r3.actor_a')::uuid, :'entity_a'::uuid,true) \gset
commit;

do $$
begin
  if (select count(*) from private.comun_relata_collective_entity_candidates)<>0 then
    raise exception 'R3 consent alone created candidate';
  end if;
end;
$$;

begin;
set local role service_role;
select candidate_id as candidate_a from public.comun_relata_collective_entity_server_candidate_prepare(
  '49200000-0000-4000-8000-000000000311',
  pg_catalog.current_setting('comun.r3.actor_a')::uuid, :'entity_a'::uuid) \gset
select candidate_id as replay_a from public.comun_relata_collective_entity_server_candidate_prepare(
  '49200000-0000-4000-8000-000000000311',
  pg_catalog.current_setting('comun.r3.actor_a')::uuid, :'entity_a'::uuid) \gset
commit;

do $$
declare
  a uuid:=pg_catalog.current_setting('comun.r3.actor_a')::uuid;
  b uuid:=pg_catalog.current_setting('comun.r3.actor_b')::uuid;
  ea uuid:=(select id from private.comun_relata_collective_entities where creation_request_id='49200000-0000-4000-8000-000000000301');
  eb uuid:=(select id from private.comun_relata_collective_entities where creation_request_id='49200000-0000-4000-8000-000000000302');
  ca uuid:=(select id from private.comun_relata_collective_entity_candidates where generation_request_id='49200000-0000-4000-8000-000000000311');
begin
  if ca is null or
    (select count(*) from private.comun_relata_collective_entity_candidates where entity_id=ea)<>1 or
    (select count(*) from private.comun_relata_collective_entity_candidates where entity_id=eb)<>0 or
    not exists(select 1 from private.comun_relata_collective_entity_candidates
      where id=ca and public_name='Coletivo A privado' and entity_type='collective'
        and candidate_state='pending_legitimacy' and source_consent_id=(select id from private.comun_relata_collective_entity_consents where entity_id=ea and active)) or
    (select count(*) from public.comun_relata_collective_entity_server_candidate_prepare(null,a,null))<>1 or
    (select count(*) from public.comun_relata_collective_entity_server_candidate_prepare(null,b,null))<>0 then
    raise exception 'R3 private snapshot, idempotency or owner list failed';
  end if;
  begin
    perform public.comun_relata_collective_entity_server_candidate_prepare(
      '49200000-0000-4000-8000-000000000311',b,ea);
    raise exception 'R3 cross-actor replay accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.comun_relata_collective_entity_server_candidate_prepare(
      '49200000-0000-4000-8000-000000000312',b,ea);
    raise exception 'R3 B prepared A entity';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.comun_relata_collective_entity_server_candidate_prepare(
      '49200000-0000-4000-8000-000000000313',a,ea);
    raise exception 'R3 duplicate active candidate accepted';
  exception when unique_violation then null;
  end;
  begin
    update private.comun_relata_collective_entity_candidates set public_name='Tampered' where id=ca;
    raise exception 'R3 immutable snapshot changed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r3.actor_a')::uuid, :'entity_a'::uuid,false);
commit;
do $$
begin
  if not exists(select 1 from private.comun_relata_collective_entity_candidates
    where generation_request_id='49200000-0000-4000-8000-000000000311' and candidate_state='invalidated'
      and invalidation_reason='CONSENT_REVOKED' and invalidated_at is not null) then
    raise exception 'R3 consent revoke did not preserve and invalidate candidate';
  end if;
end;
$$;

-- A separate B entity proves representation revocation's first causal reason.
begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r3.actor_b')::uuid, :'entity_b'::uuid,true);
select candidate_id as candidate_b from public.comun_relata_collective_entity_server_candidate_prepare(
  '49200000-0000-4000-8000-000000000314',
  pg_catalog.current_setting('comun.r3.actor_b')::uuid, :'entity_b'::uuid) \gset
select * from public.comun_relata_collective_entity_server_representation_revoke(
  pg_catalog.current_setting('comun.r3.actor_b')::uuid, :'entity_b'::uuid);
commit;
do $$
begin
  if not exists(select 1 from private.comun_relata_collective_entity_candidates
    where generation_request_id='49200000-0000-4000-8000-000000000314' and candidate_state='invalidated'
      and invalidation_reason='CONSENT_REVOKED') then
    raise exception 'R3 representation revoke did not retain first causal reason';
  end if;
end;
$$;

-- Direct transactional source transition covers the representation trigger.
-- The R2 owner runtime revokes consent first and retains CONSENT_REVOKED.
begin;
set local role service_role;
select entity_id as entity_rep from public.comun_relata_collective_entity_server_create(
  '49200000-0000-4000-8000-000000000317',
  pg_catalog.current_setting('comun.r3.actor_a')::uuid,'Coletivo representação','collective') \gset
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r3.actor_a')::uuid, :'entity_rep'::uuid,true);
select candidate_id as candidate_rep from public.comun_relata_collective_entity_server_candidate_prepare(
  '49200000-0000-4000-8000-000000000318',
  pg_catalog.current_setting('comun.r3.actor_a')::uuid, :'entity_rep'::uuid) \gset
commit;
begin;
update private.comun_relata_collective_entity_representations
  set status='revoked', revoked_at=pg_catalog.now(),
      revoked_by_user_id=pg_catalog.current_setting('comun.r3.actor_a')::uuid
  where entity_id=:'entity_rep'::uuid and user_id=pg_catalog.current_setting('comun.r3.actor_a')::uuid;
update private.comun_relata_collective_entity_consents
  set active=false, revoked_at=pg_catalog.now(),
      revoked_by_user_id=pg_catalog.current_setting('comun.r3.actor_a')::uuid
  where entity_id=:'entity_rep'::uuid and active;
commit;
do $$
begin
  if not exists(select 1 from private.comun_relata_collective_entity_candidates
    where generation_request_id='49200000-0000-4000-8000-000000000318'
      and candidate_state='invalidated' and invalidation_reason='REPRESENTATION_REVOKED')
    or exists(select 1 from private.comun_relata_collective_entity_consents
      where entity_id=(select id from private.comun_relata_collective_entities
        where creation_request_id='49200000-0000-4000-8000-000000000317') and active) then
    raise exception 'R3 representation-first invalidation failed';
  end if;
end;
$$;

-- Archive is exercised directly: R3 does not introduce a public archive route.
begin;
set local role service_role;
select entity_id as entity_archive from public.comun_relata_collective_entity_server_create(
  '49200000-0000-4000-8000-000000000315',
  pg_catalog.current_setting('comun.r3.actor_a')::uuid,'Coletivo arquivável','collective') \gset
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r3.actor_a')::uuid, :'entity_archive'::uuid,true);
select candidate_id as candidate_archive from public.comun_relata_collective_entity_server_candidate_prepare(
  '49200000-0000-4000-8000-000000000316',
  pg_catalog.current_setting('comun.r3.actor_a')::uuid, :'entity_archive'::uuid) \gset
commit;
update private.comun_relata_collective_entities set state='archived',
  archived_at=pg_catalog.now(), archived_by_user_id=pg_catalog.current_setting('comun.r3.actor_a')::uuid
  where id=:'entity_archive'::uuid;
do $$
begin
  if not exists(select 1 from private.comun_relata_collective_entity_candidates
    where generation_request_id='49200000-0000-4000-8000-000000000316' and candidate_state='invalidated'
      and invalidation_reason='ENTITY_ARCHIVED') then
    raise exception 'R3 archive did not invalidate candidate';
  end if;
end;
$$;
