begin;

-- COMUN 49.2-A0-R2. These are authenticated, owner-scoped entry points only.
-- They never receive an actor id from the caller and deliberately provide no
-- verification, publication, projection, candidate or map capability.
create or replace function public.comun_relata_collective_entity_runtime_create(
  p_request_id uuid,
  p_public_name text,
  p_entity_type text
)
returns table(entity_id uuid, representation_id uuid, representation_status text)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_ENTITY_AUTH_REQUIRED';
  end if;

  return query
    select *
      from private.comun_relata_collective_entity_create_internal(
        p_request_id, v_actor_user_id, p_public_name, p_entity_type
      );
end;
$$;

create or replace function public.comun_relata_collective_entity_runtime_consent_set(
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
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_ENTITY_AUTH_REQUIRED';
  end if;

  return query
    select *
      from private.comun_relata_collective_entity_consent_set_internal(
        v_actor_user_id, p_entity_id, p_active
      );
end;
$$;

create or replace function public.comun_relata_collective_entity_runtime_representation_revoke(
  p_entity_id uuid
)
returns table(representation_id uuid, representation_status text, revoked_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_ENTITY_AUTH_REQUIRED';
  end if;

  update private.comun_relata_collective_entity_representations representation
     set status = 'revoked', revoked_at = pg_catalog.now(), revoked_by_user_id = v_actor_user_id
   where representation.entity_id = p_entity_id
     and representation.user_id = v_actor_user_id
     and representation.status in ('declared', 'verified')
   returning representation.id, representation.status, representation.revoked_at
        into representation_id, representation_status, revoked_at;

  if representation_id is null then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_ENTITY_REPRESENTATION_REVOKE_FORBIDDEN';
  end if;
  return next;
end;
$$;

create or replace function public.comun_relata_collective_entity_runtime_list_own()
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
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_ENTITY_AUTH_REQUIRED';
  end if;

  return query
    select entity.id, entity.public_name, entity.entity_type, entity.state,
           representation.status,
           coalesce(consent.active, false),
           coalesce(not consent.active, false)
      from private.comun_relata_collective_entities entity
      join private.comun_relata_collective_entity_representations representation
        on representation.entity_id = entity.id
       and representation.user_id = v_actor_user_id
      left join lateral (
        select active
          from private.comun_relata_collective_entity_consents
         where entity_id = entity.id
           and consented_by_user_id = v_actor_user_id
         order by declared_at desc, id desc
         limit 1
      ) consent on true
     order by entity.created_at desc, entity.id desc;
end;
$$;

revoke all on function
  public.comun_relata_collective_entity_runtime_create(uuid,text,text),
  public.comun_relata_collective_entity_runtime_consent_set(uuid,boolean),
  public.comun_relata_collective_entity_runtime_representation_revoke(uuid),
  public.comun_relata_collective_entity_runtime_list_own()
from public, anon;
grant execute on function
  public.comun_relata_collective_entity_runtime_create(uuid,text,text),
  public.comun_relata_collective_entity_runtime_consent_set(uuid,boolean),
  public.comun_relata_collective_entity_runtime_representation_revoke(uuid),
  public.comun_relata_collective_entity_runtime_list_own()
to authenticated;

comment on function public.comun_relata_collective_entity_runtime_create(uuid,text,text) is
  'R2 authenticated entry point: derives actor exclusively from auth.uid(); creates a declared representation only.';
comment on function public.comun_relata_collective_entity_runtime_consent_set(uuid,boolean) is
  'R2 authenticated entry point: pinned consent is recorded as private intent only; it has no publication or map effect.';
comment on function public.comun_relata_collective_entity_runtime_representation_revoke(uuid) is
  'R2 authenticated exit: a representative may revoke only their own live representation; verification is intentionally absent.';
comment on function public.comun_relata_collective_entity_runtime_list_own() is
  'R2 minimal owner DTO: does not disclose other representatives, events, reports, protocols, locations or attachments.';

commit;
