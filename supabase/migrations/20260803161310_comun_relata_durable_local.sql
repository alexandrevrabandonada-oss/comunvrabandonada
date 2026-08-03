-- TIJOLO 48.0B. Migration real e forward-only, ensaiada somente no Supabase local.
-- Não integra allowlist de promoção remota e não habilita a feature em Production.

create extension if not exists pgcrypto;
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table private.comun_relata_reports (
  id uuid primary key default gen_random_uuid(),
  original_text text not null,
  triage_answers jsonb not null default '{}'::jsonb,
  receipt_hash bytea not null,
  actor_hash bytea not null,
  idempotency_hash bytea not null unique,
  payload_hash bytea not null,
  privacy_class text not null,
  retention_class text not null default 'private_unsubmitted',
  retention_policy_version text not null default 'relata-retention-proposal-v1',
  review_after timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint comun_relata_report_text_length check (char_length(original_text) between 8 and 600),
  constraint comun_relata_report_answers_object check (jsonb_typeof(triage_answers) = 'object'),
  constraint comun_relata_report_hash_lengths check (
    octet_length(receipt_hash) = 32 and
    octet_length(actor_hash) = 32 and
    octet_length(idempotency_hash) = 32 and
    octet_length(payload_hash) = 32
  ),
  constraint comun_relata_report_privacy check (
    privacy_class in ('public_safe','public_after_sanitization','restricted','sensitive','high_risk')
  ),
  constraint comun_relata_report_retention check (
    retention_class in ('private_unsubmitted','withdrawn','future_forwarded','sensitive','audit_evidence')
  )
);

create table public.comun_relata_cases (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references private.comun_relata_reports(id) on delete restrict,
  protocol text not null unique,
  protocol_kind text not null default 'comun',
  is_official boolean not null default false,
  official_protocol text,
  category text not null,
  urgency text not null,
  routing_rule_version text not null,
  routing_decision jsonb not null,
  state text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint comun_relata_case_protocol_shape check (protocol ~ '^COMUN-RELATA-[A-F0-9]{16}$'),
  constraint comun_relata_case_never_official check (
    protocol_kind = 'comun' and is_official = false and official_protocol is null
  ),
  constraint comun_relata_case_category check (
    category in ('public_lighting','power_distribution','electrical_hazard','active_fire','smoke_or_environmental_trace','other')
  ),
  constraint comun_relata_case_urgency check (urgency in ('routine','attention','urgent','emergency')),
  constraint comun_relata_case_decision_object check (jsonb_typeof(routing_decision) = 'object'),
  constraint comun_relata_case_state check (
    state in ('draft','triage','awaiting_person','routed','stored_private','withdrawn')
  )
);

create table public.comun_relata_consents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.comun_relata_cases(id) on delete restrict,
  consent_version text not null,
  accepted_at timestamptz not null default now(),
  allows_public_projection boolean not null default false,
  allows_official_forwarding boolean not null default false,
  constraint comun_relata_consent_private_only check (
    allows_public_projection = false and allows_official_forwarding = false
  )
);

create table public.comun_relata_status_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  state text not null,
  actor text not null,
  result_code text not null,
  occurred_at timestamptz not null default now(),
  constraint comun_relata_event_state check (
    state in ('draft','triage','awaiting_person','routed','stored_private','withdrawn')
  ),
  constraint comun_relata_event_actor check (actor in ('person','system_local','human_review')),
  constraint comun_relata_event_code check (result_code ~ '^RELATA_[A-Z0-9_]{3,80}$')
);

create table private.comun_relata_private_locations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references private.comun_relata_reports(id) on delete restrict,
  precision text not null,
  encrypted_value bytea not null,
  created_at timestamptz not null default now(),
  constraint comun_relata_location_not_available_48_0b check (false) no inherit
);

create table public.comun_relata_public_snapshots (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.comun_relata_cases(id) on delete restrict,
  public_summary text not null,
  approximate_location jsonb not null,
  publication_state text not null default 'blocked',
  created_at timestamptz not null default now(),
  constraint comun_relata_snapshot_blocked check (publication_state = 'blocked')
);

create index comun_relata_cases_state_created_idx
  on public.comun_relata_cases (state, created_at desc);
create index comun_relata_cases_category_created_idx
  on public.comun_relata_cases (category, created_at desc);
create index comun_relata_status_events_case_time_idx
  on public.comun_relata_status_events (case_id, occurred_at, id);
create index comun_relata_reports_review_idx
  on private.comun_relata_reports (retention_class, review_after);

create or replace function private.comun_relata_reject_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
begin
  raise exception using errcode = '42501', message = 'COMUN_RELATA_EVENT_APPEND_ONLY';
end;
$$;

create or replace function private.comun_relata_reject_public_snapshot()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
begin
  raise exception using errcode = '42501', message = 'COMUN_RELATA_PUBLICATION_BLOCKED_48_0B';
end;
$$;

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

  if new.state is distinct from old.state and not (old.state = 'stored_private' and new.state = 'withdrawn') then
    raise exception using errcode = '23514', message = 'COMUN_RELATA_INVALID_STATE_TRANSITION';
  end if;
  return new;
end;
$$;

create trigger comun_relata_status_events_append_only
before update or delete on public.comun_relata_status_events
for each row execute function private.comun_relata_reject_event_mutation();

create trigger comun_relata_public_snapshots_blocked
before insert or update or delete on public.comun_relata_public_snapshots
for each row execute function private.comun_relata_reject_public_snapshot();

create trigger comun_relata_case_identity_guard
before update on public.comun_relata_cases
for each row execute function private.comun_relata_guard_case_identity();

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
returns table (
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
begin
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{32,160}$'
    or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$' then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_PROOF';
  end if;
  if char_length(trim(p_original_text)) not between 8 and 600 then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_TEXT';
  end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object'
    or coalesce(p_answers, '{}'::jsonb) - 'homes_power' <> '{}'::jsonb
    or (
      coalesce(p_answers, '{}'::jsonb) ? 'homes_power'
      and coalesce(p_answers, '{}'::jsonb)->>'homes_power' not in ('sim', 'nao')
    )
    or jsonb_typeof(coalesce(p_decision, '{}'::jsonb)) <> 'object'
    or octet_length(convert_to(coalesce(p_decision, '{}'::jsonb)::text, 'utf8')) > 4096 then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_TRIAGE';
  end if;
  if p_category not in ('public_lighting','power_distribution','electrical_hazard','active_fire','smoke_or_environmental_trace','other')
    or p_urgency not in ('routine','attention','urgent','emergency')
    or p_rule_version <> 'relata-routing-v1'
    or p_privacy_class not in ('public_safe','public_after_sanitization','restricted','sensitive','high_risk')
    or p_consent_version <> 'relata-consent-v1' then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_INVALID_CONTRACT';
  end if;

  v_decision := jsonb_build_object(
    'category', p_category,
    'urgency', p_urgency,
    'ruleVersion', p_rule_version,
    'source', 'deterministic_server_route'
  );

  v_idempotency_hash := extensions.digest('relata-idempotency-v1:' || p_idempotency_key, 'sha256');
  v_receipt_hash := extensions.digest('relata-receipt-v1:' || p_receipt_secret, 'sha256');
  v_payload_hash := extensions.digest(
    convert_to(jsonb_build_object(
      'text', trim(p_original_text),
      'answers', coalesce(p_answers, '{}'::jsonb),
      'category', p_category,
      'urgency', p_urgency,
      'ruleVersion', p_rule_version,
      'decision', v_decision,
      'privacyClass', p_privacy_class,
      'consentVersion', p_consent_version
    )::text, 'utf8'),
    'sha256'
  );

  perform pg_advisory_xact_lock(hashtextextended(encode(v_idempotency_hash, 'hex'), 4800));

  select * into v_report
  from private.comun_relata_reports report
  where report.idempotency_hash = v_idempotency_hash;

  if found then
    if v_report.payload_hash <> v_payload_hash or v_report.receipt_hash <> v_receipt_hash then
      raise exception using errcode = 'P0001', message = 'COMUN_RELATA_IDEMPOTENCY_CONFLICT';
    end if;
    select * into strict v_case
    from public.comun_relata_cases existing_case
    where existing_case.report_id = v_report.id;
    return query select v_case.protocol, v_case.state, v_case.category, v_case.urgency,
      v_case.routing_rule_version, v_case.created_at, true;
    return;
  end if;

  insert into private.comun_relata_reports (
    original_text, triage_answers, receipt_hash, actor_hash, idempotency_hash,
    payload_hash, privacy_class, retention_class, review_after
  ) values (
    trim(p_original_text), coalesce(p_answers, '{}'::jsonb), v_receipt_hash,
    extensions.digest('relata-actor-v1:' || p_receipt_secret, 'sha256'),
    v_idempotency_hash, v_payload_hash, p_privacy_class,
    case when p_privacy_class in ('sensitive','high_risk') then 'sensitive' else 'private_unsubmitted' end,
    now() + case when p_privacy_class in ('sensitive','high_risk') then interval '30 days' else interval '90 days' end
  ) returning * into v_report;

  loop
    v_protocol := 'COMUN-RELATA-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
    exit when not exists (
      select 1 from public.comun_relata_cases existing_case where existing_case.protocol = v_protocol
    );
  end loop;

  insert into public.comun_relata_cases (
    report_id, protocol, category, urgency, routing_rule_version, routing_decision, state
  ) values (
    v_report.id, v_protocol, p_category, p_urgency, p_rule_version, v_decision, 'stored_private'
  ) returning * into v_case;

  insert into public.comun_relata_consents (case_id, consent_version)
  values (v_case.id, p_consent_version);

  insert into public.comun_relata_status_events (case_id, state, actor, result_code)
  values
    (v_case.id, 'draft', 'person', 'RELATA_DRAFT_ACCEPTED'),
    (v_case.id, 'triage', 'system_local', 'RELATA_TRIAGE_RECORDED'),
    (v_case.id, 'routed', 'system_local', 'RELATA_ROUTE_CLASSIFIED'),
    (v_case.id, 'stored_private', 'system_local', 'RELATA_STORED_PRIVATE');

  return query select v_case.protocol, v_case.state, v_case.category, v_case.urgency,
    v_case.routing_rule_version, v_case.created_at, false;
end;
$$;

create or replace function public.comun_relata_get_receipt(
  p_protocol text,
  p_receipt_secret text
)
returns table (
  protocol text,
  state text,
  category text,
  urgency text,
  rule_version text,
  created_at timestamptz,
  withdrawn_at timestamptz,
  timeline jsonb
)
language sql
stable
security definer
set search_path = 'pg_catalog'
as $$
  select
    relata_case.protocol,
    relata_case.state,
    relata_case.category,
    relata_case.urgency,
    relata_case.routing_rule_version,
    relata_case.created_at,
    relata_case.withdrawn_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'state', status_event.state,
        'occurredAt', status_event.occurred_at,
        'resultCode', status_event.result_code
      ) order by status_event.occurred_at, status_event.id)
      from public.comun_relata_status_events status_event
      where status_event.case_id = relata_case.id
    ), '[]'::jsonb)
  from public.comun_relata_cases relata_case
  join private.comun_relata_reports report on report.id = relata_case.report_id
  where p_protocol ~ '^COMUN-RELATA-[A-F0-9]{16}$'
    and p_receipt_secret ~ '^[A-Za-z0-9_-]{32,160}$'
    and relata_case.protocol = p_protocol
    and report.receipt_hash = extensions.digest('relata-receipt-v1:' || p_receipt_secret, 'sha256');
$$;

create or replace function public.comun_relata_withdraw(
  p_protocol text,
  p_receipt_secret text
)
returns table (
  protocol text,
  state text,
  category text,
  urgency text,
  rule_version text,
  created_at timestamptz,
  withdrawn_at timestamptz,
  timeline jsonb
)
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_case public.comun_relata_cases%rowtype;
  v_report private.comun_relata_reports%rowtype;
begin
  if p_protocol !~ '^COMUN-RELATA-[A-F0-9]{16}$'
    or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$' then
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_protocol, 4801));
  select * into v_case
  from public.comun_relata_cases relata_case
  where relata_case.protocol = p_protocol;
  if not found then return; end if;

  select * into v_report
  from private.comun_relata_reports report
  where report.id = v_case.report_id
    and report.receipt_hash = extensions.digest('relata-receipt-v1:' || p_receipt_secret, 'sha256');
  if not found then return; end if;

  if v_case.state <> 'withdrawn' then
    update public.comun_relata_cases
      set state = 'withdrawn', withdrawn_at = now(), updated_at = now()
      where id = v_case.id
      returning * into v_case;
    update private.comun_relata_reports
      set withdrawn_at = v_case.withdrawn_at,
          retention_class = 'withdrawn',
          review_after = v_case.withdrawn_at + interval '30 days'
      where id = v_report.id;
    insert into public.comun_relata_status_events (case_id, state, actor, result_code)
      values (v_case.id, 'withdrawn', 'person', 'RELATA_WITHDRAWN_BY_HOLDER');
  end if;

  return query
  select receipt.* from public.comun_relata_get_receipt(p_protocol, p_receipt_secret) receipt;
end;
$$;

alter table private.comun_relata_reports enable row level security;
alter table private.comun_relata_reports force row level security;
alter table private.comun_relata_private_locations enable row level security;
alter table private.comun_relata_private_locations force row level security;
alter table public.comun_relata_cases enable row level security;
alter table public.comun_relata_cases force row level security;
alter table public.comun_relata_consents enable row level security;
alter table public.comun_relata_consents force row level security;
alter table public.comun_relata_status_events enable row level security;
alter table public.comun_relata_status_events force row level security;
alter table public.comun_relata_public_snapshots enable row level security;
alter table public.comun_relata_public_snapshots force row level security;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on table public.comun_relata_cases from public, anon, authenticated;
revoke all on table public.comun_relata_consents from public, anon, authenticated;
revoke all on table public.comun_relata_status_events from public, anon, authenticated;
revoke all on table public.comun_relata_public_snapshots from public, anon, authenticated;
revoke all on sequence public.comun_relata_status_events_id_seq from public, anon, authenticated;

revoke all on function private.comun_relata_reject_event_mutation() from public;
revoke all on function private.comun_relata_reject_public_snapshot() from public;
revoke all on function private.comun_relata_guard_case_identity() from public;
revoke all on function public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text) from public;
revoke all on function public.comun_relata_get_receipt(text,text) from public;
revoke all on function public.comun_relata_withdraw(text,text) from public;

grant execute on function public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text) to service_role;
grant execute on function public.comun_relata_get_receipt(text,text) to service_role;
grant execute on function public.comun_relata_withdraw(text,text) to service_role;

comment on table private.comun_relata_reports is
  '48.0B local-only: texto original, provas em hash e retenção proposta; sem promoção remota.';
comment on table public.comun_relata_public_snapshots is
  'Contrato futuro. Inserts ficam bloqueados integralmente no 48.0B.';
