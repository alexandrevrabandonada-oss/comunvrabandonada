\set ON_ERROR_STOP on
select pg_catalog.set_config('comun.r5.actor_a', :'actor_a', false);
select pg_catalog.set_config('comun.r5.actor_b', :'actor_b', false);

insert into auth.users(id,aud,role,email) values
  ('49250000-0000-4000-8000-000000000001','authenticated','authenticated','r5-factual@example.invalid'),
  ('49250000-0000-4000-8000-000000000002','authenticated','authenticated','r5-admin-reviewer@example.invalid'),
  ('49250000-0000-4000-8000-000000000003','authenticated','authenticated','r5-publisher@example.invalid'),
  ('49250000-0000-4000-8000-000000000004','authenticated','authenticated','r5-factual-correction@example.invalid'),
  ('49250000-0000-4000-8000-000000000005','authenticated','authenticated','r5-viewer@example.invalid')
on conflict (id) do nothing;

insert into public.comun_admin_users(user_id,email,role,is_active) values
  ('49250000-0000-4000-8000-000000000001','r5-factual@example.invalid','viewer',true),
  ('49250000-0000-4000-8000-000000000002','r5-admin-reviewer@example.invalid','viewer',true),
  ('49250000-0000-4000-8000-000000000003','r5-publisher@example.invalid','viewer',true),
  ('49250000-0000-4000-8000-000000000004','r5-factual-correction@example.invalid','viewer',true),
  ('49250000-0000-4000-8000-000000000005','r5-viewer@example.invalid','viewer',true),
  (pg_catalog.current_setting('comun.r5.actor_a')::uuid,'r5-owner@example.invalid','viewer',true)
on conflict (user_id) do update set is_active=excluded.is_active;

insert into public.comun_admin_profiles(
  auth_user_id,display_name,email,role,active
) values
  ('49250000-0000-4000-8000-000000000001','R5 Factual','r5-factual@example.invalid','factual_reviewer',true),
  ('49250000-0000-4000-8000-000000000002','R5 Admin reviewer','r5-admin-reviewer@example.invalid','admin',true),
  ('49250000-0000-4000-8000-000000000003','R5 Publisher','r5-publisher@example.invalid','publisher',true),
  ('49250000-0000-4000-8000-000000000004','R5 Factual correction','r5-factual-correction@example.invalid','factual_reviewer',true),
  ('49250000-0000-4000-8000-000000000005','R5 Viewer','r5-viewer@example.invalid','viewer',true),
  (pg_catalog.current_setting('comun.r5.actor_a')::uuid,'R5 Owner publisher','r5-owner@example.invalid','publisher',true)
on conflict (email) do update set
  auth_user_id=excluded.auth_user_id,
  display_name=excluded.display_name,
  role=excluded.role,
  active=excluded.active;

do $$
declare
  queue_sig text:='public.comun_relata_collective_entity_server_projection_review_queue(uuid)';
  decide_sig text:='public.comun_relata_collective_entity_server_projection_decide(uuid,uuid,uuid,text,text)';
  owner_sig text:='public.comun_relata_entity_server_projection_list_own(uuid)';
begin
  if pg_catalog.has_table_privilege(
       'anon','public.comun_relata_collective_entity_public_projections','INSERT'
     )
     or pg_catalog.has_table_privilege(
       'authenticated','public.comun_relata_collective_entity_public_projections','UPDATE'
     )
     or not pg_catalog.has_table_privilege(
       'anon','public.comun_relata_collective_entity_public_projections','SELECT'
     )
     or not pg_catalog.has_table_privilege(
       'authenticated','public.comun_relata_collective_entity_public_projections','SELECT'
     )
     or pg_catalog.has_table_privilege(
       'service_role','private.comun_relata_collective_entity_projection_decisions','SELECT'
     )
     or pg_catalog.has_function_privilege('anon',queue_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',queue_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',queue_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',decide_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',decide_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',decide_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',owner_sig,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',owner_sig,'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role',owner_sig,'EXECUTE') then
    raise exception 'R5 privilege contract failed';
  end if;

  if (
    select pg_catalog.count(*)
      from information_schema.columns
     where table_schema='public'
       and table_name='comun_relata_collective_entity_public_projections'
  )<>4 then
    raise exception 'R5 public projection column count drifted';
  end if;

  if exists(
    select 1
      from information_schema.columns
     where table_schema='public'
       and table_name='comun_relata_collective_entity_public_projections'
       and column_name not in (
         'projection_id','public_name','entity_type','published_at'
       )
  ) then
    raise exception 'R5 public projection leaked a private column';
  end if;
end;
$$;

begin;
set local role service_role;
select entity_id as entity_a
  from public.comun_relata_collective_entity_server_create(
    '49250000-0000-4000-8000-000000000101',
    pg_catalog.current_setting('comun.r5.actor_a')::uuid,
    'Coletivo R5 Publicável','collective'
  ) \gset
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r5.actor_a')::uuid,
  :'entity_a'::uuid,true
);
select candidate_id as candidate_a
  from public.comun_relata_collective_entity_server_candidate_prepare(
    '49250000-0000-4000-8000-000000000102',
    pg_catalog.current_setting('comun.r5.actor_a')::uuid,
    :'entity_a'::uuid
  ) \gset
commit;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49250000-0000-4000-8000-000000000110',
  '49250000-0000-4000-8000-000000000001',
  :'candidate_a'::uuid,
  'entity_existence','supported','public_source',
  'https://example.invalid/r5-entity'
);
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49250000-0000-4000-8000-000000000111',
  '49250000-0000-4000-8000-000000000002',
  :'candidate_a'::uuid,
  'representation_legitimacy','supported',
  'operational_confirmation','COMUN-R5-INDEPENDENT-REPRESENTATION'
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
    raise exception 'R5 fixture did not reach R4 eligibility';
  end if;

  if not exists(
    select 1
      from public.comun_relata_collective_entity_server_projection_review_queue(
        '49250000-0000-4000-8000-000000000003'
      )
     where candidate_id=candidate
       and projection_state='not_published'
  ) then
    raise exception 'R5 independent publisher queue failed';
  end if;

  if exists(
    select 1
      from public.comun_relata_collective_entity_server_projection_review_queue(
        '49250000-0000-4000-8000-000000000002'
      )
     where candidate_id=candidate
  ) then
    raise exception 'R5 reviewer/publisher separation failed in queue';
  end if;

  begin
    perform public.comun_relata_collective_entity_server_projection_decide(
      '49250000-0000-4000-8000-000000000201',
      pg_catalog.current_setting('comun.r5.actor_a')::uuid,
      candidate,'approved',null
    );
    raise exception 'R5 owner self-publication accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_ENTITY_SELF_PUBLICATION_FORBIDDEN' then raise; end if;
  end;

  begin
    perform public.comun_relata_collective_entity_server_projection_decide(
      '49250000-0000-4000-8000-000000000202',
      '49250000-0000-4000-8000-000000000002',
      candidate,'approved',null
    );
    raise exception 'R5 R4 reviewer published candidate';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_ENTITY_PROJECTION_SEPARATION_REQUIRED' then raise; end if;
  end;

  begin
    perform public.comun_relata_collective_entity_server_projection_decide(
      '49250000-0000-4000-8000-000000000203',
      '49250000-0000-4000-8000-000000000005',
      candidate,'approved',null
    );
    raise exception 'R5 viewer published candidate';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_ENTITY_PUBLISHER_FORBIDDEN' then raise; end if;
  end;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_projection_decide(
  '49250000-0000-4000-8000-000000000210',
  '49250000-0000-4000-8000-000000000003',
  :'candidate_a'::uuid,
  'approved',null
);
select * from public.comun_relata_collective_entity_server_projection_decide(
  '49250000-0000-4000-8000-000000000210',
  '49250000-0000-4000-8000-000000000003',
  :'candidate_a'::uuid,
  'approved',null
);
commit;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49250000-0000-4000-8000-000000000102');
  projection uuid;
begin
  select registry.projection_id into projection
    from private.comun_relata_collective_entity_projection_registry registry
   where registry.candidate_id=candidate
     and registry.state='active';

  if projection is null then
    raise exception 'R5 registry did not activate';
  end if;

  if not exists(
    select 1
      from public.comun_relata_collective_entity_public_projections public_row
     where public_row.projection_id=projection
       and public_row.public_name='Coletivo R5 Publicável'
       and public_row.entity_type='collective'
  ) then
    raise exception 'R5 sanitized public projection missing';
  end if;

  if (
    select count(*)
      from private.comun_relata_collective_entity_projection_decisions
     where decision_request_id='49250000-0000-4000-8000-000000000210'
  )<>1 then
    raise exception 'R5 approval replay was not idempotent';
  end if;

  if (
    select count(*)
      from private.comun_relata_collective_entity_projection_events
     where candidate_id=candidate and event_type='published'
  )<>1 then
    raise exception 'R5 approval replay duplicated publication event';
  end if;

  if not exists(
    select 1
      from public.comun_relata_entity_server_projection_list_own(
        pg_catalog.current_setting('comun.r5.actor_a')::uuid
      )
     where candidate_id=candidate
       and projection_state='active'
       and projection_id=projection
  ) then
    raise exception 'R5 owner projection status failed';
  end if;

  begin
    update private.comun_relata_collective_entity_projection_decisions
       set decision='rejected'
     where decision_request_id='49250000-0000-4000-8000-000000000210';
    raise exception 'R5 decision update accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_ENTITY_PROJECTION_AUDIT_APPEND_ONLY' then raise; end if;
  end;

  begin
    delete from private.comun_relata_collective_entity_projection_events
     where candidate_id=candidate;
    raise exception 'R5 event delete accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_ENTITY_PROJECTION_AUDIT_APPEND_ONLY' then raise; end if;
  end;
end;
$$;

begin;
set local role anon;
select projection_id,public_name,entity_type,published_at
  from public.comun_relata_collective_entity_public_projections
 where public_name='Coletivo R5 Publicável';
commit;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49250000-0000-4000-8000-000000000211',
  '49250000-0000-4000-8000-000000000004',
  :'candidate_a'::uuid,
  'entity_existence','contested','insufficient_or_conflicting',
  'Conflicting source appeared after publication.'
);
commit;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49250000-0000-4000-8000-000000000102');
begin
  if exists(
    select 1 from public.comun_relata_collective_entity_public_projections
  ) then
    raise exception 'R5 eligibility loss did not retract public projection';
  end if;
  if not exists(
    select 1
      from private.comun_relata_collective_entity_projection_registry
     where candidate_id=candidate
       and state='withdrawn'
       and withdrawal_reason like 'LEGITIMACY_REVIEW_CHANGED:%'
  ) then
    raise exception 'R5 automatic legitimacy withdrawal was not audited';
  end if;
  if not exists(
    select 1
      from private.comun_relata_collective_entity_projection_events
     where candidate_id=candidate
       and event_type='withdrawn'
       and decision_request_id is null
  ) then
    raise exception 'R5 automatic withdrawal event missing';
  end if;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_candidate_review(
  '49250000-0000-4000-8000-000000000212',
  '49250000-0000-4000-8000-000000000001',
  :'candidate_a'::uuid,
  'entity_existence','supported','public_source',
  'https://example.invalid/r5-entity-restored'
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
    raise exception 'R5 fixture did not regain eligibility';
  end if;
  if exists(
    select 1 from public.comun_relata_collective_entity_public_projections
  ) then
    raise exception 'R5 eligibility regain auto-republished without publisher';
  end if;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_projection_decide(
  '49250000-0000-4000-8000-000000000220',
  '49250000-0000-4000-8000-000000000003',
  :'candidate_a'::uuid,
  'approved',null
);
select * from public.comun_relata_collective_entity_server_projection_decide(
  '49250000-0000-4000-8000-000000000221',
  '49250000-0000-4000-8000-000000000003',
  :'candidate_a'::uuid,
  'withdrawn','Publisher manual withdrawal for R5 proof.'
);
select * from public.comun_relata_collective_entity_server_projection_decide(
  '49250000-0000-4000-8000-000000000222',
  '49250000-0000-4000-8000-000000000003',
  :'candidate_a'::uuid,
  'approved',null
);
commit;

do $$
begin
  if (select count(*) from public.comun_relata_collective_entity_public_projections)<>1 then
    raise exception 'R5 manual withdrawal/reapproval cycle failed';
  end if;
end;
$$;

begin;
set local role service_role;
select * from public.comun_relata_collective_entity_server_consent_set(
  pg_catalog.current_setting('comun.r5.actor_a')::uuid,
  :'entity_a'::uuid,false
);
commit;

do $$
declare
  candidate uuid:=(select id
    from private.comun_relata_collective_entity_candidates
    where generation_request_id='49250000-0000-4000-8000-000000000102');
begin
  if exists(
    select 1 from public.comun_relata_collective_entity_public_projections
  ) then
    raise exception 'R5 source invalidation left a public projection';
  end if;
  if not exists(
    select 1
      from private.comun_relata_collective_entity_projection_registry
     where candidate_id=candidate
       and state='withdrawn'
       and withdrawal_reason like 'CONSENT_REVOKED:%'
  ) then
    raise exception 'R5 source withdrawal was not audited';
  end if;
  if not exists(
    select 1
      from public.comun_relata_entity_server_projection_list_own(
        pg_catalog.current_setting('comun.r5.actor_a')::uuid
      )
     where candidate_id=candidate
       and projection_state='withdrawn'
  ) then
    raise exception 'R5 owner did not see withdrawn projection state';
  end if;

  begin
    perform public.comun_relata_collective_entity_server_projection_decide(
      '49250000-0000-4000-8000-000000000230',
      '49250000-0000-4000-8000-000000000003',
      candidate,'approved',null
    );
    raise exception 'R5 invalidated candidate was republished';
  exception when insufficient_privilege then
    if sqlerrm<>'COMUN_RELATA_ENTITY_PROJECTION_NOT_ELIGIBLE' then raise; end if;
  end;
end;
$$;
