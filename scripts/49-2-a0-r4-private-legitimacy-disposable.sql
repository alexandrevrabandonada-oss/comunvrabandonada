\set ON_ERROR_STOP on
select pg_catalog.set_config('comun.r4.actor_a', :'actor_a', false);
select pg_catalog.set_config('comun.r4.actor_b', :'actor_b', false);

insert into auth.users(id,aud,role,email) values
  ('49240000-0000-4000-8000-000000000001','authenticated','authenticated','reviewer-factual@example.invalid'),
  ('49240000-0000-4000-8000-000000000002','authenticated','authenticated','reviewer-editorial@example.invalid'),
  ('49240000-0000-4000-8000-000000000003','authenticated','authenticated','reviewer-viewer@example.invalid')
on conflict (id) do nothing;

insert into public.comun_admin_users(user_id,email,role,is_active) values
  ('49240000-0000-4000-8000-000000000001','reviewer-factual@example.invalid','viewer',true),
  ('49240000-0000-4000-8000-000000000002','reviewer-editorial@example.invalid','viewer',true),
  ('49240000-0000-4000-8000-000000000003','reviewer-viewer@example.invalid','viewer',true),
  (pg_catalog.current_setting('comun.r4.actor_a')::uuid,'owner-self-review@example.invalid','viewer',true)
on conflict (user_id) do update set is_active=excluded.is_active;

insert into public.comun_admin_profiles(
  auth_user_id,display_name,email,role,active
) values
  ('49240000-0000-4000-8000-000000000001','Factual R4','reviewer-factual@example.invalid','factual_reviewer',true),
  ('49240000-0000-4000-8000-000000000002','Editor factual R4','reviewer-editorial@example.invalid','editor',true),
  ('49240000-0000-4000-8000-000000000003','Viewer R4','reviewer-viewer@example.invalid','viewer',true),
  (pg_catalog.current_setting('comun.r4.actor_a')::uuid,'Owner self reviewer','owner-self-review@example.invalid','factual_reviewer',true)
on conflict (email) do update set
  auth_user_id=excluded.auth_user_id,
  display_name=excluded.display_name,
  role=excluded.role,
  active=excluded.active;

do $$
declare
  review_sig text:='public.comun_relata_collective_entity_server_candidate_review(uuid,uuid,uuid,text,text,text,text)';
  queue_sig text:='public.comun_relata_collective_entity_server_candidate_review_queue(uuid)';
  owner_sig text:='public.comun_relata_collective_entity_server_candidate_legitimacy_list_own(uuid)';
begin
  if pg_catalog.has_table_privilege(
       'service_role',
       'private.comun_relata_collective_entity_candidate_reviews',
       'SELECT'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'private.comun_relata_collective_entity_candidate_reviews',
       'SELECT'
     )
     or pg_catalog.has_function_privilege('anon',review_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',review_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',review_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',queue_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',queue_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',queue_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',owner_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',owner_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',owner_sig,'EXECUTE') then
    raise exception 'R4 privilege contract failed';
  end if;
  if exists(
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname like '%collective_entity%legitim%'
  ) then
    raise exception 'R4 public legitimacy relation appeared';
  end if;
end;
$$;

begin;
set local role service_role;
select entity_id as entity_a
  from public.comun_relata_collective_entity_server_create(
    '49240000-0000-4000-8000-000000000101',
    pg_catalog.current_setting('comun.r4.actor_a')::uuid,
    'Coletivo R4 A','collective'
  ) \gset
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r4.actor_a')::uuid,
  :'entity_a'::uuid,true
);
select candidate_id as candidate_a
  from public.comun_relata_collective_entity_server_candidate_prepare(
    '49240000-0000-4000-8000-000000000102',
    pg_catalog.current_setting('comun.r4.actor_a')::uuid,
    :'entity_a'::uuid
  ) \gset
commit;

do $$
declare
  owner_a uuid:=pg_catalog.current_setting('comun.r4.actor_a')::uuid;
  owner_b uuid:=pg_catalog.current_setting('comun.r4.actor_b')::uuid;
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49240000-0000-4000-8000-000000000102');
begin
  if not exists(
    select 1
    from public.comun_relata_collective_entity_server_candidate_legitimacy_list_own(owner_a) state
    where state.candidate_id=candidate
      and state.entity_existence_state='pending'
      and state.representation_legitimacy_state='pending'
      and state.eligibility_state='pending_review'
  ) then
    raise exception 'R4 initial owner state failed';
  end if;
  if exists(
    select 1
    from public.comun_relata_collective_entity_server_candidate_legitimacy_list_own(owner_b)
    where candidate_id=candidate
  ) then
    raise exception 'R4 owner isolation failed';
  end if;
  if not exists(
    select 1
    from public.comun_relata_collective_entity_server_candidate_review_queue(
      '49240000-0000-4000-8000-000000000001'
    ) queue
    where queue.candidate_id=candidate
      and queue.eligibility_state='pending_review'
  ) then
    raise exception 'R4 reviewer queue failed';
  end if;
end;
$$;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49240000-0000-4000-8000-000000000102');
begin
  begin
    perform public.comun_relata_collective_entity_server_candidate_review(
      '49240000-0000-4000-8000-000000000110',
      pg_catalog.current_setting('comun.r4.actor_a')::uuid,
      candidate,'entity_existence','supported','public_source',
      'https://example.invalid/self-review'
    );
    raise exception 'R4 self review accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_CANDIDATE_SELF_REVIEW_FORBIDDEN' then raise; end if;
  end;

  begin
    perform public.comun_relata_collective_entity_server_candidate_review(
      '49240000-0000-4000-8000-000000000111',
      '49240000-0000-4000-8000-000000000003',
      candidate,'entity_existence','supported','public_source',
      'https://example.invalid/viewer'
    );
    raise exception 'R4 viewer review accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_CANDIDATE_REVIEWER_FORBIDDEN' then raise; end if;
  end;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49240000-0000-4000-8000-000000000120',
  '49240000-0000-4000-8000-000000000001',
  :'candidate_a'::uuid,
  'entity_existence','supported','public_source',
  'https://example.invalid/coletivo-r4-a'
);
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49240000-0000-4000-8000-000000000120',
  '49240000-0000-4000-8000-000000000001',
  :'candidate_a'::uuid,
  'entity_existence','supported','public_source',
  'https://example.invalid/coletivo-r4-a'
);
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49240000-0000-4000-8000-000000000121',
  '49240000-0000-4000-8000-000000000001',
  :'candidate_a'::uuid,
  'representation_legitimacy','supported',
  'operational_confirmation','COMUN-R4-SAME-REVIEWER'
);
commit;

do $
declare
  candidate uuid:=:'candidate_a'::uuid;
begin
  if not exists(
    select 1 from private.comun_relata_candidate_legitimacy_snapshot(candidate)
    where entity_existence_state='supported'
      and representation_legitimacy_state='supported'
      and eligibility_state='needs_independent_review'
  ) then
    raise exception 'R4 same-reviewer eligibility was not blocked';
  end if;

  perform public.comun_relata_collective_entity_server_candidate_review(
    '49240000-0000-4000-8000-000000000123',
    '49240000-0000-4000-8000-000000000002',
    candidate,'representation_legitimacy','needs_evidence',
    'insufficient_or_conflicting',null
  );


  if (select count(*) from private.comun_relata_collective_entity_candidate_reviews
      where review_request_id='49240000-0000-4000-8000-000000000120')<>1 then
    raise exception 'R4 review idempotency failed';
  end if;
  if not exists(
    select 1 from private.comun_relata_candidate_legitimacy_snapshot(candidate)
    where entity_existence_state='supported'
      and representation_legitimacy_state='needs_evidence'
      and eligibility_state='needs_evidence'
  ) then
    raise exception 'R4 needs-evidence derivation failed';
  end if;

  begin
    perform public.comun_relata_collective_entity_server_candidate_review(
      '49240000-0000-4000-8000-000000000120',
      '49240000-0000-4000-8000-000000000001',
      candidate,'entity_existence','unsupported','public_source',
      'https://example.invalid/conflict'
    );
    raise exception 'R4 conflicting idempotent request accepted';
  exception when invalid_parameter_value then
    if sqlerrm<>'COMUN_RELATA_CANDIDATE_REVIEW_REQUEST_CONFLICT' then raise; end if;
  end;

  begin
    update private.comun_relata_collective_entity_candidate_reviews
      set decision='unsupported'
      where review_request_id='49240000-0000-4000-8000-000000000120';
    raise exception 'R4 review update accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_CANDIDATE_REVIEW_APPEND_ONLY' then raise; end if;
  end;

  begin
    delete from private.comun_relata_collective_entity_candidate_reviews
      where review_request_id='49240000-0000-4000-8000-000000000120';
    raise exception 'R4 review delete accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_CANDIDATE_REVIEW_APPEND_ONLY' then raise; end if;
  end;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49240000-0000-4000-8000-000000000124',
  '49240000-0000-4000-8000-000000000002',
  :'candidate_a'::uuid,
  'representation_legitimacy','supported',
  'operational_confirmation','COMUN-R4-OPERATIONAL-CONFIRMATION'
);
commit;

do $$
begin
  if not exists(
    select 1
    from private.comun_relata_candidate_legitimacy_snapshot(:'candidate_a'::uuid)
    where entity_existence_state='supported'
      and representation_legitimacy_state='supported'
      and eligibility_state='eligible_for_projection_review'
  ) then
    raise exception 'R4 eligibility derivation failed';
  end if;
  if not exists(
    select 1 from private.comun_relata_collective_entity_candidates
    where id=:'candidate_a'::uuid and candidate_state='pending_legitimacy'
  ) then
    raise exception 'R4 mutated R3 candidate state';
  end if;
end;
$$;

begin;
set local role service_role;
select entity_id as entity_b
  from public.comun_relata_collective_entity_server_create(
    '49240000-0000-4000-8000-000000000130',
    pg_catalog.current_setting('comun.r4.actor_b')::uuid,
    'Coletivo R4 B','association'
  ) \gset
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r4.actor_b')::uuid,
  :'entity_b'::uuid,true
);
select candidate_id as candidate_b
  from public.comun_relata_collective_entity_server_candidate_prepare(
    '49240000-0000-4000-8000-000000000131',
    pg_catalog.current_setting('comun.r4.actor_b')::uuid,
    :'entity_b'::uuid
  ) \gset
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49240000-0000-4000-8000-000000000132',
  '49240000-0000-4000-8000-000000000001',
  :'candidate_b'::uuid,
  'entity_existence','contested','insufficient_or_conflicting',
  'Conflicting public records require another verification.'
);
commit;

do $$
begin
  if not exists(
    select 1
    from private.comun_relata_candidate_legitimacy_snapshot(:'candidate_b'::uuid)
    where entity_existence_state='contested'
      and eligibility_state='contested'
  ) then
    raise exception 'R4 contested precedence failed';
  end if;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r4.actor_a')::uuid,
  :'entity_a'::uuid,false
);
commit;

do $$
begin
  if not exists(
    select 1
    from public.comun_relata_collective_entity_server_candidate_legitimacy_list_own(
      pg_catalog.current_setting('comun.r4.actor_a')::uuid
    )
    where candidate_id=:'candidate_a'::uuid
      and candidate_state='invalidated'
      and eligibility_state='invalidated'
  ) then
    raise exception 'R4 source invalidation did not dominate eligibility';
  end if;

  begin
    perform public.comun_relata_collective_entity_server_candidate_review(
      '49240000-0000-4000-8000-000000000140',
      '49240000-0000-4000-8000-000000000001',
      :'candidate_a'::uuid,
      'entity_existence','supported','public_source',
      'https://example.invalid/after-invalidation'
    );
    raise exception 'R4 reviewed invalidated candidate';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_CANDIDATE_REVIEW_UNAVAILABLE' then raise; end if;
  end;
end;
$$;
