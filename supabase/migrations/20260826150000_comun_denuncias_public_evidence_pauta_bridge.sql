-- COMUN 48.6-B2-A1: extend the existing low-friction Pauta RPC with a
-- sanitized Denuncias public projection citation. No new tables or writes.
create or replace function public.comun_create_pauta_low_friction_v1(
  p_actor_user_id uuid,
  p_question text,
  p_normalized_question text,
  p_title text,
  p_slug_base text,
  p_request_key text,
  p_fingerprint_hash text default null,
  p_allow_duplicate boolean default false,
  p_public_evidence jsonb default null
)
returns table(result text, pauta_id uuid, pauta_slug text, idempotent boolean)
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  normalized text;
  request_digest bytea;
  actor_digest bytea;
  fingerprint_digest bytea;
  question_digest bytea;
  existing_request private.comun_pauta_creation_requests%rowtype;
  duplicate_pauta record;
  new_pauta_id uuid := extensions.gen_random_uuid();
  final_slug text;
  recent_actor_hour integer;
  recent_actor_day integer;
  recent_fingerprint_hour integer := 0;
begin
  normalized := lower(regexp_replace(trim(p_question), '\s+', ' ', 'g'));
  if p_actor_user_id is null
    or char_length(trim(p_question)) not between 12 and 500
    or normalized <> p_normalized_question
    or char_length(trim(p_title)) not between 3 and 120
    or p_slug_base !~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'
    or p_request_key !~ '^[0-9a-f]{64}$'
    or (p_fingerprint_hash is not null and p_fingerprint_hash !~ '^[0-9a-f]{64}$')
  then
    raise exception using errcode = '22023', message = 'COMUN_PAUTA_CREATION_INVALID_INPUT';
  end if;

  if p_public_evidence is not null and not (
    (
      jsonb_typeof(p_public_evidence) = 'object'
      and p_public_evidence ->> 'contractVersion' = 'comun.public-evidence-citation.v1'
      and p_public_evidence ->> 'namespace' = 'comun.panorama'
      and p_public_evidence ->> 'refId' like 'panorama:%'
      and p_public_evidence ->> 'versionId' ~ '^sha256:[0-9a-f]{64}$'
      and p_public_evidence ->> 'publicPath' ~ '^/comun/observatorios(?:/|$)'
    )
    or
    (
      jsonb_typeof(p_public_evidence) = 'object'
      and p_public_evidence ->> 'contractVersion' = 'comun.public-evidence-citation.v1'
      and p_public_evidence ->> 'namespace' = 'comun.denuncias'
      and p_public_evidence ->> 'refId' ~ '^denuncias:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and p_public_evidence ->> 'versionId' ~ '^sha256:[0-9a-f]{64}$'
      and p_public_evidence ->> 'publicPath' ~ '^/comun/denuncias/problemas/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and p_public_evidence ->> 'claimKind' = 'community_observation'
      and p_public_evidence ->> 'sourceKind' = 'reviewed_community_projection'
      and p_public_evidence ->> 'category' in ('public_lighting', 'power_distribution', 'smoke_or_environmental_trace')
      and p_public_evidence ->> 'policyVersion' = 'relata-public-projection-v1'
      and jsonb_typeof(p_public_evidence -> 'sourceRefs') = 'array'
      and jsonb_array_length(p_public_evidence -> 'sourceRefs') = 0
      and jsonb_typeof(p_public_evidence -> 'limitations') = 'array'
      and jsonb_typeof(p_public_evidence -> 'location') = 'object'
      and (p_public_evidence ->> 'reportCount') ~ '^[0-9]+$'
      and (p_public_evidence ->> 'firstObservedDate') ~ '^\d{4}-\d{2}-\d{2}$'
      and (p_public_evidence ->> 'lastActivityDate') ~ '^\d{4}-\d{2}-\d{2}$'
      and (p_public_evidence #>> '{location, label}') = 'área aproximada'
      and (p_public_evidence #>> '{location, uncertaintyRadiusMeters}') ~ '^[0-9]+(\.[0-9]+)?$'
    )
  ) then
    raise exception using errcode = '22023', message = 'COMUN_PAUTA_CREATION_INVALID_EVIDENCE';
  end if;

  request_digest := extensions.digest('pauta-create-request-v1:' || p_request_key, 'sha256');
  actor_digest := extensions.digest('pauta-create-actor-v1:' || p_actor_user_id::text, 'sha256');
  question_digest := extensions.digest('pauta-create-question-v1:' || normalized, 'sha256');
  if p_fingerprint_hash is not null then
    fingerprint_digest := extensions.digest('pauta-create-fingerprint-v1:' || p_fingerprint_hash, 'sha256');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_key, 0));
  select * into existing_request
  from private.comun_pauta_creation_requests requests
  where requests.request_hash = request_digest;
  if found then
    return query select 'created'::text, existing_request.pauta_id, spaces.slug, true
      from public.comun_pauta_spaces spaces where spaces.id = existing_request.pauta_id;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(normalized, 1));
  if not p_allow_duplicate then
    select spaces.id, spaces.slug into duplicate_pauta
    from public.comun_pauta_spaces spaces
    where spaces.visibility = 'public'
      and spaces.status <> 'archived'
      and lower(regexp_replace(trim(spaces.problem_public), '\s+', ' ', 'g')) = normalized
    order by spaces.updated_at desc
    limit 1;
    if found then
      return query select 'duplicate_candidate'::text, duplicate_pauta.id, duplicate_pauta.slug, false;
      return;
    end if;
  end if;

  select count(*) filter (where created_at >= now() - interval '1 hour'), count(*)
    into recent_actor_hour, recent_actor_day
  from private.comun_pauta_creation_requests
  where actor_hash = actor_digest and created_at >= now() - interval '1 day';
  if fingerprint_digest is not null then
    select count(*) into recent_fingerprint_hour
    from private.comun_pauta_creation_requests
    where fingerprint_hash = fingerprint_digest and created_at >= now() - interval '1 hour';
  end if;
  if recent_actor_hour >= 3 or recent_actor_day >= 10 or recent_fingerprint_hour >= 5 then
    return query select 'rate_limited'::text, null::uuid, null::text, false;
    return;
  end if;

  final_slug := p_slug_base;
  if exists(select 1 from public.comun_pauta_spaces spaces where spaces.slug = final_slug) then
    final_slug := left(p_slug_base, 70) || '-' || substring(encode(extensions.digest(new_pauta_id::text, 'sha256'), 'hex'), 1, 8);
  end if;

  insert into public.comun_pauta_spaces(
    id, slug, title, summary, category, community, status, visibility,
    public_status, risk_level, problem_public, demand_public,
    proposals_public, participation_public, territory_id
  ) values (
    new_pauta_id, final_slug, trim(p_title), null, null, null, 'observing', 'public',
    'received', 'normal', trim(p_question), null, null, null, null
  );

  insert into public.comun_pauta_memberships(pauta_id, member_user_id, role, status)
  values (new_pauta_id, p_actor_user_id, 'participant', 'active');

  if p_public_evidence is not null then
    insert into public.comun_pauta_evidence_items(
      pauta_id, source_type, source_id, title, summary, evidence_type,
      sensitivity, status, public_note, internal_note,
      public_evidence_ref_id, public_evidence_version, public_evidence_payload
    ) values (
      new_pauta_id, 'public_evidence', null, p_public_evidence ->> 'title',
      p_public_evidence ->> 'referencePeriod', 'dado_agregado',
      'public_safe', 'approved', p_public_evidence #>> '{limitations,0}', null,
      p_public_evidence ->> 'refId', p_public_evidence ->> 'versionId', p_public_evidence
    );
  end if;

  insert into private.comun_pauta_creation_requests(
    request_hash, actor_hash, fingerprint_hash, normalized_question_hash, pauta_id
  ) values (request_digest, actor_digest, fingerprint_digest, question_digest, new_pauta_id);

  return query select 'created'::text, new_pauta_id, final_slug, false;
end;
$$;

revoke all on function public.comun_create_pauta_low_friction_v1(
  uuid, text, text, text, text, text, text, boolean, jsonb
) from public, anon, authenticated;
grant execute on function public.comun_create_pauta_low_friction_v1(
  uuid, text, text, text, text, text, text, boolean, jsonb
) to service_role;
