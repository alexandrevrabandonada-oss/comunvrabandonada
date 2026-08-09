begin;

create or replace function public.comun_relata_create(
  p_idempotency_key text,
  p_receipt_secret text,
  p_original_text text,
  p_answers jsonb,
  p_category text,
  p_urgency text,
  p_rule_version text,
  p_decision jsonb,
  p_privacy_class text,
  p_consent_version text
)
returns table(
  protocol text,
  state text,
  category text,
  urgency text,
  rule_version text,
  created_at timestamptz,
  idempotent boolean
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  ih bytea;
  rh bytea;
  ph bytea;
  rid uuid;
  cid uuid;
  proto text;
  existing private.comun_relata_reports%rowtype;
  decision jsonb;
begin
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{32,160}$'
    or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$'
    or (
      p_original_text is not null
      and char_length(trim(p_original_text)) not between 8 and 600
    )
  then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_PROOF';
  end if;

  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object'
    or coalesce(p_answers, '{}'::jsonb)
      - 'homes_power'
      - 'smoke_active'
      - 'blocked'
      - 'line'
      - 'direction'
      - 'unit'
      - 'school_type' <> '{}'::jsonb
    or (
      coalesce(p_answers, '{}'::jsonb) ? 'homes_power'
      and coalesce(p_answers, '{}'::jsonb)->>'homes_power' not in ('sim', 'nao')
    )
    or jsonb_typeof(coalesce(p_decision, '{}'::jsonb)) <> 'object'
    or octet_length(convert_to(coalesce(p_decision, '{}'::jsonb)::text, 'utf8')) > 4096
  then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_TRIAGE';
  end if;

  if p_category not in (
      'public_lighting',
      'power_distribution',
      'electrical_hazard',
      'active_fire',
      'smoke_or_environmental_trace',
      'sidewalk_accessibility',
      'waste_or_debris',
      'public_transport',
      'public_health',
      'public_education',
      'workplace',
      'environmental_pollution',
      'other'
    )
    or p_urgency not in ('routine', 'attention', 'urgent', 'emergency')
    or p_rule_version <> 'relata-routing-v1'
    or p_privacy_class not in (
      'public_safe',
      'public_after_sanitization',
      'restricted',
      'sensitive',
      'high_risk'
    )
    or p_consent_version <> 'relata-consent-v1'
  then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_CONTRACT';
  end if;

  if p_original_text is null and (
    p_category not in ('other', 'sidewalk_accessibility')
    or p_privacy_class not in ('sensitive', 'high_risk')
    or p_decision->>'captureBasis' is distinct from 'photo_only'
    or p_decision->>'semanticTextState' is distinct from 'absent'
    or p_decision->>'captureState' is distinct from 'captured_private'
    or p_decision->'requiresEnrichment' is distinct from 'true'::jsonb
  )
  then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_PHOTO_ONLY_CONTRACT';
  end if;

  if p_original_text is null then
    decision := jsonb_build_object(
      'category', p_category,
      'urgency', p_urgency,
      'ruleVersion', p_rule_version,
      'source', 'photo_first_private_capture',
      'captureBasis', 'photo_only',
      'semanticTextState', 'absent',
      'captureState', 'captured_private',
      'requiresEnrichment', true,
      'requiresHumanReview', true,
      'confidence', 'low',
      'agencyKind', 'community_review',
      'publication', 'never_automatic',
      'automaticForwarding', false
    );
  else
    decision := jsonb_build_object(
      'category', p_category,
      'urgency', p_urgency,
      'ruleVersion', p_rule_version,
      'source', 'deterministic_server_route'
    );
  end if;

  ih := extensions.digest('relata-idempotency-v1:' || p_idempotency_key, 'sha256');
  rh := extensions.digest('relata-receipt-v1:' || p_receipt_secret, 'sha256');

  if p_original_text is null then
    ph := extensions.digest(
      convert_to(
        jsonb_build_object(
          'text', 'COMUN_NO_SEMANTIC_TEXT_V1',
          'answers', coalesce(p_answers, '{}'::jsonb),
          'category', p_category,
          'urgency', p_urgency,
          'decision', decision
        )::text,
        'utf8'
      ),
      'sha256'
    );
  else
    ph := extensions.digest(
      convert_to(
        jsonb_build_object(
          'text', trim(p_original_text),
          'answers', coalesce(p_answers, '{}'::jsonb),
          'category', p_category,
          'urgency', p_urgency,
          'decision', decision
        )::text,
        'utf8'
      ),
      'sha256'
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(encode(ih, 'hex'), 4800));
  select *
  into existing
  from private.comun_relata_reports
  where idempotency_hash = ih;

  if found then
    if existing.payload_hash <> ph or existing.receipt_hash <> rh then
      raise exception using errcode = 'P0001', message = 'COMUN_RELATA_IDEMPOTENCY_CONFLICT';
    end if;
    return query
      select
        c.protocol,
        c.state,
        c.category,
        c.urgency,
        c.routing_rule_version,
        c.created_at,
        true
      from public.comun_relata_cases c
      where c.report_id = existing.id;
    return;
  end if;

  insert into private.comun_relata_reports(
    original_text,
    triage_answers,
    receipt_hash,
    actor_hash,
    idempotency_hash,
    payload_hash,
    privacy_class,
    routing_rule_version,
    routing_decision,
    urgency,
    consent_version,
    retention_class,
    review_after
  )
  values(
    case when p_original_text is null then null else trim(p_original_text) end,
    coalesce(p_answers, '{}'::jsonb),
    rh,
    extensions.digest('relata-actor-v1:' || p_receipt_secret, 'sha256'),
    ih,
    ph,
    p_privacy_class,
    p_rule_version,
    decision,
    p_urgency,
    p_consent_version,
    case
      when p_privacy_class in ('sensitive', 'high_risk') then 'sensitive'
      else 'private_unsubmitted'
    end,
    now() + case
      when p_privacy_class in ('sensitive', 'high_risk') then interval '30 days'
      else interval '90 days'
    end
  )
  returning id into rid;

  loop
    proto := 'COMUN-RELATA-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
    exit when not exists (
      select 1 from public.comun_relata_cases c where c.protocol = proto
    );
  end loop;

  insert into public.comun_relata_cases(
    report_id,
    protocol,
    category,
    urgency,
    routing_rule_version,
    routing_decision,
    state
  )
  values(
    rid,
    proto,
    p_category,
    p_urgency,
    p_rule_version,
    decision,
    'stored_private'
  )
  returning id into cid;

  insert into public.comun_relata_consents(case_id, consent_version)
  values(cid, p_consent_version);

  insert into public.comun_relata_status_events(case_id, state, actor, result_code)
  values
    (cid, 'draft', 'person', 'RELATA_DRAFT_ACCEPTED'),
    (cid, 'triage', 'system_local', 'RELATA_TRIAGE_RECORDED'),
    (cid, 'routed', 'system_local', 'RELATA_ROUTE_CLASSIFIED'),
    (cid, 'stored_private', 'system_local', 'RELATA_STORED_PRIVATE');

  return query
    select
      proto,
      'stored_private',
      p_category,
      p_urgency,
      p_rule_version,
      now(),
      false;
end;
$$;

revoke all on function public.comun_relata_create(text, text, text, jsonb, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.comun_relata_create(text, text, text, jsonb, text, text, text, jsonb, text, text) to service_role;

commit;

