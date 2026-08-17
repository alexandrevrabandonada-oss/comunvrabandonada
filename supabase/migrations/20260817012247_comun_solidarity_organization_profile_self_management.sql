alter table private.comun_solidarity_economic_content_events
  add column before_payload_private jsonb,
  add column after_payload_private jsonb;

alter table private.comun_solidarity_economic_content_events
  drop constraint comun_solidarity_economic_content_events_subject_type_check,
  drop constraint comun_solidarity_economic_content_events_operation_check;

alter table private.comun_solidarity_economic_content_events
  add constraint comun_solidarity_economic_content_events_subject_type_check
    check (subject_type in ('offer', 'need', 'organization_profile')),
  add constraint comun_solidarity_economic_content_events_operation_check
    check (operation in (
      'offer.create', 'offer.edit', 'offer.pause', 'offer.resume', 'offer.renew', 'offer.archive',
      'need.create', 'need.edit', 'need.partially_met', 'need.met', 'need.cancel', 'need.reopen',
      'organization_profile.edit'
    )),
  add constraint comun_solidarity_economic_content_events_before_payload_check check (
    before_payload_private is null or (
      jsonb_typeof(before_payload_private) = 'object'
      and octet_length(before_payload_private::text) <= 8192
      and before_payload_private - array[
        'presentation_public', 'services_public', 'service_territory_public',
        'public_contact_authorized'
      ]::text[] = '{}'::jsonb
    )
  ),
  add constraint comun_solidarity_economic_content_events_after_payload_check check (
    after_payload_private is null or (
      jsonb_typeof(after_payload_private) = 'object'
      and octet_length(after_payload_private::text) <= 8192
      and after_payload_private - array[
        'presentation_public', 'services_public', 'service_territory_public',
        'public_contact_authorized'
      ]::text[] = '{}'::jsonb
    )
  );

comment on column private.comun_solidarity_economic_content_events.before_payload_private is
  'Snapshot operacional privado limitado aos quatro campos cotidianos A6. Nunca integra DTO ou HTML público.';
comment on column private.comun_solidarity_economic_content_events.after_payload_private is
  'Snapshot operacional privado limitado aos quatro campos cotidianos A6. Nunca integra DTO ou HTML público.';

create or replace function private.comun_solidarity_public_contact_is_safe(p_text text)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select
    coalesce(p_text, '') !~* '(^|[^[:alnum:]_])(cpf|rg|documento|senha|password|token|secret|chave[[:space:]]+privada|private[[:space:]]+key)([^[:alnum:]_]|$)'
    and coalesce(p_text, '') !~ '[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}'
    and coalesce(p_text, '') !~* '(endereço[[:space:]]+residencial|rua[[:space:]]+.+(casa|apto|apartamento|n[ºo]?\.?[[:space:]]*[0-9]+))'
    and coalesce(p_text, '') !~* '(localhost|127\.0\.0\.1|[?&](token|key|secret|password)=|bearer[[:space:]]+[a-z0-9._~\-]+|eyJ[a-zA-Z0-9_\-]{12,}\.)'
$$;

revoke all on function private.comun_solidarity_public_contact_is_safe(text)
  from public, anon, authenticated;
grant execute on function private.comun_solidarity_public_contact_is_safe(text)
  to service_role;

create or replace function public.comun_update_solidarity_organization_profile_by_access_v1(
  p_request_id uuid,
  p_organization_territory_id uuid,
  p_actor_user_id uuid,
  p_expected_updated_at timestamptz,
  p_presentation_public text,
  p_services_public text[],
  p_service_territory_public text,
  p_public_contact_authorized text,
  p_public_contact_confirmed boolean
)
returns table(
  organization_territory_id uuid,
  organization_updated_at timestamptz,
  idempotent boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_event private.comun_solidarity_economic_content_events%rowtype;
  v_access_id uuid;
  v_organization public.comun_territorial_organizations%rowtype;
  v_now timestamptz := clock_timestamp();
  v_presentation text;
  v_services text[] := array[]::text[];
  v_service_keys text[] := array[]::text[];
  v_service text;
  v_service_key text;
  v_services_length integer := 0;
  v_service_territory text;
  v_public_contact text;
  v_existing_public_contact text;
  v_before jsonb;
  v_after jsonb;
begin
  if p_request_id is null or p_organization_territory_id is null
    or p_actor_user_id is null or p_expected_updated_at is null then
    raise exception 'COMUN_SOLIDARITY_PROFILE_REQUEST_INVALID';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('comun-economic-request:' || p_request_id::text, 0)
  );
  select event.* into v_event
  from private.comun_solidarity_economic_content_events event
  where event.request_id = p_request_id;
  if found then
    if v_event.actor_member_user_id <> p_actor_user_id
      or v_event.organization_territory_id <> p_organization_territory_id
      or v_event.subject_type <> 'organization_profile'
      or v_event.subject_id <> p_organization_territory_id
      or v_event.operation <> 'organization_profile.edit' then
      raise exception 'COMUN_SOLIDARITY_PROFILE_IDEMPOTENCY_CONFLICT';
    end if;
    select organization.updated_at into organization_updated_at
    from public.comun_territorial_organizations organization
    where organization.territory_id = p_organization_territory_id;
    return query select p_organization_territory_id, organization_updated_at, true;
    return;
  end if;

  v_access_id := private.comun_require_solidarity_economic_access(
    p_organization_territory_id,
    p_actor_user_id
  );

  if (select count(*) from private.comun_solidarity_economic_content_events event
      where event.actor_member_user_id = p_actor_user_id
        and event.operation = 'organization_profile.edit'
        and event.occurred_at >= v_now - interval '10 minutes') >= 10
    or (select count(*) from private.comun_solidarity_economic_content_events event
      where event.actor_member_user_id = p_actor_user_id
        and event.operation = 'organization_profile.edit'
        and event.occurred_at >= v_now - interval '24 hours') >= 30 then
    raise exception 'COMUN_SOLIDARITY_PROFILE_RATE_LIMIT';
  end if;

  select organization.* into v_organization
  from public.comun_territorial_organizations organization
  where organization.territory_id = p_organization_territory_id
  for update;
  if not found then
    raise exception 'COMUN_SOLIDARITY_PROFILE_ORGANIZATION_INELIGIBLE';
  end if;
  if v_organization.updated_at <> p_expected_updated_at then
    raise exception 'COMUN_SOLIDARITY_PROFILE_CONFLICT';
  end if;

  v_presentation := nullif(pg_catalog.btrim(pg_catalog.replace(coalesce(p_presentation_public, ''), E'\r\n', E'\n')), '');
  v_service_territory := nullif(pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_service_territory_public, ''), '[[:space:]]+', ' ', 'g')), '');
  v_public_contact := nullif(pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_public_contact_authorized, ''), '[[:space:]]+', ' ', 'g')), '');

  for v_service in
    select pg_catalog.btrim(pg_catalog.regexp_replace(item, '[[:space:]]+', ' ', 'g'))
    from pg_catalog.unnest(coalesce(p_services_public, array[]::text[])) with ordinality as source(item, position)
    order by position
  loop
    if v_service = '' then continue; end if;
    v_service_key := pg_catalog.lower(v_service);
    if v_service_key = any(v_service_keys) then continue; end if;
    if pg_catalog.char_length(v_service) not between 2 and 80 then
      raise exception 'COMUN_SOLIDARITY_PROFILE_SERVICES_INVALID';
    end if;
    v_services := pg_catalog.array_append(v_services, v_service);
    v_service_keys := pg_catalog.array_append(v_service_keys, v_service_key);
    v_services_length := v_services_length + pg_catalog.char_length(v_service);
  end loop;

  if (v_presentation is not null and pg_catalog.char_length(v_presentation) not between 10 and 1200)
    or pg_catalog.cardinality(v_services) > 12
    or v_services_length > 600
    or (v_service_territory is not null and pg_catalog.char_length(v_service_territory) > 300)
    or (v_public_contact is not null and pg_catalog.char_length(v_public_contact) > 200) then
    raise exception 'COMUN_SOLIDARITY_PROFILE_FIELDS_INVALID';
  end if;

  if not private.comun_solidarity_economic_content_is_safe(
    coalesce(v_presentation, '') || E'\n' ||
    pg_catalog.array_to_string(v_services, E'\n') || E'\n' ||
    coalesce(v_service_territory, '')
  ) then
    raise exception 'COMUN_SOLIDARITY_PROFILE_PUBLIC_CONTENT_BLOCKED';
  end if;
  if v_public_contact is not null
    and not private.comun_solidarity_public_contact_is_safe(v_public_contact) then
    raise exception 'COMUN_SOLIDARITY_PROFILE_PUBLIC_CONTACT_BLOCKED';
  end if;

  v_existing_public_contact := nullif(pg_catalog.btrim(coalesce(v_organization.public_contact_authorized, '')), '');
  if v_public_contact is not null
    and v_public_contact is distinct from v_existing_public_contact
    and p_public_contact_confirmed is not true then
    raise exception 'COMUN_SOLIDARITY_PROFILE_PUBLIC_CONTACT_CONFIRMATION_REQUIRED';
  end if;

  v_before := pg_catalog.jsonb_build_object(
    'presentation_public', v_organization.presentation_public,
    'services_public', coalesce(v_organization.services_public, array[]::text[]),
    'service_territory_public', v_organization.service_territory_public,
    'public_contact_authorized', v_organization.public_contact_authorized
  );

  update public.comun_territorial_organizations organization
  set presentation_public = v_presentation,
      services_public = v_services,
      service_territory_public = v_service_territory,
      public_contact_authorized = v_public_contact,
      updated_at = v_now
  where organization.territory_id = p_organization_territory_id;

  v_after := pg_catalog.jsonb_build_object(
    'presentation_public', v_presentation,
    'services_public', v_services,
    'service_territory_public', v_service_territory,
    'public_contact_authorized', v_public_contact
  );

  insert into private.comun_solidarity_economic_content_events(
    request_id, organization_territory_id, actor_access_id, actor_member_user_id,
    subject_type, subject_id, operation, from_state, to_state, occurred_at,
    before_payload_private, after_payload_private
  ) values (
    p_request_id, p_organization_territory_id, v_access_id, p_actor_user_id,
    'organization_profile', p_organization_territory_id,
    'organization_profile.edit', 'current', 'updated', v_now, v_before, v_after
  );

  return query select p_organization_territory_id, v_now, false;
end;
$$;

comment on function public.comun_update_solidarity_organization_profile_by_access_v1(
  uuid, uuid, uuid, timestamptz, text, text[], text, text, boolean
) is
  'Atualiza atomicamente somente os quatro campos cotidianos A6 por acesso revogável ativo. Não altera identidade, verificação, proveniência ou last_verified_at.';

revoke all on function public.comun_update_solidarity_organization_profile_by_access_v1(
  uuid, uuid, uuid, timestamptz, text, text[], text, text, boolean
) from public, anon, authenticated;
grant execute on function public.comun_update_solidarity_organization_profile_by_access_v1(
  uuid, uuid, uuid, timestamptz, text, text[], text, text, boolean
) to service_role;
