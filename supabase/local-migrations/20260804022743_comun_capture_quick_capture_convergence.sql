-- TIJOLO 48.0F. Convergência local-only e forward-only.
-- A captura rápida usa Relata como fonte da verdade; o fluxo legado permanece intacto.

alter table public.comun_relata_cases
  drop constraint if exists comun_relata_case_category;
alter table public.comun_relata_cases
  add constraint comun_relata_case_category check (
    category in (
      'public_lighting','power_distribution','electrical_hazard','active_fire',
      'smoke_or_environmental_trace','sidewalk_accessibility','waste_or_debris',
      'public_transport','public_health','public_education','workplace',
      'environmental_pollution','other'
    )
  );

alter table public.comun_relata_cases
  drop constraint if exists comun_relata_case_state;
alter table public.comun_relata_cases
  add constraint comun_relata_case_state check (
    state in ('captured_private','draft','triage','awaiting_person','routed','stored_private','withdrawn')
  );

alter table public.comun_relata_status_events
  drop constraint if exists comun_relata_event_state;
alter table public.comun_relata_status_events
  add constraint comun_relata_event_state check (
    state in ('captured_private','draft','triage','awaiting_person','routed','stored_private','withdrawn')
  );

create table private.comun_relata_capture_metadata (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references private.comun_relata_reports(id) on delete restrict,
  capture_version text not null default 'capture-v2',
  source text not null default 'vi_um_problema',
  draft_state text not null default 'captured_private',
  interaction_count integer not null default 0 check (interaction_count between 0 and 20),
  has_photo boolean not null default false,
  has_location boolean not null default false,
  created_at timestamptz not null default now(),
  constraint comun_capture_metadata_source check (source = 'vi_um_problema'),
  constraint comun_capture_metadata_state check (draft_state in ('captured_private','stored_private','withdrawn'))
);

create table private.comun_relata_protocol_aliases (
  alias text primary key,
  canonical_protocol text not null,
  alias_kind text not null,
  source_domain text not null,
  created_at timestamptz not null default now(),
  constraint comun_protocol_alias_kind check (alias_kind in ('legacy','new','future')),
  constraint comun_protocol_alias_domain check (source_domain in ('legacy','relata','future')),
  constraint comun_protocol_alias_not_official check (canonical_protocol !~ '^OFICIAL-')
);

create table private.comun_relata_capture_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  interaction_count integer not null default 0 check (interaction_count between 0 and 20),
  duration_bucket text,
  category text,
  error_code text,
  created_at timestamptz not null default now(),
  constraint comun_capture_event_type check (event_type in ('capture_started','photo_added','location_added','question_shown','protocol_issued','capture_abandoned','capture_completed','capture_error','follow_up_started')),
  constraint comun_capture_event_duration check (duration_bucket is null or duration_bucket in ('under_15s','15_to_30s','31_to_60s','over_60s')),
  constraint comun_capture_event_category check (category is null or category in ('public_lighting','power_distribution','electrical_hazard','active_fire','smoke_or_environmental_trace','sidewalk_accessibility','waste_or_debris','public_transport','public_health','public_education','workplace','environmental_pollution','other'))
);

create table private.comun_relata_legacy_projections (
  id uuid primary key default gen_random_uuid(),
  relata_case_id uuid not null unique references public.comun_relata_cases(id) on delete restrict,
  legacy_report_id uuid unique references public.comun_reports(id) on delete set null,
  projection_state text not null default 'not_materialized',
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_legacy_projection_state check (projection_state in ('not_materialized','materialized','failed','withdrawn'))
);

create or replace function private.comun_relata_guard_case_identity()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
begin
  if new.protocol is distinct from old.protocol
    or new.protocol_kind is distinct from old.protocol_kind
    or new.is_official is distinct from old.is_official
    or new.official_protocol is distinct from old.official_protocol then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_PROTOCOL_IMMUTABLE';
  end if;

  if new.state is distinct from old.state and not (
    (old.state in ('captured_private','stored_private') and new.state = 'withdrawn')
    or (old.state = 'captured_private' and new.state = 'stored_private')
  ) then
    raise exception using errcode = '23514', message = 'COMUN_RELATA_INVALID_STATE_TRANSITION';
  end if;
  return new;
end;
$$;

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
returns table (protocol text, state text, category text, urgency text, rule_version text, created_at timestamptz, idempotent boolean)
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_idempotency_hash bytea;
  v_receipt_hash bytea;
  v_payload_hash bytea;
  v_decision jsonb;
  v_report private.comun_relata_reports%rowtype;
  v_case public.comun_relata_cases%rowtype;
  v_protocol text;
  v_capture boolean := coalesce(p_decision->>'captureMode', '') = 'quick_v2';
  v_initial_state text := case when v_capture then 'captured_private' else 'stored_private' end;
begin
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{32,160}$' or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$' then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_PROOF';
  end if;
  if char_length(trim(p_original_text)) not between 8 and 600 then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_TEXT';
  end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object'
    or (coalesce(p_answers, '{}'::jsonb) - 'homes_power' - 'smoke_active' - 'blocked' - 'line' - 'direction' - 'unit' - 'school_type') <> '{}'::jsonb
    or (coalesce(p_answers, '{}'::jsonb) ? 'homes_power' and coalesce(p_answers, '{}'::jsonb)->>'homes_power' not in ('sim','nao'))
    or jsonb_typeof(coalesce(p_decision, '{}'::jsonb)) <> 'object'
    or octet_length(convert_to(coalesce(p_decision, '{}'::jsonb)::text, 'utf8')) > 4096 then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_TRIAGE';
  end if;
  if p_category not in ('public_lighting','power_distribution','electrical_hazard','active_fire','smoke_or_environmental_trace','sidewalk_accessibility','waste_or_debris','public_transport','public_health','public_education','workplace','environmental_pollution','other')
    or p_urgency not in ('routine','attention','urgent','emergency')
    or p_rule_version <> 'relata-routing-v1'
    or p_privacy_class not in ('public_safe','public_after_sanitization','restricted','sensitive','high_risk')
    or p_consent_version <> 'relata-consent-v1' then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_CONTRACT';
  end if;

  v_decision := coalesce(p_decision, '{}'::jsonb) || jsonb_build_object('category',p_category,'urgency',p_urgency,'ruleVersion',p_rule_version,'source','deterministic_server_route');
  v_idempotency_hash := extensions.digest('relata-idempotency-v1:' || p_idempotency_key, 'sha256');
  v_receipt_hash := extensions.digest('relata-receipt-v1:' || p_receipt_secret, 'sha256');
  v_payload_hash := extensions.digest(convert_to(jsonb_build_object('text',trim(p_original_text),'answers',coalesce(p_answers,'{}'::jsonb),'category',p_category,'urgency',p_urgency,'ruleVersion',p_rule_version,'decision',v_decision,'privacyClass',p_privacy_class,'consentVersion',p_consent_version)::text,'utf8'),'sha256');
  perform pg_advisory_xact_lock(hashtextextended(encode(v_idempotency_hash,'hex'),4800));
  select * into v_report from private.comun_relata_reports report where report.idempotency_hash = v_idempotency_hash;
  if found then
    if v_report.payload_hash <> v_payload_hash or v_report.receipt_hash <> v_receipt_hash then raise exception using errcode='P0001',message='COMUN_RELATA_IDEMPOTENCY_CONFLICT'; end if;
    select * into strict v_case from public.comun_relata_cases existing_case where existing_case.report_id=v_report.id;
    return query select v_case.protocol,v_case.state,v_case.category,v_case.urgency,v_case.routing_rule_version,v_case.created_at,true;
    return;
  end if;
  insert into private.comun_relata_reports(original_text,triage_answers,receipt_hash,actor_hash,idempotency_hash,payload_hash,privacy_class,retention_class,review_after)
  values(trim(p_original_text),coalesce(p_answers,'{}'::jsonb),v_receipt_hash,extensions.digest('relata-actor-v1:'||p_receipt_secret,'sha256'),v_idempotency_hash,v_payload_hash,p_privacy_class,case when p_privacy_class in ('sensitive','high_risk') then 'sensitive' else 'private_unsubmitted' end,now()+case when p_privacy_class in ('sensitive','high_risk') then interval '30 days' else interval '90 days' end) returning * into v_report;
  loop
    v_protocol := 'COMUN-RELATA-' || upper(encode(extensions.gen_random_bytes(8),'hex'));
    exit when not exists(select 1 from public.comun_relata_cases existing_case where existing_case.protocol=v_protocol);
  end loop;
  insert into public.comun_relata_cases(report_id,protocol,category,urgency,routing_rule_version,routing_decision,state)
  values(v_report.id,v_protocol,p_category,p_urgency,p_rule_version,v_decision,v_initial_state) returning * into v_case;
  insert into public.comun_relata_consents(case_id,consent_version) values(v_case.id,p_consent_version);
  insert into public.comun_relata_status_events(case_id,state,actor,result_code) values
    (v_case.id,case when v_capture then 'captured_private' else 'draft' end,'person',case when v_capture then 'RELATA_CAPTURED_PRIVATE' else 'RELATA_DRAFT_ACCEPTED' end),
    (v_case.id,'triage','system_local','RELATA_TRIAGE_RECORDED'),
    (v_case.id,'routed','system_local','RELATA_ROUTE_CLASSIFIED'),
    (v_case.id,v_initial_state,'system_local',case when v_capture then 'RELATA_CAPTURE_READY' else 'RELATA_STORED_PRIVATE' end);
  if v_capture then
    insert into private.comun_relata_capture_metadata(report_id,interaction_count) values(v_report.id,0);
  end if;
  return query select v_case.protocol,v_case.state,v_case.category,v_case.urgency,v_case.routing_rule_version,v_case.created_at,false;
end;
$$;

create or replace function private.comun_relata_resolve_protocol(p_protocol text)
returns table(canonical_protocol text, protocol_version text, origin text, found boolean)
language sql stable security definer set search_path='pg_catalog'
as $$
  select c.protocol, 'relata-v1', 'relata', true
  from public.comun_relata_cases c where c.protocol = p_protocol
  union all
  select a.canonical_protocol, case when a.alias_kind='legacy' then 'legacy-v1' else 'relata-v1' end, a.source_domain, true
  from private.comun_relata_protocol_aliases a where a.alias = p_protocol
  limit 1;
$$;

create or replace function public.comun_relata_record_capture_event(
  p_event_type text, p_interaction_count integer default 0, p_duration_bucket text default null,
  p_category text default null, p_error_code text default null
)
returns void language plpgsql security definer set search_path='pg_catalog'
as $$
begin
  if p_event_type not in ('capture_started','photo_added','location_added','question_shown','protocol_issued','capture_abandoned','capture_completed','capture_error','follow_up_started') then return; end if;
  insert into private.comun_relata_capture_events(event_type,interaction_count,duration_bucket,category,error_code)
  values(p_event_type,greatest(0,least(coalesce(p_interaction_count,0),20)),p_duration_bucket,p_category,p_error_code);
end;
$$;

alter table private.comun_relata_capture_metadata enable row level security;
alter table private.comun_relata_capture_metadata force row level security;
alter table private.comun_relata_protocol_aliases enable row level security;
alter table private.comun_relata_protocol_aliases force row level security;
alter table private.comun_relata_capture_events enable row level security;
alter table private.comun_relata_capture_events force row level security;
alter table private.comun_relata_legacy_projections enable row level security;
alter table private.comun_relata_legacy_projections force row level security;

revoke all on table private.comun_relata_capture_metadata from public, anon, authenticated;
revoke all on table private.comun_relata_protocol_aliases from public, anon, authenticated;
revoke all on table private.comun_relata_capture_events from public, anon, authenticated;
revoke all on table private.comun_relata_legacy_projections from public, anon, authenticated;
revoke all on function private.comun_relata_resolve_protocol(text) from public, anon, authenticated;
revoke all on function public.comun_relata_record_capture_event(text,integer,text,text,text) from public, anon, authenticated;
grant execute on function private.comun_relata_resolve_protocol(text) to service_role;
grant execute on function public.comun_relata_record_capture_event(text,integer,text,text,text) to service_role;
grant execute on function public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text) to service_role;

comment on table private.comun_relata_capture_metadata is '48.0F local-only: captura rápida, Relata é fonte da verdade e legado é projeção compatível.';
