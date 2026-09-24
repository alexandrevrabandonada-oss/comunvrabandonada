begin;

-- R3 is a private snapshot awaiting a separate legitimacy decision. Consent
-- never creates a candidate by itself and no public projection is touched.
create table private.comun_relata_collective_entity_candidates (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  entity_id uuid not null references private.comun_relata_collective_entities(id) on delete restrict,
  generation_request_id uuid not null unique,
  source_representation_id uuid not null,
  source_consent_id uuid not null,
  candidate_version text not null default 'private-sanitized-entity-v1'
    check (candidate_version = 'private-sanitized-entity-v1'),
  candidate_state text not null default 'pending_legitimacy'
    check (candidate_state in ('pending_legitimacy','invalidated')),
  public_name text not null,
  entity_type text not null,
  generated_at timestamptz not null default pg_catalog.now(),
  invalidated_at timestamptz,
  invalidation_reason text,
  constraint comun_relata_candidate_rep_fk foreign key (source_representation_id,entity_id)
    references private.comun_relata_collective_entity_representations(id,entity_id) on delete restrict,
  constraint comun_relata_candidate_consent_fk foreign key (source_consent_id,entity_id)
    references private.comun_relata_collective_entity_consents(id,entity_id) on delete restrict,
  constraint comun_relata_candidate_state_shape check (
    (candidate_state='pending_legitimacy' and invalidated_at is null and invalidation_reason is null)
    or (candidate_state='invalidated' and invalidated_at is not null
      and invalidation_reason in ('CONSENT_REVOKED','REPRESENTATION_REVOKED','ENTITY_ARCHIVED'))
  )
);
create unique index comun_relata_candidate_one_pending_per_entity
  on private.comun_relata_collective_entity_candidates(entity_id)
  where candidate_state='pending_legitimacy';
alter table private.comun_relata_collective_entity_candidates enable row level security;
alter table private.comun_relata_collective_entity_candidates force row level security;
revoke all on table private.comun_relata_collective_entity_candidates
  from public,anon,authenticated,service_role;

create function private.comun_relata_candidate_immutable_guard()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if tg_op='DELETE' then
    raise exception using errcode='42501', message='COMUN_RELATA_CANDIDATE_DELETE_FORBIDDEN';
  end if;
  if old.candidate_state<>'pending_legitimacy' or new.candidate_state<>'invalidated'
    or new.id is distinct from old.id or new.entity_id is distinct from old.entity_id
    or new.generation_request_id is distinct from old.generation_request_id
    or new.source_representation_id is distinct from old.source_representation_id
    or new.source_consent_id is distinct from old.source_consent_id
    or new.candidate_version is distinct from old.candidate_version
    or new.public_name is distinct from old.public_name
    or new.entity_type is distinct from old.entity_type
    or new.generated_at is distinct from old.generated_at
    or new.invalidated_at is null or new.invalidation_reason is null then
    raise exception using errcode='42501', message='COMUN_RELATA_CANDIDATE_IMMUTABLE';
  end if;
  return new;
end;
$$;
create trigger comun_relata_candidate_immutable
  before update or delete on private.comun_relata_collective_entity_candidates
  for each row execute function private.comun_relata_candidate_immutable_guard();

create function private.comun_relata_candidate_invalidate_from_source()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if tg_table_name='comun_relata_collective_entity_consents' then
    if old.active and not new.active then
      update private.comun_relata_collective_entity_candidates candidate
         set candidate_state='invalidated', invalidated_at=pg_catalog.now(),
             invalidation_reason='CONSENT_REVOKED'
       where candidate.source_consent_id=new.id and candidate.candidate_state='pending_legitimacy';
    end if;
  elsif tg_table_name='comun_relata_collective_entity_representations' then
    if old.status in ('declared','verified') and new.status='revoked' then
      update private.comun_relata_collective_entity_candidates candidate
         set candidate_state='invalidated', invalidated_at=pg_catalog.now(),
             invalidation_reason='REPRESENTATION_REVOKED'
       where candidate.source_representation_id=new.id and candidate.candidate_state='pending_legitimacy';
    end if;
  elsif tg_table_name='comun_relata_collective_entities' then
    if old.state='active' and new.state='archived' then
      update private.comun_relata_collective_entity_candidates candidate
         set candidate_state='invalidated', invalidated_at=pg_catalog.now(),
             invalidation_reason='ENTITY_ARCHIVED'
       where candidate.entity_id=new.id and candidate.candidate_state='pending_legitimacy';
    end if;
  end if;
  return new;
end;
$$;
create trigger comun_relata_candidate_consent_invalidate
  after update of active on private.comun_relata_collective_entity_consents
  for each row execute function private.comun_relata_candidate_invalidate_from_source();
create trigger comun_relata_candidate_representation_invalidate
  after update of status on private.comun_relata_collective_entity_representations
  for each row execute function private.comun_relata_candidate_invalidate_from_source();
create trigger comun_relata_candidate_entity_invalidate
  after update of state on private.comun_relata_collective_entities
  for each row execute function private.comun_relata_candidate_invalidate_from_source();

-- A single service-only bridge supports explicit preparation and owner listing.
-- Null request+entity is the read-only list mode. One null alone is rejected.
create function public.comun_relata_collective_entity_server_candidate_prepare(
  p_request_id uuid, p_actor_user_id uuid, p_entity_id uuid
)
returns table(candidate_id uuid, entity_id uuid, public_name text, entity_type text,
  candidate_state text, generated_at timestamptz, invalidated_at timestamptz,
  invalidation_reason text)
language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_entity private.comun_relata_collective_entities%rowtype;
  v_rep private.comun_relata_collective_entity_representations%rowtype;
  v_consent private.comun_relata_collective_entity_consents%rowtype;
  v_candidate private.comun_relata_collective_entity_candidates%rowtype;
begin
  perform private.comun_relata_entity_assert_internal_actor(p_actor_user_id);
  if p_request_id is null and p_entity_id is null then
    return query
      select c.id,c.entity_id,c.public_name,c.entity_type,c.candidate_state,
             c.generated_at,c.invalidated_at,c.invalidation_reason
        from private.comun_relata_collective_entity_candidates c
        join private.comun_relata_collective_entity_representations r
          on r.id=c.source_representation_id and r.user_id=p_actor_user_id
       order by c.generated_at desc,c.id desc;
    return;
  end if;
  if p_request_id is null or p_entity_id is null then
    raise exception using errcode='22023', message='COMUN_RELATA_CANDIDATE_INPUT_INVALID';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,4921003));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_entity_id::text,4921004));
  select * into v_candidate from private.comun_relata_collective_entity_candidates c
    where c.generation_request_id=p_request_id for update;
  if found then
    if v_candidate.entity_id<>p_entity_id or not exists (
      select 1 from private.comun_relata_collective_entity_representations r
      where r.id=v_candidate.source_representation_id and r.user_id=p_actor_user_id
    ) then
      raise exception using errcode='42501', message='COMUN_RELATA_CANDIDATE_REQUEST_FORBIDDEN';
    end if;
  else
    select * into v_entity from private.comun_relata_collective_entities e
      where e.id=p_entity_id for update;
    if not found or v_entity.state<>'active' then
      raise exception using errcode='42501', message='COMUN_RELATA_CANDIDATE_ENTITY_UNAVAILABLE';
    end if;
    select * into v_rep from private.comun_relata_collective_entity_representations r
      where r.entity_id=p_entity_id and r.user_id=p_actor_user_id
        and r.status in ('declared','verified') for update;
    if not found then
      raise exception using errcode='42501', message='COMUN_RELATA_CANDIDATE_REPRESENTATION_REQUIRED';
    end if;
    select * into v_consent from private.comun_relata_collective_entity_consents c
      where c.entity_id=p_entity_id and c.representation_id=v_rep.id
        and c.consented_by_user_id=p_actor_user_id and c.active
        and c.consent_version='relata-collective-public-projection-v1'
        and c.consent_scope='sanitized_entity_projection'
        and c.consent_notice_sha256='0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae'
      for update;
    if not found then
      raise exception using errcode='42501', message='COMUN_RELATA_CANDIDATE_CONSENT_REQUIRED';
    end if;
    if exists(select 1 from private.comun_relata_collective_entity_candidates c
      where c.entity_id=p_entity_id and c.candidate_state='pending_legitimacy') then
      raise exception using errcode='23505', message='COMUN_RELATA_CANDIDATE_ALREADY_PENDING';
    end if;
    insert into private.comun_relata_collective_entity_candidates(
      entity_id,generation_request_id,source_representation_id,source_consent_id,
      public_name,entity_type
    ) values(p_entity_id,p_request_id,v_rep.id,v_consent.id,
      v_entity.public_name,v_entity.entity_type) returning * into v_candidate;
  end if;
  return query select v_candidate.id,v_candidate.entity_id,v_candidate.public_name,
    v_candidate.entity_type,v_candidate.candidate_state,v_candidate.generated_at,
    v_candidate.invalidated_at,v_candidate.invalidation_reason;
end;
$$;

alter function private.comun_relata_candidate_immutable_guard() owner to postgres;
alter function private.comun_relata_candidate_invalidate_from_source() owner to postgres;
alter function public.comun_relata_collective_entity_server_candidate_prepare(uuid,uuid,uuid) owner to postgres;
revoke all on function private.comun_relata_candidate_immutable_guard(),
  private.comun_relata_candidate_invalidate_from_source()
  from public,anon,authenticated,service_role;
revoke all on function public.comun_relata_collective_entity_server_candidate_prepare(uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.comun_relata_collective_entity_server_candidate_prepare(uuid,uuid,uuid)
  to service_role;

comment on table private.comun_relata_collective_entity_candidates is
  'R3 private sanitized snapshot only; pending_legitimacy is neither verification nor publication.';
comment on function public.comun_relata_collective_entity_server_candidate_prepare(uuid,uuid,uuid) is
  'R3 service-only bridge. Explicit preparation requires request and entity; both null list only the actor owner candidates.';
commit;
