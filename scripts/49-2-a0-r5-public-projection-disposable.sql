\set ON_ERROR_STOP on
select pg_catalog.set_config('comun.r5.actor_a', :'actor_a', false);
select pg_catalog.set_config('comun.r5.actor_b', :'actor_b', false);

insert into auth.users(id,aud,role,email) values
  ('49250000-0000-4000-8000-000000000001','authenticated','authenticated','r5-reviewer-factual@example.invalid'),
  ('49250000-0000-4000-8000-000000000002','authenticated','authenticated','r5-reviewer-editor@example.invalid'),
  ('49250000-0000-4000-8000-000000000003','authenticated','authenticated','r5-publisher@example.invalid')
on conflict (id) do nothing;

insert into public.comun_admin_users(user_id,email,role,is_active) values
  ('49250000-0000-4000-8000-000000000001','r5-reviewer-factual@example.invalid','viewer',true),
  ('49250000-0000-4000-8000-000000000002','r5-reviewer-editor@example.invalid','viewer',true),
  ('49250000-0000-4000-8000-000000000003','r5-publisher@example.invalid','viewer',true),
  (pg_catalog.current_setting('comun.r5.actor_a')::uuid,'r5-owner-publisher@example.invalid','viewer',true)
on conflict (user_id) do update set is_active=excluded.is_active;

insert into public.comun_admin_profiles(
  auth_user_id,display_name,email,role,active
) values
  ('49250000-0000-4000-8000-000000000001','R5 factual reviewer','r5-reviewer-factual@example.invalid','factual_reviewer',true),
  ('49250000-0000-4000-8000-000000000002','R5 editor reviewer','r5-reviewer-editor@example.invalid','editor',true),
  ('49250000-0000-4000-8000-000000000003','R5 publisher','r5-publisher@example.invalid','publisher',true),
  (pg_catalog.current_setting('comun.r5.actor_a')::uuid,'R5 owner publisher','r5-owner-publisher@example.invalid','publisher',true)
on conflict (email) do update set
  auth_user_id=excluded.auth_user_id,
  display_name=excluded.display_name,
  role=excluded.role,
  active=excluded.active;

do $$
declare
  queue_sig text:='public.comun_relata_collective_entity_server_projection_review_queue(uuid)';
  decide_sig text:='public.comun_relata_collective_entity_server_projection_decide(uuid,uuid,uuid,text,text)';
  list_sig text:='public.comun_relata_collective_entity_server_public_projection_list()';
begin
  if pg_catalog.has_table_privilege(
       'service_role',
       'private.comun_relata_collective_entity_projection_decisions',
       'SELECT'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'private.comun_relata_collective_entity_projection_decisions',
       'SELECT'
     )
     or pg_catalog.has_table_privilege(
       'service_role',
       'public.comun_relata_collective_entity_public_projections',
       'SELECT'
     )
     or pg_catalog.has_table_privilege(
       'anon',
       'public.comun_relata_collective_entity_public_projections',
       'SELECT'
     )
     or pg_catalog.has_function_privilege('anon',queue_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',queue_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',queue_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',decide_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',decide_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',decide_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',list_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',list_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',list_sig,'EXECUTE') then
    raise exception 'R5 privilege contract failed';
  end if;
end;
$$;

begin;
set local role service_role;
select entity_id as entity_r5
  from public.comun_relata_collective_entity_server_create(
    '49250000-0000-4000-8000-000000000101',
    pg_catalog.current_setting('comun.r5.actor_a')::uuid,
    'Coletivo R5 A','collective'
  ) \gset
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r5.actor_a')::uuid,
  :'entity_r5'::uuid,true
);
select candidate_id as candidate_r5
  from public.comun_relata_collective_entity_server_candidate_prepare(
    '49250000-0000-4000-8000-000000000102',
    pg_catalog.current_setting('comun.r5.actor_a')::uuid,
    :'entity_r5'::uuid
  ) \gset
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49250000-0000-4000-8000-000000000110',
  '49250000-0000-4000-8000-000000000001',
  :'candidate_r5'::uuid,
  'entity_existence','supported','public_source',
  'https://example.invalid/r5-entity'
);
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49250000-0000-4000-8000-000000000111',
  '49250000-0000-4000-8000-000000000002',
  :'candidate_r5'::uuid,
  'representation_legitimacy','supported',
  'operational_confirmation','COMUN-R5-REPRESENTATION'
);
commit;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49250000-0000-4000-8000-000000000102');
begin
  if not exists(
    select 1
      from private.comun_relata_candidate_legitimacy_snapshot(candidate)
     where eligibility_state='eligible_for_projection_review'
  ) then
    raise exception 'R5 requires exact R4 eligibility';
  end if;

  if not exists(
    select 1
      from public.comun_relata_collective_entity_server_projection_review_queue(
        '49250000-0000-4000-8000-000000000003'
      ) queue
     where queue.candidate_id=candidate
       and queue.projection_decision_state='pending'
       and queue.projection_state='not_published'
  ) then
    raise exception 'R5 publisher queue failed';
  end if;

  begin
    perform public.comun_relata_collective_entity_server_projection_review_queue(
      '49250000-0000-4000-8000-000000000001'
    );
    raise exception 'R5 reviewer entered publisher queue';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_CANDIDATE_PUBLISHER_FORBIDDEN' then raise; end if;
  end;

  begin
    perform public.comun_relata_collective_entity_server_projection_decide(
      '49250000-0000-4000-8000-000000000120',
      pg_catalog.current_setting('comun.r5.actor_a')::uuid,
      candidate,'publish','Owner cannot publish own representation.'
    );
    raise exception 'R5 owner self-published';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_PROJECTION_SELF_PUBLISH_FORBIDDEN' then raise; end if;
  end;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_projection_decide(
  '49250000-0000-4000-8000-000000000121',
  '49250000-0000-4000-8000-000000000003',
  :'candidate_r5'::uuid,
  'publish','Independent publisher approved only the sanitized entity snapshot.'
);
select * from public.comun_relata_collective_entity_server_projection_decide(
  '49250000-0000-4000-8000-000000000121',
  '49250000-0000-4000-8000-000000000003',
  :'candidate_r5'::uuid,
  'publish','Independent publisher approved only the sanitized entity snapshot.'
);
commit;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49250000-0000-4000-8000-000000000102');
begin
  if (select count(*)
      from private.comun_relata_collective_entity_projection_decisions
      where decision_request_id='49250000-0000-4000-8000-000000000121')<>1 then
    raise exception 'R5 decision replay was not idempotent';
  end if;

  if not exists(
    select 1
      from public.comun_relata_collective_entity_public_projections
     where candidate_id=candidate
       and projection_state='active'
       and public_name='Coletivo R5 A'
       and entity_type='collective'
  ) then
    raise exception 'R5 active projection missing';
  end if;

  if (select count(*)
      from public.comun_relata_collective_entity_server_public_projection_list())<>1 then
    raise exception 'R5 sanitized public list failed';
  end if;

  begin
    perform public.comun_relata_collective_entity_server_projection_decide(
      '49250000-0000-4000-8000-000000000121',
      '49250000-0000-4000-8000-000000000003',
      candidate,'reject','Conflicting replay must fail.'
    );
    raise exception 'R5 conflicting replay accepted';
  exception when invalid_parameter_value then
    if sqlerrm<>'COMUN_RELATA_PROJECTION_DECISION_REQUEST_CONFLICT' then raise; end if;
  end;

  begin
    update private.comun_relata_collective_entity_projection_decisions
       set rationale_private='mutated'
     where decision_request_id='49250000-0000-4000-8000-000000000121';
    raise exception 'R5 decision update accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_PROJECTION_DECISION_APPEND_ONLY' then raise; end if;
  end;

  begin
    delete from private.comun_relata_collective_entity_projection_decisions
     where decision_request_id='49250000-0000-4000-8000-000000000121';
    raise exception 'R5 decision delete accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_PROJECTION_DECISION_APPEND_ONLY' then raise; end if;
  end;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49250000-0000-4000-8000-000000000130',
  '49250000-0000-4000-8000-000000000001',
  :'candidate_r5'::uuid,
  'entity_existence','contested','insufficient_or_conflicting',
  'A later conflict must suppress the public projection.'
);
commit;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49250000-0000-4000-8000-000000000102');
begin
  if not exists(
    select 1
      from public.comun_relata_collective_entity_public_projections
     where candidate_id=candidate
       and projection_state='suppressed'
       and suppression_reason='LEGITIMACY_CONTESTED'
  ) then
    raise exception 'R5 contestation did not suppress projection';
  end if;
  if exists(
    select 1
      from public.comun_relata_collective_entity_server_public_projection_list()
  ) then
    raise exception 'R5 suppressed projection leaked to public list';
  end if;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49250000-0000-4000-8000-000000000131',
  '49250000-0000-4000-8000-000000000001',
  :'candidate_r5'::uuid,
  'entity_existence','supported','public_source',
  'https://example.invalid/r5-entity-restored'
);
select * from public.comun_relata_collective_entity_server_projection_decide(
  '49250000-0000-4000-8000-000000000132',
  '49250000-0000-4000-8000-000000000003',
  :'candidate_r5'::uuid,
  'publish','A new publisher decision is required after legitimacy is restored.'
);
commit;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49250000-0000-4000-8000-000000000102');
begin
  if not exists(
    select 1
      from public.comun_relata_collective_entity_public_projections
     where candidate_id=candidate
       and projection_state='active'
       and suppression_reason is null
  ) then
    raise exception 'R5 explicit republication failed';
  end if;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r5.actor_a')::uuid,
  :'entity_r5'::uuid,false
);
commit;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49250000-0000-4000-8000-000000000102');
begin
  if not exists(
    select 1
      from private.comun_relata_collective_entity_candidates
     where id=candidate and candidate_state='invalidated'
  ) then
    raise exception 'R5 source revocation did not invalidate R3 candidate';
  end if;

  if not exists(
    select 1
      from public.comun_relata_collective_entity_public_projections
     where candidate_id=candidate
       and projection_state='suppressed'
       and suppression_reason='CANDIDATE_INVALIDATED'
  ) then
    raise exception 'R5 candidate invalidation did not suppress projection';
  end if;

  if exists(
    select 1
      from public.comun_relata_collective_entity_server_public_projection_list()
  ) then
    raise exception 'R5 invalidated projection leaked to public list';
  end if;
end;
$$;
