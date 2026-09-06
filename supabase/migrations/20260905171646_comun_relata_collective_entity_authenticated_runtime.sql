begin;

-- COMUN 49.2-A0-R2. These server-only bridges never receive a browser actor
-- or grant direct client execution. The Server Action validates the session
-- before supplying its audit attribute through the service-only connection.
-- Creation remains a declared representation only.
create or replace function public.comun_relata_collective_entity_server_create(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_public_name text,
  p_entity_type text
)
returns table(entity_id uuid, representation_id uuid, representation_status text)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_entity private.comun_relata_collective_entities%rowtype;
  v_representation private.comun_relata_collective_entity_representations%rowtype;
  v_name text := nullif(regexp_replace(btrim(coalesce(p_public_name,'')),'\s+',' ','g'),'');
begin
  perform private.comun_relata_entity_assert_internal_actor(p_actor_user_id);
  if p_request_id is null or v_name is null or char_length(v_name) not between 3 and 160
     or p_entity_type not in ('association','collective','community_group','informal_group','other') then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_ENTITY_INPUT_INVALID';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,4921001));
  select * into v_entity from private.comun_relata_collective_entities
   where creation_request_id = p_request_id for update;
  if found then
    if v_entity.created_by_user_id <> p_actor_user_id then
      raise exception using errcode = '42501', message = 'COMUN_RELATA_ENTITY_REQUEST_FORBIDDEN';
    end if;
    if v_entity.public_name <> v_name or v_entity.entity_type <> p_entity_type then
      raise exception using errcode = '22023', message = 'COMUN_RELATA_ENTITY_REQUEST_CONFLICT';
    end if;
    select * into v_representation
      from private.comun_relata_collective_entity_representations representation
     where representation.entity_id = v_entity.id and representation.user_id = p_actor_user_id
     order by representation.declared_at desc, representation.id desc limit 1;
    if found and v_representation.status = 'revoked' then
      return query select v_entity.id, v_representation.id, v_representation.status;
      return;
    end if;
  end if;

  return query
    select *
      from private.comun_relata_collective_entity_create_internal(
        p_request_id, p_actor_user_id, p_public_name, p_entity_type
      );
end;
$$;

create or replace function public.comun_relata_collective_entity_server_consent_set(
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
set search_path = pg_catalog
as $$
declare
begin
  perform private.comun_relata_entity_assert_internal_actor(p_actor_user_id);

  return query
    select *
      from private.comun_relata_collective_entity_consent_set_internal(
        p_actor_user_id, p_entity_id, p_active
      );
end;
$$;

create or replace function public.comun_relata_collective_entity_server_representation_revoke(
  p_actor_user_id uuid,
  p_entity_id uuid
)
returns table(representation_id uuid, representation_status text, revoked_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
begin
  perform private.comun_relata_entity_assert_internal_actor(p_actor_user_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_entity_id::text,4921002));
  perform 1 from private.comun_relata_collective_entity_representations representation
   where representation.entity_id = p_entity_id and representation.user_id = p_actor_user_id
     and representation.status in ('declared','verified') for update;
  if not found then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_ENTITY_REPRESENTATION_REVOKE_FORBIDDEN';
  end if;
  -- A revoked representation cannot leave a live consent behind. The R1
  -- primitive keeps the original consenter's independent withdrawal right.
  perform private.comun_relata_collective_entity_consent_set_internal(
    p_actor_user_id, p_entity_id, false
  );

  update private.comun_relata_collective_entity_representations representation
     set status = 'revoked', revoked_at = pg_catalog.now(), revoked_by_user_id = p_actor_user_id
   where representation.entity_id = p_entity_id
     and representation.user_id = p_actor_user_id
     and representation.status in ('declared', 'verified')
   returning representation.id, representation.status, representation.revoked_at
        into representation_id, representation_status, revoked_at;

  if representation_id is null then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_ENTITY_REPRESENTATION_REVOKE_FORBIDDEN';
  end if;
  return next;
end;
$$;

create or replace function public.comun_relata_collective_entity_server_list_own(
  p_actor_user_id uuid
)
returns table(
  entity_id uuid,
  public_name text,
  entity_type text,
  entity_state text,
  representation_status text,
  consent_active boolean,
  consent_withdrawn boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
begin
  perform private.comun_relata_entity_assert_internal_actor(p_actor_user_id);

  return query
    select entity.id, entity.public_name, entity.entity_type, entity.state,
           representation.status,
           coalesce(consent.active, false),
           coalesce(not consent.active, false)
      from private.comun_relata_collective_entities entity
      join private.comun_relata_collective_entity_representations representation
        on representation.entity_id = entity.id
       and representation.user_id = p_actor_user_id
      left join lateral (
        select consent_row.active
          from private.comun_relata_collective_entity_consents consent_row
         where consent_row.entity_id = entity.id
           and consent_row.consented_by_user_id = p_actor_user_id
         order by consent_row.declared_at desc, consent_row.id desc
         limit 1
      ) consent on true
     order by entity.created_at desc, entity.id desc;
end;
$$;

revoke all on function
  public.comun_relata_collective_entity_server_create(uuid,uuid,text,text),
  public.comun_relata_collective_entity_server_consent_set(uuid,uuid,boolean),
  public.comun_relata_collective_entity_server_representation_revoke(uuid,uuid),
  public.comun_relata_collective_entity_server_list_own(uuid)
from public, anon, authenticated;
grant execute on function
  public.comun_relata_collective_entity_server_create(uuid,uuid,text,text),
  public.comun_relata_collective_entity_server_consent_set(uuid,uuid,boolean),
  public.comun_relata_collective_entity_server_representation_revoke(uuid,uuid),
  public.comun_relata_collective_entity_server_list_own(uuid)
to service_role;

comment on function public.comun_relata_collective_entity_server_create(uuid,uuid,text,text) is
  'R2 server-only bridge. Actor is a server-validated audit attribute; a revoked request replay returns revoked, never resurrects.';
comment on function public.comun_relata_collective_entity_server_consent_set(uuid,uuid,boolean) is
  'R2 server-only bridge. Pinned consent remains private intent with no publication or map effect.';
comment on function public.comun_relata_collective_entity_server_representation_revoke(uuid,uuid) is
  'R2 server-only bridge. Locks consent and revocation together; revocation withdraws any live consent before representation exit.';
comment on function public.comun_relata_collective_entity_server_list_own(uuid) is
  'R2 server-only bridge. Minimal owner DTO excludes other identities, events, reports, protocols, locations and attachments.';

commit;
