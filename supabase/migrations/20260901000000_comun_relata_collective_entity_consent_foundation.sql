begin;

-- COMUN 49.2-A0-R1. This is a private, owner-only foundation. It does not
-- create a client RPC, candidate, projection, publication or map switch.
do $$
begin
  if to_regclass('private.comun_relata_collective_entities') is not null
     or to_regclass('private.comun_relata_collective_entity_representations') is not null
     or to_regclass('private.comun_relata_collective_entity_consents') is not null
     or to_regclass('private.comun_relata_collective_entity_events') is not null
     or to_regprocedure('public.comun_relata_collective_entity_create(uuid,uuid,text,text)') is not null
     or to_regprocedure('public.comun_relata_collective_entity_consent_set(uuid,uuid,boolean)') is not null
     or to_regprocedure('private.comun_relata_collective_entity_create_internal(uuid,uuid,text,text)') is not null
     or to_regprocedure('private.comun_relata_collective_entity_consent_set_internal(uuid,uuid,boolean)') is not null then
    raise exception using errcode='P0001', message='COMUN_49_2_ENTITY_CONSENT_SCHEMA_DRIFT';
  end if;
end;
$$;

create table private.comun_relata_collective_entities (
  id uuid primary key default gen_random_uuid(),
  creation_request_id uuid not null unique,
  public_name text not null check (char_length(btrim(public_name)) between 3 and 160),
  entity_type text not null check (entity_type in ('association','collective','community_group','informal_group','other')),
  state text not null default 'active' check (state in ('active','archived')),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by_user_id uuid references auth.users(id) on delete restrict,
  constraint comun_relata_entity_archive_state check (
    (state='active' and archived_at is null and archived_by_user_id is null)
    or (state='archived' and archived_at is not null and archived_by_user_id is not null)
  ),
  constraint comun_relata_entity_archived_after_creation
    check (archived_at is null or archived_at >= created_at)
);

create table private.comun_relata_collective_entity_representations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references private.comun_relata_collective_entities(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null default 'representative' check (role in ('representative','delegate')),
  status text not null default 'declared' check (status in ('declared','verified','revoked')),
  declared_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by_user_id uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  constraint comun_relata_entity_representation_state check (
    (status='declared'
      and verified_at is null and verified_by_user_id is null
      and revoked_at is null and revoked_by_user_id is null)
    or (status='verified'
      and verified_at is not null and verified_by_user_id is not null
      and revoked_at is null and revoked_by_user_id is null)
    or (status='revoked'
      and revoked_at is not null and revoked_by_user_id is not null
      and ((verified_at is null and verified_by_user_id is null)
        or (verified_at is not null and verified_by_user_id is not null)))
  ),
  constraint comun_relata_entity_representation_verified_after_declaration
    check (verified_at is null or verified_at >= declared_at),
  constraint comun_relata_entity_representation_revoked_after_declaration
    check (revoked_at is null or revoked_at >= declared_at),
  constraint comun_relata_entity_representation_revoked_after_verification
    check (revoked_at is null or verified_at is null or revoked_at >= verified_at),
  constraint comun_relata_rep_id_entity_unique unique(id,entity_id),
  constraint comun_relata_rep_id_entity_user_unique unique(id,entity_id,user_id)
);
create unique index comun_relata_entity_active_representation_unique
  on private.comun_relata_collective_entity_representations(entity_id,user_id)
  where status in ('declared','verified');

create table private.comun_relata_collective_entity_consents (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references private.comun_relata_collective_entities(id) on delete restrict,
  representation_id uuid not null,
  consent_version text not null check (consent_version='relata-collective-public-projection-v1'),
  consent_scope text not null check (consent_scope='sanitized_entity_projection'),
  consent_notice_sha256 text not null check (consent_notice_sha256='0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae'),
  consented_by_user_id uuid not null references auth.users(id) on delete restrict,
  active boolean not null default true,
  declared_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  constraint comun_relata_consent_rep_actor_fk foreign key (representation_id,entity_id,consented_by_user_id)
    references private.comun_relata_collective_entity_representations(id,entity_id,user_id) on delete restrict,
  constraint comun_relata_consent_state check (
    (active and revoked_at is null and revoked_by_user_id is null)
    or (not active and revoked_at is not null and revoked_by_user_id is not null)
  ),
  constraint comun_relata_consent_revoked_after_declaration
    check (revoked_at is null or revoked_at >= declared_at),
  constraint comun_relata_consent_id_entity_unique unique(id,entity_id)
);
create unique index comun_relata_entity_active_consent_version_unique
  on private.comun_relata_collective_entity_consents(entity_id,consent_version)
  where active;

create table private.comun_relata_collective_entity_events (
  id bigint generated always as identity primary key,
  entity_id uuid not null references private.comun_relata_collective_entities(id) on delete restrict,
  representation_id uuid,
  consent_id uuid,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in (
    'entity_created','entity_archived',
    'representation_declared','representation_verified','representation_revoked',
    'consent_granted','consent_revoked'
  )),
  consent_version text,
  consent_scope text,
  consent_notice_sha256 text,
  occurred_at timestamptz not null default now(),
  constraint comun_relata_event_rep_entity_fk foreign key (representation_id,entity_id)
    references private.comun_relata_collective_entity_representations(id,entity_id) on delete restrict,
  constraint comun_relata_event_consent_entity_fk foreign key (consent_id,entity_id)
    references private.comun_relata_collective_entity_consents(id,entity_id) on delete restrict,
  constraint comun_relata_event_shape check (
    (event_type in ('entity_created','entity_archived')
      and representation_id is null and consent_id is null
      and consent_version is null and consent_scope is null and consent_notice_sha256 is null)
    or (event_type in ('representation_declared','representation_verified','representation_revoked')
      and representation_id is not null and consent_id is null
      and consent_version is null and consent_scope is null and consent_notice_sha256 is null)
    or (event_type in ('consent_granted','consent_revoked')
      and representation_id is not null and consent_id is not null
      and consent_version='relata-collective-public-projection-v1'
      and consent_scope='sanitized_entity_projection'
      and consent_notice_sha256='0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae')
  )
);

create or replace function private.comun_relata_entity_event_append_only()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_EVENT_APPEND_ONLY';
end;
$$;

create trigger comun_relata_entity_events_append_only
before update or delete on private.comun_relata_collective_entity_events
for each row execute function private.comun_relata_entity_event_append_only();

create or replace function private.comun_relata_entity_event_assert_consistency()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  if new.event_type in ('consent_granted','consent_revoked')
     and not exists (
       select 1
         from private.comun_relata_collective_entity_consents consent
        where consent.id=new.consent_id
          and consent.entity_id=new.entity_id
          and consent.representation_id=new.representation_id
     ) then
    raise exception using errcode='23514', message='COMUN_RELATA_ENTITY_EVENT_CONSISTENCY_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger comun_relata_entity_events_assert_consistency
before insert on private.comun_relata_collective_entity_events
for each row execute function private.comun_relata_entity_event_assert_consistency();

create or replace function private.comun_relata_entity_state_audit_transition()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  if new.state is not distinct from old.state then
    if new.archived_at is distinct from old.archived_at
       or new.archived_by_user_id is distinct from old.archived_by_user_id then
      raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_ARCHIVE_FIELDS_IMMUTABLE';
    end if;
    return new;
  end if;
  if old.state='active' and new.state='archived' then
    new.updated_at:=pg_catalog.now();
    insert into private.comun_relata_collective_entity_events(
      entity_id,actor_user_id,event_type
    ) values(new.id,new.archived_by_user_id,'entity_archived');
    return new;
  end if;
  raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_STATE_TRANSITION_INVALID';
end;
$$;

create trigger comun_relata_entity_state_audit_transition
before update of state,archived_at,archived_by_user_id
on private.comun_relata_collective_entities
for each row execute function private.comun_relata_entity_state_audit_transition();

create or replace function private.comun_relata_entity_representation_audit_transition()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  if new.status is not distinct from old.status then
    if new.verified_at is distinct from old.verified_at
       or new.verified_by_user_id is distinct from old.verified_by_user_id
       or new.revoked_at is distinct from old.revoked_at
       or new.revoked_by_user_id is distinct from old.revoked_by_user_id then
      raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_REPRESENTATION_AUDIT_FIELDS_IMMUTABLE';
    end if;
    return new;
  end if;
  if old.status='declared' and new.status='verified' then
    insert into private.comun_relata_collective_entity_events(
      entity_id,representation_id,actor_user_id,event_type
    ) values(new.entity_id,new.id,new.verified_by_user_id,'representation_verified');
    return new;
  end if;
  if old.status='declared' and new.status='revoked' then
    if new.verified_at is not null or new.verified_by_user_id is not null then
      raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_REPRESENTATION_TRANSITION_INVALID';
    end if;
    insert into private.comun_relata_collective_entity_events(
      entity_id,representation_id,actor_user_id,event_type
    ) values(new.entity_id,new.id,new.revoked_by_user_id,'representation_revoked');
    return new;
  end if;
  if old.status='verified' and new.status='revoked' then
    if new.verified_at is distinct from old.verified_at
       or new.verified_by_user_id is distinct from old.verified_by_user_id then
      raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_REPRESENTATION_TRANSITION_INVALID';
    end if;
    insert into private.comun_relata_collective_entity_events(
      entity_id,representation_id,actor_user_id,event_type
    ) values(new.entity_id,new.id,new.revoked_by_user_id,'representation_revoked');
    return new;
  end if;
  raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_REPRESENTATION_TRANSITION_INVALID';
end;
$$;

create trigger comun_relata_entity_representation_audit_transition
before update of status,verified_at,verified_by_user_id,revoked_at,revoked_by_user_id
on private.comun_relata_collective_entity_representations
for each row execute function private.comun_relata_entity_representation_audit_transition();

create or replace function private.comun_relata_entity_assert_internal_actor(p_actor_user_id uuid)
returns void
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  if p_actor_user_id is null
     or not exists (select 1 from auth.users where id=p_actor_user_id) then
    raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_ACTOR_REQUIRED';
  end if;
end;
$$;

create or replace function private.comun_relata_collective_entity_create_internal(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_public_name text,
  p_entity_type text
)
returns table(entity_id uuid,representation_id uuid,representation_status text)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_entity private.comun_relata_collective_entities%rowtype;
  v_representation private.comun_relata_collective_entity_representations%rowtype;
  v_name text:=nullif(regexp_replace(btrim(coalesce(p_public_name,'')),'\s+',' ','g'),'');
begin
  perform private.comun_relata_entity_assert_internal_actor(p_actor_user_id);
  if p_request_id is null
     or v_name is null
     or char_length(v_name) not between 3 and 160
     or p_entity_type is null
     or p_entity_type not in ('association','collective','community_group','informal_group','other') then
    raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_INPUT_INVALID';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text,4921001)
  );
  select * into v_entity
    from private.comun_relata_collective_entities
   where creation_request_id=p_request_id
   for update;

  if found then
    if v_entity.created_by_user_id<>p_actor_user_id then
      raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_REQUEST_FORBIDDEN';
    end if;
    if v_entity.public_name<>v_name or v_entity.entity_type<>p_entity_type then
      raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_REQUEST_CONFLICT';
    end if;
  else
    insert into private.comun_relata_collective_entities(
      creation_request_id,public_name,entity_type,created_by_user_id
    ) values(p_request_id,v_name,p_entity_type,p_actor_user_id)
    returning * into v_entity;

    insert into private.comun_relata_collective_entity_events(entity_id,actor_user_id,event_type)
      values(v_entity.id,p_actor_user_id,'entity_created');
  end if;

  select representation.* into v_representation
    from private.comun_relata_collective_entity_representations representation
   where representation.entity_id=v_entity.id
     and representation.user_id=p_actor_user_id
     and representation.status in ('declared','verified')
   order by representation.declared_at desc,representation.id desc
   limit 1;

  if not found then
    insert into private.comun_relata_collective_entity_representations(entity_id,user_id)
      values(v_entity.id,p_actor_user_id)
      returning * into v_representation;
    insert into private.comun_relata_collective_entity_events(
      entity_id,representation_id,actor_user_id,event_type
    ) values(v_entity.id,v_representation.id,p_actor_user_id,'representation_declared');
  end if;

  return query select v_entity.id,v_representation.id,v_representation.status;
end;
$$;

create or replace function private.comun_relata_collective_entity_consent_set_internal(
  p_actor_user_id uuid,
  p_entity_id uuid,
  p_active boolean
)
returns table(
  consent_id uuid,
  active boolean,
  consent_version text,
  consent_scope text,
  consent_notice_sha256 text,
  declared_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_active_representation private.comun_relata_collective_entity_representations%rowtype;
  v_consent private.comun_relata_collective_entity_consents%rowtype;
  v_now timestamptz:=pg_catalog.now();
begin
  perform private.comun_relata_entity_assert_internal_actor(p_actor_user_id);
  if p_entity_id is null then
    raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_ID_REQUIRED';
  end if;
  if p_active is null then
    raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_CONSENT_STATE_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_entity_id::text,4921002)
  );
  select representation.* into v_active_representation
    from private.comun_relata_collective_entity_representations representation
   where representation.entity_id=p_entity_id
     and representation.user_id=p_actor_user_id
     and representation.status in ('declared','verified')
   order by representation.declared_at desc,representation.id desc
   limit 1;

  if p_active then
    perform 1
      from private.comun_relata_collective_entities
     where id=p_entity_id and state='active';
    if not found then
      raise exception using errcode='P0001', message='COMUN_RELATA_ENTITY_NOT_FOUND';
    end if;
    if v_active_representation.id is null then
      raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_REPRESENTATION_REQUIRED';
    end if;

    select * into v_consent
      from private.comun_relata_collective_entity_consents consent
     where consent.entity_id=p_entity_id
       and consent.consent_version='relata-collective-public-projection-v1'
       and consent.active
     for update;
    if not found then
      insert into private.comun_relata_collective_entity_consents(
        entity_id,representation_id,consented_by_user_id,consent_version,
        consent_scope,consent_notice_sha256,active,declared_at
      ) values(
        p_entity_id,v_active_representation.id,p_actor_user_id,
        'relata-collective-public-projection-v1',
        'sanitized_entity_projection',
        '0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae',
        true,v_now
      ) returning * into v_consent;
      insert into private.comun_relata_collective_entity_events(
        entity_id,representation_id,consent_id,actor_user_id,event_type,
        consent_version,consent_scope,consent_notice_sha256
      ) values(
        p_entity_id,v_consent.representation_id,v_consent.id,p_actor_user_id,'consent_granted',
        v_consent.consent_version,v_consent.consent_scope,v_consent.consent_notice_sha256
      );
    end if;
  else
    select * into v_consent
      from private.comun_relata_collective_entity_consents consent
     where consent.entity_id=p_entity_id
       and consent.consent_version='relata-collective-public-projection-v1'
       and consent.active
     for update;

    if found then
      if v_consent.consented_by_user_id<>p_actor_user_id
         and v_active_representation.id is null then
        raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_REVOKE_FORBIDDEN';
      end if;
      update private.comun_relata_collective_entity_consents
         set active=false,revoked_at=v_now,revoked_by_user_id=p_actor_user_id
       where id=v_consent.id
       returning * into v_consent;
      insert into private.comun_relata_collective_entity_events(
        entity_id,representation_id,consent_id,actor_user_id,event_type,
        consent_version,consent_scope,consent_notice_sha256
      ) values(
        p_entity_id,v_consent.representation_id,v_consent.id,p_actor_user_id,'consent_revoked',
        v_consent.consent_version,v_consent.consent_scope,v_consent.consent_notice_sha256
      );
    else
      select * into v_consent
        from private.comun_relata_collective_entity_consents consent
       where consent.entity_id=p_entity_id
         and consent.consent_version='relata-collective-public-projection-v1'
       order by consent.declared_at desc,consent.id desc
       limit 1;
      if found then
        if v_consent.consented_by_user_id<>p_actor_user_id
           and v_active_representation.id is null then
          raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_REVOKE_FORBIDDEN';
        end if;
      elsif v_active_representation.id is null then
        raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_REVOKE_FORBIDDEN';
      else
        return query select
          null::uuid,
          false,
          'relata-collective-public-projection-v1'::text,
          'sanitized_entity_projection'::text,
          '0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae'::text,
          null::timestamptz,
          null::timestamptz;
        return;
      end if;
    end if;
  end if;

  return query select
    v_consent.id,
    v_consent.active,
    v_consent.consent_version,
    v_consent.consent_scope,
    v_consent.consent_notice_sha256,
    v_consent.declared_at,
    v_consent.revoked_at;
end;
$$;

alter table private.comun_relata_collective_entities enable row level security;
alter table private.comun_relata_collective_entities force row level security;
alter table private.comun_relata_collective_entity_representations enable row level security;
alter table private.comun_relata_collective_entity_representations force row level security;
alter table private.comun_relata_collective_entity_consents enable row level security;
alter table private.comun_relata_collective_entity_consents force row level security;
alter table private.comun_relata_collective_entity_events enable row level security;
alter table private.comun_relata_collective_entity_events force row level security;

revoke all on schema private from public,anon,authenticated;
revoke all on table
  private.comun_relata_collective_entities,
  private.comun_relata_collective_entity_representations,
  private.comun_relata_collective_entity_consents,
  private.comun_relata_collective_entity_events
from public,anon,authenticated,service_role;
revoke all on sequence private.comun_relata_collective_entity_events_id_seq
from public,anon,authenticated,service_role;
revoke all on function
  private.comun_relata_entity_event_append_only(),
  private.comun_relata_entity_event_assert_consistency(),
  private.comun_relata_entity_state_audit_transition(),
  private.comun_relata_entity_representation_audit_transition(),
  private.comun_relata_entity_assert_internal_actor(uuid),
  private.comun_relata_collective_entity_create_internal(uuid,uuid,text,text),
  private.comun_relata_collective_entity_consent_set_internal(uuid,uuid,boolean)
from public,anon,authenticated,service_role;

comment on table private.comun_relata_collective_entities is
  '49.2 owner-only entity foundation; no report, candidate, projection or publication relationship.';
comment on table private.comun_relata_collective_entity_representations is
  '49.2 temporal representation; declared is not publication authority and verified is not public-map authority.';
comment on table private.comun_relata_collective_entity_consents is
  '49.2 explicit scoped entity consent with a pinned notice hash; distinct from individual consent and not publication.';
comment on function private.comun_relata_collective_entity_create_internal(uuid,uuid,text,text) is
  'Owner-only foundation primitive. p_actor_user_id is an audit attribute, never proof of a runtime caller identity.';
comment on function private.comun_relata_collective_entity_consent_set_internal(uuid,uuid,boolean) is
  'Owner-only foundation primitive. R2 must add a separately designed auth.uid()-bound authenticated route and legitimacy policy.';

commit;
