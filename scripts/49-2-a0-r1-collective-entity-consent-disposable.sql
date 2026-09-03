begin;

insert into auth.users(id,aud,role,email) values
  ('49200000-0000-4000-8000-000000000001','authenticated','authenticated','entity-representative@example.invalid'),
  ('49200000-0000-4000-8000-000000000002','authenticated','authenticated','entity-outsider@example.invalid');

do $$
declare
  v_actor uuid:='49200000-0000-4000-8000-000000000001';
  v_outsider uuid:='49200000-0000-4000-8000-000000000002';
  v_entity uuid;
  v_entity_duplicate uuid;
  v_representation uuid;
  v_consent uuid;
  v_consent_duplicate uuid;
  v_revoked_consent uuid;
  v_revoked_duplicate uuid;
  v_revoked_at timestamptz;
  v_revoked_duplicate_at timestamptz;
  v_table text;
  v_role text;
  v_privilege text;
begin
  select entity_id,representation_id
    into v_entity,v_representation
    from private.comun_relata_collective_entity_create_internal(
      '49200000-0000-4000-8000-000000000101',
      v_actor,
      'Coletivo de teste descartável',
      'collective'
    );
  select entity_id
    into v_entity_duplicate
    from private.comun_relata_collective_entity_create_internal(
      '49200000-0000-4000-8000-000000000101',
      v_actor,
      'Coletivo de teste descartável',
      'collective'
    );
  if v_entity is null or v_entity_duplicate<>v_entity then
    raise exception 'creation idempotency failed';
  end if;

  begin
    perform private.comun_relata_collective_entity_create_internal(
      '49200000-0000-4000-8000-000000000101',
      v_actor,
      'Mesmo request com outro nome',
      'collective'
    );
    raise exception 'request payload conflict unexpectedly accepted';
  exception when invalid_parameter_value then
    null;
  end;

  select consent_id
    into v_consent
    from private.comun_relata_collective_entity_consent_set_internal(
      v_actor,v_entity,true
    );
  select consent_id
    into v_consent_duplicate
    from private.comun_relata_collective_entity_consent_set_internal(
      v_actor,v_entity,true
    );
  if v_consent is null or v_consent_duplicate<>v_consent
    or (select count(*) from private.comun_relata_collective_entity_consents
        where entity_id=v_entity and active)<>1 then
    raise exception 'active consent idempotency failed';
  end if;

  begin
    perform private.comun_relata_collective_entity_consent_set_internal(
      v_outsider,v_entity,true
    );
    raise exception 'outsider consent unexpectedly accepted';
  exception when insufficient_privilege then
    null;
  end;

  update private.comun_relata_collective_entity_representations
     set status='revoked',revoked_at=pg_catalog.now(),revoked_by_user_id=v_actor
   where id=v_representation;
  update private.comun_relata_collective_entities
     set state='archived',
         archived_at=pg_catalog.now(),
         archived_by_user_id=v_actor
   where id=v_entity;

  select consent_id,revoked_at
    into v_revoked_consent,v_revoked_at
    from private.comun_relata_collective_entity_consent_set_internal(
      v_actor,v_entity,false
    );
  select consent_id,revoked_at
    into v_revoked_duplicate,v_revoked_duplicate_at
    from private.comun_relata_collective_entity_consent_set_internal(
      v_actor,v_entity,false
    );
  if v_revoked_consent<>v_consent
    or v_revoked_duplicate<>v_consent
    or v_revoked_at is null
    or v_revoked_duplicate_at<>v_revoked_at
    or exists(
      select 1 from private.comun_relata_collective_entity_consents
       where entity_id=v_entity and active
    )
    or (select count(*) from private.comun_relata_collective_entity_events
         where entity_id=v_entity and event_type='consent_revoked')<>1 then
    raise exception 'revocation did not remain possible and idempotent';
  end if;

  if (select count(*) from private.comun_relata_collective_entity_events
       where entity_id=v_entity
         and event_type in ('consent_granted','consent_revoked')
         and consent_scope='sanitized_entity_projection'
         and consent_notice_sha256='0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae')<>2 then
    raise exception 'consent audit does not pin scope and notice';
  end if;
  if (select count(*) from private.comun_relata_collective_entity_events
       where entity_id=v_entity and event_type='representation_revoked')<>1
     or (select count(*) from private.comun_relata_collective_entity_events
       where entity_id=v_entity and event_type='entity_archived')<>1 then
    raise exception 'representation or entity state transition was not audited';
  end if;

  begin
    insert into private.comun_relata_collective_entity_events(
      entity_id,actor_user_id,event_type
    ) values(v_entity,v_actor,'consent_granted');
    raise exception 'malformed consent event unexpectedly accepted';
  exception when check_violation then
    null;
  end;

  foreach v_table in array array[
    'private.comun_relata_collective_entities',
    'private.comun_relata_collective_entity_representations',
    'private.comun_relata_collective_entity_consents',
    'private.comun_relata_collective_entity_events'
  ] loop
    if not (
      select relrowsecurity and relforcerowsecurity
        from pg_class
       where oid=v_table::regclass
    ) then
      raise exception 'RLS not forced for %',v_table;
    end if;
    foreach v_role in array array['anon','authenticated','service_role'] loop
      foreach v_privilege in array array['SELECT','INSERT','UPDATE','DELETE'] loop
        if has_table_privilege(v_role,v_table,v_privilege) then
          raise exception 'runtime % retains % on %',v_role,v_privilege,v_table;
        end if;
      end loop;
    end loop;
  end loop;

  foreach v_role in array array['anon','authenticated','service_role'] loop
    if has_function_privilege(
      v_role,
      'private.comun_relata_collective_entity_create_internal(uuid,uuid,text,text)',
      'EXECUTE'
    ) or has_function_privilege(
      v_role,
      'private.comun_relata_collective_entity_consent_set_internal(uuid,uuid,boolean)',
      'EXECUTE'
    ) then
      raise exception 'runtime % retains internal function execute',v_role;
    end if;
  end loop;

  if exists(
    select 1
      from pg_constraint
     where conrelid in (
       'private.comun_relata_collective_entities'::regclass,
       'private.comun_relata_collective_entity_representations'::regclass,
       'private.comun_relata_collective_entity_consents'::regclass,
       'private.comun_relata_collective_entity_events'::regclass
     )
       and confrelid='public.comun_relata_cases'::regclass
  ) then
    raise exception 'report grouping relationship introduced';
  end if;
end;
$$;

commit;
