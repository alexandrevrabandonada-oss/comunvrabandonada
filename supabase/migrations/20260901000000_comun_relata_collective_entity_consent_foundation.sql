begin;

-- COMUN 49.2-A0-R1: entity and representation are deliberately separate from
-- individual reports, anonymous report grouping and the solidarity economy.
-- This foundation never creates a candidate, projection or publication.
do $$
begin
  if to_regclass('private.comun_relata_collective_entities') is not null
     or to_regclass('private.comun_relata_collective_entity_representations') is not null
     or to_regclass('private.comun_relata_collective_entity_consents') is not null
     or to_regclass('private.comun_relata_collective_entity_events') is not null then
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
  updated_at timestamptz not null default now()
);

create table private.comun_relata_collective_entity_representations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references private.comun_relata_collective_entities(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null default 'representative' check (role in ('representative','delegate')),
  status text not null default 'declared' check (status in ('declared','verified','revoked')),
  declared_at timestamptz not null default now(),
  verified_at timestamptz,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  constraint comun_relata_entity_representation_state check (
    (status='declared' and verified_at is null and revoked_at is null)
    or (status='verified' and verified_at is not null and revoked_at is null)
    or (status='revoked' and revoked_at is not null)
  )
);
create unique index comun_relata_entity_active_representation_unique
  on private.comun_relata_collective_entity_representations(entity_id,user_id)
  where status in ('declared','verified');
alter table private.comun_relata_collective_entity_representations
  add constraint comun_relata_entity_representation_identity_unique unique(id,entity_id);

create table private.comun_relata_collective_entity_consents (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references private.comun_relata_collective_entities(id) on delete restrict,
  representation_id uuid not null references private.comun_relata_collective_entity_representations(id) on delete restrict,
  consent_version text not null check (consent_version='relata-collective-public-projection-v1'),
  consented_by_user_id uuid not null references auth.users(id) on delete restrict,
  active boolean not null default true,
  declared_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  constraint comun_relata_entity_consent_representation_same_entity foreign key (representation_id,entity_id)
    references private.comun_relata_collective_entity_representations(id,entity_id) on delete restrict,
  constraint comun_relata_entity_consent_state check (
    (active and revoked_at is null and revoked_by_user_id is null)
    or (not active and revoked_at is not null and revoked_by_user_id is not null)
  )
);
create unique index comun_relata_entity_active_consent_version_unique
  on private.comun_relata_collective_entity_consents(entity_id,consent_version)
  where active;

create table private.comun_relata_collective_entity_events (
  id bigint generated always as identity primary key,
  entity_id uuid not null references private.comun_relata_collective_entities(id) on delete restrict,
  representation_id uuid references private.comun_relata_collective_entity_representations(id) on delete restrict,
  consent_id uuid references private.comun_relata_collective_entity_consents(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('entity_created','representation_declared','consent_granted','consent_revoked')),
  consent_version text,
  occurred_at timestamptz not null default now()
);

create or replace function private.comun_relata_entity_event_append_only()
returns trigger language plpgsql security definer set search_path=pg_catalog,private as $$
begin
  raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_EVENT_APPEND_ONLY';
end;
$$;
create trigger comun_relata_entity_events_append_only
before update or delete on private.comun_relata_collective_entity_events
for each row execute function private.comun_relata_entity_event_append_only();

create or replace function private.comun_relata_entity_assert_actor(p_actor_user_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,auth as $$
begin
  if p_actor_user_id is null or not exists(select 1 from auth.users where id=p_actor_user_id) then
    raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_ACTOR_REQUIRED';
  end if;
end;
$$;

create or replace function private.comun_relata_entity_active_representation(
  p_entity_id uuid,p_actor_user_id uuid
)
returns private.comun_relata_collective_entity_representations
language sql stable security definer set search_path=pg_catalog,private as $$
  select representation.*
    from private.comun_relata_collective_entity_representations representation
   where representation.entity_id=p_entity_id
     and representation.user_id=p_actor_user_id
     and representation.status in ('declared','verified')
   order by representation.declared_at desc
   limit 1
$$;

create or replace function public.comun_relata_collective_entity_create(
  p_request_id uuid,p_actor_user_id uuid,p_public_name text,p_entity_type text
)
returns table(entity_id uuid,representation_id uuid,representation_status text)
language plpgsql security definer set search_path=pg_catalog,private as $$
declare v_entity private.comun_relata_collective_entities%rowtype;
  v_representation private.comun_relata_collective_entity_representations%rowtype;
  v_name text:=nullif(regexp_replace(btrim(coalesce(p_public_name,'')),'\s+',' ','g'),'');
begin
  perform private.comun_relata_entity_assert_actor(p_actor_user_id);
  if p_request_id is null or v_name is null or char_length(v_name) not between 3 and 160
     or p_entity_type not in ('association','collective','community_group','informal_group','other') then
    raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_INPUT_INVALID';
  end if;
  select * into v_entity from private.comun_relata_collective_entities where creation_request_id=p_request_id for update;
  if found then
    if v_entity.created_by_user_id<>p_actor_user_id then
      raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_REQUEST_FORBIDDEN';
    end if;
  else
    insert into private.comun_relata_collective_entities(
      creation_request_id,public_name,entity_type,created_by_user_id
    ) values(p_request_id,v_name,p_entity_type,p_actor_user_id) returning * into v_entity;
    insert into private.comun_relata_collective_entity_events(entity_id,actor_user_id,event_type)
      values(v_entity.id,p_actor_user_id,'entity_created');
  end if;
  select * into v_representation from private.comun_relata_entity_active_representation(v_entity.id,p_actor_user_id);
  if not found then
    insert into private.comun_relata_collective_entity_representations(entity_id,user_id)
      values(v_entity.id,p_actor_user_id) returning * into v_representation;
    insert into private.comun_relata_collective_entity_events(entity_id,representation_id,actor_user_id,event_type)
      values(v_entity.id,v_representation.id,p_actor_user_id,'representation_declared');
  end if;
  return query select v_entity.id,v_representation.id,v_representation.status;
end;
$$;

create or replace function public.comun_relata_collective_entity_consent_set(
  p_actor_user_id uuid,p_entity_id uuid,p_active boolean
)
returns table(consent_id uuid,active boolean,consent_version text,declared_at timestamptz,revoked_at timestamptz,representation_status text)
language plpgsql security definer set search_path=pg_catalog,private as $$
declare v_representation private.comun_relata_collective_entity_representations%rowtype;
  v_consent private.comun_relata_collective_entity_consents%rowtype;
  v_now timestamptz:=pg_catalog.now();
begin
  perform private.comun_relata_entity_assert_actor(p_actor_user_id);
  if p_active is null then
    raise exception using errcode='22023', message='COMUN_RELATA_ENTITY_CONSENT_STATE_REQUIRED';
  end if;
  perform 1 from private.comun_relata_collective_entities where id=p_entity_id and state='active';
  if not found then raise exception using errcode='P0001', message='COMUN_RELATA_ENTITY_NOT_FOUND'; end if;
  select * into v_representation from private.comun_relata_entity_active_representation(p_entity_id,p_actor_user_id);
  if not found then raise exception using errcode='42501', message='COMUN_RELATA_ENTITY_REPRESENTATION_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_entity_id::text,4921));
  if p_active then
    select * into v_consent from private.comun_relata_collective_entity_consents consent
      where consent.entity_id=p_entity_id and consent.consent_version='relata-collective-public-projection-v1' and consent.active for update;
    if not found then
      insert into private.comun_relata_collective_entity_consents(
        entity_id,representation_id,consented_by_user_id,consent_version,active,declared_at
      ) values(p_entity_id,v_representation.id,p_actor_user_id,'relata-collective-public-projection-v1',true,v_now)
      returning * into v_consent;
      insert into private.comun_relata_collective_entity_events(
        entity_id,representation_id,consent_id,actor_user_id,event_type,consent_version
      ) values(p_entity_id,v_representation.id,v_consent.id,p_actor_user_id,'consent_granted',v_consent.consent_version);
    end if;
  else
    select * into v_consent from private.comun_relata_collective_entity_consents consent
      where consent.entity_id=p_entity_id and consent.consent_version='relata-collective-public-projection-v1' and consent.active for update;
    if found then
      update private.comun_relata_collective_entity_consents
         set active=false,revoked_at=v_now,revoked_by_user_id=p_actor_user_id
       where id=v_consent.id returning * into v_consent;
      insert into private.comun_relata_collective_entity_events(
        entity_id,representation_id,consent_id,actor_user_id,event_type,consent_version
      ) values(p_entity_id,v_representation.id,v_consent.id,p_actor_user_id,'consent_revoked',v_consent.consent_version);
    else
      return query select null::uuid,false,'relata-collective-public-projection-v1'::text,null::timestamptz,null::timestamptz,v_representation.status;
      return;
    end if;
  end if;
  return query select v_consent.id,v_consent.active,v_consent.consent_version,v_consent.declared_at,v_consent.revoked_at,v_representation.status;
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
grant usage on schema private to service_role;
revoke all on table private.comun_relata_collective_entities from public,anon,authenticated;
revoke all on table private.comun_relata_collective_entity_representations from public,anon,authenticated;
revoke all on table private.comun_relata_collective_entity_consents from public,anon,authenticated;
revoke all on table private.comun_relata_collective_entity_events from public,anon,authenticated;
grant select,insert,update on table private.comun_relata_collective_entities,private.comun_relata_collective_entity_representations,private.comun_relata_collective_entity_consents to service_role;
grant select,insert on table private.comun_relata_collective_entity_events to service_role;
revoke all on function private.comun_relata_entity_event_append_only(),private.comun_relata_entity_assert_actor(uuid),private.comun_relata_entity_active_representation(uuid,uuid) from public,anon,authenticated;
grant execute on function private.comun_relata_entity_event_append_only(),private.comun_relata_entity_assert_actor(uuid),private.comun_relata_entity_active_representation(uuid,uuid) to service_role;
revoke all on function public.comun_relata_collective_entity_create(uuid,uuid,text,text),public.comun_relata_collective_entity_consent_set(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.comun_relata_collective_entity_create(uuid,uuid,text,text),public.comun_relata_collective_entity_consent_set(uuid,uuid,boolean) to service_role;

comment on table private.comun_relata_collective_entities is '49.2 entity foundation only; no report, candidate, projection or publication relationship.';
comment on table private.comun_relata_collective_entity_representations is '49.2 temporal declared/verified/revoked representation; declared is never publication authority.';
comment on table private.comun_relata_collective_entity_consents is '49.2 explicit entity consent; separate from individual relata-public-projection-v1 and not publication.';

commit;
