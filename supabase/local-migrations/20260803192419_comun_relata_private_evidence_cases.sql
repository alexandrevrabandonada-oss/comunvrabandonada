-- TIJOLO 48.0C. Evidências privadas e casos coletivos, somente em Supabase local.
-- Forward-only; não promove release, não publica snapshot e não concede acesso cliente.

alter table private.comun_relata_private_locations
  drop constraint if exists comun_relata_location_not_available_48_0b;

alter table private.comun_relata_private_locations
  add column origin text not null default 'map_pin',
  add column accuracy_class text not null default 'not_provided',
  add column captured_at timestamptz,
  add column contract_version text not null default 'relata-private-location-v1',
  add column nonce bytea,
  add column auth_tag bytea,
  add column key_version text,
  add column evidence_state text not null default 'added_private',
  add column approximate_region text,
  add column approximation_level text,
  add column derivation_method text,
  add column geographic_risk text not null default 'unreviewed',
  add column review_required boolean not null default true,
  add column withdrawn_at timestamptz;

alter table private.comun_relata_private_locations
  add constraint comun_relata_location_origin_check
    check (origin in ('device','map_pin')),
  add constraint comun_relata_location_precision_check
    check (precision in ('device','map_pin')),
  add constraint comun_relata_location_accuracy_check
    check (accuracy_class in ('not_provided','under_25m','25_to_100m','over_100m')),
  add constraint comun_relata_location_crypto_check
    check (
      octet_length(encrypted_value) between 16 and 512 and
      octet_length(nonce) = 12 and
      octet_length(auth_tag) = 16 and
      key_version ~ '^relata-location-key-v[0-9]{1,3}$'
    ),
  add constraint comun_relata_location_contract_check
    check (contract_version = 'relata-private-location-v1'),
  add constraint comun_relata_location_state_check
    check (evidence_state in ('added_private','approximate_private','withdrawn')),
  add constraint comun_relata_location_candidate_check
    check (
      approximation_level is null or
      approximation_level in ('neighborhood','region','none')
    ),
  add constraint comun_relata_location_risk_check
    check (geographic_risk in ('unreviewed','low','medium','high','sensitive')),
  add constraint comun_relata_location_never_public_check
    check (review_required = true);

create table private.comun_relata_attachments (
  id uuid primary key,
  report_id uuid not null references private.comun_relata_reports(id) on delete restrict,
  label_index smallint not null check (label_index between 1 and 3),
  object_key text not null unique,
  derivative_object_key text not null unique,
  declared_mime_type text not null check (declared_mime_type in ('image/jpeg','image/png','image/webp')),
  declared_size_bucket text not null check (declared_size_bucket in ('under_1mb','1_to_4mb','4_to_8mb')),
  actual_mime_type text check (actual_mime_type in ('image/jpeg','image/png','image/webp')),
  actual_size_bytes bigint check (actual_size_bytes between 12 and 8388608),
  derivative_size_bytes bigint check (derivative_size_bytes between 12 and 8388608),
  width integer check (width between 1 and 200000),
  height integer check (height between 1 and 200000),
  checksum_sha256 bytea,
  derivative_checksum_sha256 bytea,
  state text not null default 'quarantine' check (
    state in ('quarantine','validating','sealed_private','rejected','orphaned','withdrawn')
  ),
  rejection_code text,
  review_required_for_publication boolean not null default true,
  retention_class text not null default 'private_evidence',
  review_after timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sealed_at timestamptz,
  withdrawn_at timestamptz,
  constraint comun_relata_attachment_paths_opaque check (
    object_key = 'quarantine/' || id::text || '.bin' and
    derivative_object_key = 'sealed/' || id::text || '.webp'
  ),
  constraint comun_relata_attachment_hashes check (
    (checksum_sha256 is null or octet_length(checksum_sha256) = 32) and
    (derivative_checksum_sha256 is null or octet_length(derivative_checksum_sha256) = 32)
  ),
  constraint comun_relata_attachment_private_only check (review_required_for_publication = true),
  unique (report_id, label_index)
);

create unique index comun_relata_attachment_dedup_idx
  on private.comun_relata_attachments(report_id, checksum_sha256)
  where checksum_sha256 is not null and state = 'sealed_private';
create index comun_relata_attachment_cleanup_idx
  on private.comun_relata_attachments(state, review_after);

create table public.comun_relata_evidence_consents (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  consent_kind text not null check (
    consent_kind in ('private_location','private_attachment','collective_grouping')
  ),
  consent_version text not null check (consent_version ~ '^relata-[a-z-]+-v[0-9]{1,3}$'),
  active boolean not null,
  result_code text not null check (result_code ~ '^RELATA_[A-Z0-9_]{3,80}$'),
  occurred_at timestamptz not null default now(),
  allows_public_projection boolean not null default false,
  allows_official_forwarding boolean not null default false,
  constraint comun_relata_evidence_consent_private_only check (
    allows_public_projection = false and allows_official_forwarding = false
  )
);

create table public.comun_relata_collective_cases (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('public_lighting','power_distribution','electrical_hazard','active_fire','smoke_or_environmental_trace','other')
  ),
  collective_urgency text not null check (collective_urgency in ('routine','attention','urgent','emergency')),
  state text not null default 'active' check (state in ('active','inactive','review_future')),
  match_rule text not null,
  match_rule_version text not null check (match_rule_version = 'relata-match-v1'),
  active_members_count integer not null default 0 check (active_members_count >= 0),
  first_report_at timestamptz not null,
  last_report_at timestamptz not null,
  confidence_level text not null check (confidence_level in ('high','medium','low','blocked')),
  future_map_eligibility boolean not null default false,
  review_state text not null default 'not_requested' check (
    review_state in ('not_requested','future_review_required','corrected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_relata_collective_never_public check (future_map_eligibility = false)
);

create table public.comun_relata_case_memberships (
  id uuid primary key default gen_random_uuid(),
  collective_case_id uuid not null references public.comun_relata_collective_cases(id) on delete restrict,
  individual_case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  membership_role text not null default 'report' check (membership_role in ('seed','report')),
  association_method text not null check (
    association_method in ('auto_link_high_confidence','candidate_medium_confidence','new_collective_case','never_auto_link','human_review_future')
  ),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  match_rule_version text not null check (match_rule_version = 'relata-match-v1'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  constraint comun_relata_membership_end_check check (
    (active and ended_at is null and end_reason is null) or
    (not active and ended_at is not null and end_reason ~ '^RELATA_[A-Z0-9_]{3,80}$')
  )
);

create unique index comun_relata_one_active_membership_idx
  on public.comun_relata_case_memberships(individual_case_id)
  where active;
create index comun_relata_collective_active_members_idx
  on public.comun_relata_case_memberships(collective_case_id, created_at)
  where active;

create table private.comun_relata_case_match_keys (
  id bigint generated always as identity primary key,
  individual_case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  collective_case_id uuid not null references public.comun_relata_collective_cases(id) on delete restrict,
  key_hash bytea not null check (octet_length(key_hash) = 32),
  match_rule_version text not null check (match_rule_version = 'relata-match-v1'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (individual_case_id, key_hash, created_at)
);

create index comun_relata_match_key_lookup_idx
  on private.comun_relata_case_match_keys(key_hash, created_at desc)
  where active;

create table public.comun_relata_case_match_events (
  id bigint generated always as identity primary key,
  individual_case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  previous_collective_case_id uuid references public.comun_relata_collective_cases(id) on delete restrict,
  collective_case_id uuid not null references public.comun_relata_collective_cases(id) on delete restrict,
  decision text not null check (
    decision in ('auto_link_high_confidence','candidate_medium_confidence','new_collective_case','never_auto_link','human_review_future','withdrawn_unlinked')
  ),
  confidence_level text not null check (confidence_level in ('high','medium','low','blocked')),
  match_rule_version text not null check (match_rule_version = 'relata-match-v1'),
  result_code text not null check (result_code ~ '^RELATA_[A-Z0-9_]{3,80}$'),
  occurred_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comun-relata-private',
  'comun-relata-private',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.comun_relata_reject_append_only_mutation()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
begin
  raise exception using errcode = '42501', message = 'COMUN_RELATA_EVIDENCE_EVENT_APPEND_ONLY';
end;
$$;

create or replace function private.comun_relata_guard_attachment()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
begin
  if new.id is distinct from old.id
    or new.report_id is distinct from old.report_id
    or new.label_index is distinct from old.label_index
    or new.object_key is distinct from old.object_key
    or new.derivative_object_key is distinct from old.derivative_object_key then
    raise exception using errcode = '42501', message = 'COMUN_RELATA_ATTACHMENT_IDENTITY_IMMUTABLE';
  end if;
  if old.state = 'sealed_private' and new.state not in ('sealed_private','withdrawn') then
    raise exception using errcode = '23514', message = 'COMUN_RELATA_ATTACHMENT_INVALID_TRANSITION';
  end if;
  if old.state in ('rejected','withdrawn') and new.state <> old.state then
    raise exception using errcode = '23514', message = 'COMUN_RELATA_ATTACHMENT_TERMINAL';
  end if;
  return new;
end;
$$;

create trigger comun_relata_evidence_consents_append_only
before update or delete on public.comun_relata_evidence_consents
for each row execute function private.comun_relata_reject_append_only_mutation();

create trigger comun_relata_match_events_append_only
before update or delete on public.comun_relata_case_match_events
for each row execute function private.comun_relata_reject_append_only_mutation();

create trigger comun_relata_attachment_guard
before update on private.comun_relata_attachments
for each row execute function private.comun_relata_guard_attachment();

create or replace function private.comun_relata_authorized_context(
  p_protocol text,
  p_receipt_secret text
)
returns table (report_id uuid, case_id uuid, case_state text, category text, urgency text, privacy_class text)
language sql
stable
security definer
set search_path = 'pg_catalog'
as $$
  select report.id, relata_case.id, relata_case.state, relata_case.category,
    relata_case.urgency, report.privacy_class
  from public.comun_relata_cases relata_case
  join private.comun_relata_reports report on report.id = relata_case.report_id
  where p_protocol ~ '^COMUN-RELATA-[A-F0-9]{16}$'
    and p_receipt_secret ~ '^[A-Za-z0-9_-]{32,160}$'
    and relata_case.protocol = p_protocol
    and report.receipt_hash = extensions.digest('relata-receipt-v1:' || p_receipt_secret, 'sha256');
$$;

create or replace function public.comun_relata_add_location(
  p_protocol text,
  p_receipt_secret text,
  p_origin text,
  p_accuracy_class text,
  p_captured_at timestamptz,
  p_ciphertext bytea,
  p_nonce bytea,
  p_auth_tag bytea,
  p_key_version text,
  p_approximate_region text,
  p_approximation_level text,
  p_geographic_risk text
)
returns table (location_state text, grouping_allowed boolean)
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare v_context record;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.case_state = 'withdrawn' then return; end if;
  if p_origin not in ('device','map_pin')
    or p_accuracy_class not in ('not_provided','under_25m','25_to_100m','over_100m')
    or p_captured_at is null or p_captured_at > now() + interval '5 minutes'
    or p_captured_at < now() - interval '7 days'
    or octet_length(p_ciphertext) not between 16 and 512
    or octet_length(p_nonce) <> 12 or octet_length(p_auth_tag) <> 16
    or p_key_version !~ '^relata-location-key-v[0-9]{1,3}$'
    or p_approximation_level not in ('neighborhood','region','none')
    or p_geographic_risk not in ('unreviewed','low','medium','high','sensitive') then
    raise exception using errcode = '22023', message = 'COMUN_RELATA_LOCATION_INVALID';
  end if;
  insert into private.comun_relata_private_locations (
    report_id,precision,encrypted_value,origin,accuracy_class,captured_at,contract_version,
    nonce,auth_tag,key_version,evidence_state,approximate_region,approximation_level,
    derivation_method,geographic_risk,review_required,withdrawn_at
  ) values (
    v_context.report_id,p_origin,p_ciphertext,p_origin,p_accuracy_class,p_captured_at,
    'relata-private-location-v1',p_nonce,p_auth_tag,p_key_version,'added_private',
    nullif(left(coalesce(p_approximate_region,''),80),''),p_approximation_level,
    'server_side_private_candidate_v1',p_geographic_risk,true,null
  )
  on conflict (report_id) do update set
    precision=excluded.precision,encrypted_value=excluded.encrypted_value,origin=excluded.origin,
    accuracy_class=excluded.accuracy_class,captured_at=excluded.captured_at,
    nonce=excluded.nonce,auth_tag=excluded.auth_tag,key_version=excluded.key_version,
    evidence_state='added_private',approximate_region=excluded.approximate_region,
    approximation_level=excluded.approximation_level,geographic_risk=excluded.geographic_risk,
    review_required=true,withdrawn_at=null;
  insert into public.comun_relata_evidence_consents (
    case_id,consent_kind,consent_version,active,result_code
  ) values (v_context.case_id,'private_location','relata-private-location-v1',true,'RELATA_PRIVATE_LOCATION_AUTHORIZED');
  return query select 'added_private'::text, true;
end;
$$;

create or replace function public.comun_relata_begin_attachment(
  p_protocol text,
  p_receipt_secret text,
  p_attachment_id uuid,
  p_declared_mime_type text,
  p_declared_size_bucket text
)
returns table (attachment_id uuid, label_index smallint, attachment_state text)
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare v_context record; v_label smallint; v_existing private.comun_relata_attachments%rowtype;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.case_state = 'withdrawn' then return; end if;
  if p_declared_mime_type not in ('image/jpeg','image/png','image/webp')
    or p_declared_size_bucket not in ('under_1mb','1_to_4mb','4_to_8mb') then
    raise exception using errcode='22023',message='COMUN_RELATA_ATTACHMENT_INVALID';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_context.report_id::text, 4802));
  select * into v_existing from private.comun_relata_attachments where id=p_attachment_id;
  if found then
    if v_existing.report_id <> v_context.report_id then return; end if;
    return query select v_existing.id,v_existing.label_index,v_existing.state;
    return;
  end if;
  select coalesce(max(a.label_index),0)+1 into v_label
  from private.comun_relata_attachments a
  where a.report_id=v_context.report_id;
  if v_label > 3 then raise exception using errcode='23514',message='COMUN_RELATA_ATTACHMENT_LIMIT'; end if;
  insert into private.comun_relata_attachments (
    id,report_id,label_index,object_key,derivative_object_key,declared_mime_type,declared_size_bucket
  ) values (
    p_attachment_id,v_context.report_id,v_label,
    'quarantine/'||p_attachment_id::text||'.bin','sealed/'||p_attachment_id::text||'.webp',
    p_declared_mime_type,p_declared_size_bucket
  ) returning id,private.comun_relata_attachments.label_index,state
    into attachment_id,label_index,attachment_state;
  insert into public.comun_relata_evidence_consents (
    case_id,consent_kind,consent_version,active,result_code
  ) values (v_context.case_id,'private_attachment','relata-private-attachment-v1',true,'RELATA_PRIVATE_ATTACHMENT_AUTHORIZED');
  return next;
end;
$$;

create or replace function public.comun_relata_withdraw_location(
  p_protocol text,p_receipt_secret text
)
returns boolean
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_context record;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found then return false; end if;
  update private.comun_relata_private_locations set evidence_state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now())
    where report_id=v_context.report_id and evidence_state<>'withdrawn';
  if found then
    insert into public.comun_relata_evidence_consents(case_id,consent_kind,consent_version,active,result_code)
      values(v_context.case_id,'private_location','relata-private-location-v1',false,'RELATA_PRIVATE_LOCATION_CONSENT_WITHDRAWN');
    return true;
  end if;
  return exists(select 1 from private.comun_relata_private_locations where report_id=v_context.report_id and evidence_state='withdrawn');
end;
$$;

create or replace function public.comun_relata_mark_attachment_validating(
  p_protocol text,p_receipt_secret text,p_attachment_id uuid
)
returns table (attachment_id uuid, attachment_state text, declared_mime_type text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_context record;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.case_state='withdrawn' then return; end if;
  update private.comun_relata_attachments a set state='validating',updated_at=now()
  where a.id=p_attachment_id and a.report_id=v_context.report_id and a.state='quarantine'
  returning a.id,a.state,a.declared_mime_type into attachment_id,attachment_state,declared_mime_type;
  if found then return next; end if;
end;
$$;

create or replace function public.comun_relata_finalize_attachment(
  p_protocol text,p_receipt_secret text,p_attachment_id uuid,p_actual_mime_type text,
  p_actual_size_bytes bigint,p_derivative_size_bytes bigint,p_width integer,p_height integer,
  p_checksum_sha256 bytea,p_derivative_checksum_sha256 bytea
)
returns table (attachment_id uuid,label_index smallint,attachment_state text,result_code text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_context record; v_row private.comun_relata_attachments%rowtype;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.case_state='withdrawn' then return; end if;
  select * into v_row from private.comun_relata_attachments a
    where a.id=p_attachment_id and a.report_id=v_context.report_id for update;
  if not found then return; end if;
  if v_row.state='sealed_private' then
    return query select v_row.id,v_row.label_index,v_row.state,'RELATA_ATTACHMENT_ALREADY_FINALIZED'::text;
    return;
  end if;
  if v_row.state not in ('quarantine','validating')
    or p_actual_mime_type not in ('image/jpeg','image/png','image/webp')
    or p_actual_size_bytes not between 12 and 8388608
    or p_derivative_size_bytes not between 12 and 8388608
    or p_width < 1 or p_height < 1 or p_width::bigint*p_height::bigint > 20000000
    or octet_length(p_checksum_sha256)<>32 or octet_length(p_derivative_checksum_sha256)<>32 then
    raise exception using errcode='22023',message='COMUN_RELATA_ATTACHMENT_FINALIZATION_INVALID';
  end if;
  if exists(select 1 from private.comun_relata_attachments a where a.report_id=v_context.report_id
    and a.checksum_sha256=p_checksum_sha256 and a.state='sealed_private' and a.id<>p_attachment_id) then
    update private.comun_relata_attachments set state='rejected',rejection_code='duplicate_private_photo',updated_at=now()
      where id=p_attachment_id;
    return query select p_attachment_id,v_row.label_index,'rejected'::text,'RELATA_ATTACHMENT_DUPLICATE'::text;
    return;
  end if;
  update private.comun_relata_attachments set
    actual_mime_type=p_actual_mime_type,actual_size_bytes=p_actual_size_bytes,
    derivative_size_bytes=p_derivative_size_bytes,width=p_width,height=p_height,
    checksum_sha256=p_checksum_sha256,derivative_checksum_sha256=p_derivative_checksum_sha256,
    state='sealed_private',sealed_at=now(),updated_at=now(),rejection_code=null
  where id=p_attachment_id
  returning id,private.comun_relata_attachments.label_index,state
    into attachment_id,label_index,attachment_state;
  result_code:='RELATA_ATTACHMENT_SEALED_PRIVATE';
  return next;
end;
$$;

create or replace function public.comun_relata_reject_attachment(
  p_protocol text,p_receipt_secret text,p_attachment_id uuid,p_rejection_code text
)
returns boolean
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_context record;
begin
  if p_rejection_code not in ('invalid_type','corrupt_image','size_limit','dimension_limit','storage_failure','duplicate_private_photo','partial_failure') then
    raise exception using errcode='22023',message='COMUN_RELATA_ATTACHMENT_REJECTION_INVALID';
  end if;
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found then return false; end if;
  update private.comun_relata_attachments set state='rejected',rejection_code=p_rejection_code,updated_at=now()
    where id=p_attachment_id and report_id=v_context.report_id and state in ('quarantine','validating');
  return found;
end;
$$;

create or replace function public.comun_relata_withdraw_attachment(
  p_protocol text,p_receipt_secret text,p_attachment_id uuid
)
returns boolean
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_context record;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found then return false; end if;
  update private.comun_relata_attachments set state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now()),
    retention_class='withdrawn_evidence',review_after=least(review_after,now()+interval '30 days'),updated_at=now()
    where id=p_attachment_id and report_id=v_context.report_id and state not in ('withdrawn','rejected');
  return found or exists(select 1 from private.comun_relata_attachments where id=p_attachment_id and report_id=v_context.report_id and state='withdrawn');
end;
$$;

create or replace function public.comun_relata_authorize_attachment_read(
  p_protocol text,p_receipt_secret text,p_attachment_id uuid
)
returns table (attachment_id uuid,label_index smallint,mime_type text)
language sql stable security definer set search_path='pg_catalog'
as $$
  select a.id,a.label_index,'image/webp'::text
  from private.comun_relata_authorized_context(p_protocol,p_receipt_secret) context
  join private.comun_relata_attachments a on a.report_id=context.report_id
  where context.case_state<>'withdrawn' and a.id=p_attachment_id and a.state='sealed_private';
$$;

create or replace function public.comun_relata_associate_collective(
  p_protocol text,p_receipt_secret text,p_requested_decision text,p_spatial_keys bytea[],p_window_start timestamptz
)
returns table (grouping_state text,confidence_level text,active_members_count integer)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare
  v_context record; v_decision text; v_confidence text; v_score numeric(4,3);
  v_target uuid; v_previous uuid; v_membership uuid; v_now timestamptz:=now();
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.case_state='withdrawn' then return; end if;
  if p_requested_decision not in ('auto_link_high_confidence','candidate_medium_confidence','new_collective_case','never_auto_link','human_review_future')
    or p_window_start is null or p_window_start > v_now or p_window_start < v_now-interval '90 days'
    or coalesce(array_length(p_spatial_keys,1),0)>30
    or exists(select 1 from unnest(coalesce(p_spatial_keys,array[]::bytea[])) key where octet_length(key)<>32) then
    raise exception using errcode='22023',message='COMUN_RELATA_MATCH_INVALID';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_context.case_id::text,4803));
  v_decision:=p_requested_decision;
  if v_context.category in ('electrical_hazard','active_fire') or v_context.urgency='emergency'
    or v_context.privacy_class in ('sensitive','high_risk') then v_decision:='never_auto_link'; end if;
  if v_decision='never_auto_link' then p_spatial_keys:=array[]::bytea[]; end if;
  if v_decision='auto_link_high_confidence' and coalesce(array_length(p_spatial_keys,1),0)=0 then
    v_decision:='new_collective_case';
  end if;
  v_confidence:=case v_decision when 'auto_link_high_confidence' then 'high'
    when 'candidate_medium_confidence' then 'medium' when 'never_auto_link' then 'blocked' else 'low' end;
  v_score:=case v_confidence when 'high' then .950 when 'medium' then .600 when 'blocked' then 0 else .250 end;

  if v_decision='auto_link_high_confidence' then
    select match_key.collective_case_id into v_target
    from private.comun_relata_case_match_keys match_key
    join public.comun_relata_collective_cases collective on collective.id=match_key.collective_case_id
    where match_key.active and match_key.created_at>=p_window_start and match_key.key_hash=any(p_spatial_keys)
      and collective.category=v_context.category and collective.state='active'
    order by collective.active_members_count desc,collective.created_at asc limit 1;
  end if;
  if v_target is null then
    insert into public.comun_relata_collective_cases (
      category,collective_urgency,state,match_rule,match_rule_version,active_members_count,
      first_report_at,last_report_at,confidence_level,future_map_eligibility,review_state
    ) values (
      v_context.category,v_context.urgency,'active',v_decision,'relata-match-v1',0,
      v_now,v_now,v_confidence,false,
      case when v_decision in ('candidate_medium_confidence','human_review_future') then 'future_review_required' else 'not_requested' end
    ) returning id into v_target;
    if v_decision='auto_link_high_confidence' then v_decision:='new_collective_case';v_confidence:='low';v_score:=.250; end if;
  end if;
  select collective_case_id into v_previous from public.comun_relata_case_memberships
    where individual_case_id=v_context.case_id and active for update;
  if found and v_previous<>v_target then
    update public.comun_relata_case_memberships set active=false,ended_at=v_now,end_reason='RELATA_MATCH_RECALCULATED'
      where individual_case_id=v_context.case_id and active;
    update private.comun_relata_case_match_keys set active=false,ended_at=v_now
      where individual_case_id=v_context.case_id and active;
    update public.comun_relata_collective_cases collective set active_members_count=greatest(collective.active_members_count-1,0),updated_at=v_now
      where collective.id=v_previous;
    update public.comun_relata_collective_cases collective set state='inactive'
      where collective.id=v_previous and collective.active_members_count=0;
  elsif found and v_previous=v_target then
    return query select v_decision,v_confidence,(select c.active_members_count from public.comun_relata_collective_cases c where c.id=v_target);
    return;
  end if;
  insert into public.comun_relata_case_memberships (
    collective_case_id,individual_case_id,membership_role,association_method,confidence,match_rule_version
  ) values (v_target,v_context.case_id,case when exists(select 1 from public.comun_relata_case_memberships where collective_case_id=v_target) then 'report' else 'seed' end,
    v_decision,v_score,'relata-match-v1') returning id into v_membership;
  update public.comun_relata_collective_cases collective set active_members_count=collective.active_members_count+1,
    last_report_at=v_now,collective_urgency=case
      when v_context.urgency='emergency' then 'emergency' when v_context.urgency='urgent' and collective.collective_urgency not in ('emergency') then 'urgent'
      when v_context.urgency='attention' and collective.collective_urgency='routine' then 'attention' else collective.collective_urgency end,
    state='active',updated_at=v_now where collective.id=v_target;
  insert into private.comun_relata_case_match_keys (individual_case_id,collective_case_id,key_hash,match_rule_version)
    select v_context.case_id,v_target,key,'relata-match-v1' from unnest(coalesce(p_spatial_keys,array[]::bytea[])) key;
  insert into public.comun_relata_case_match_events (
    individual_case_id,previous_collective_case_id,collective_case_id,decision,confidence_level,match_rule_version,result_code
  ) values (v_context.case_id,v_previous,v_target,v_decision,v_confidence,'relata-match-v1','RELATA_COLLECTIVE_ASSOCIATION_RECORDED');
  if not exists(select 1 from public.comun_relata_evidence_consents where case_id=v_context.case_id and consent_kind='collective_grouping' and active) then
    insert into public.comun_relata_evidence_consents (case_id,consent_kind,consent_version,active,result_code)
      values (v_context.case_id,'collective_grouping','relata-collective-grouping-v1',true,'RELATA_COLLECTIVE_GROUPING_ALLOWED');
  end if;
  return query select v_decision,v_confidence,(select c.active_members_count from public.comun_relata_collective_cases c where c.id=v_target);
end;
$$;

create or replace function public.comun_relata_get_evidence_state(
  p_protocol text,p_receipt_secret text
)
returns table (evidence jsonb)
language sql stable security definer set search_path='pg_catalog'
as $$
  select jsonb_build_object(
    'location',case when location.id is null then 'not_added' else location.evidence_state end,
    'locationApproximation',coalesce(location.approximation_level,'none'),
    'photos',coalesce((select jsonb_agg(jsonb_build_object(
      'label','Foto '||attachment.label_index,'state',attachment.state,'mimeType',attachment.actual_mime_type,
      'width',attachment.width,'height',attachment.height,'reviewRequiredForPublication',true
      ,'accessUrl','/api/comun/relata/evidence/attachments/'||attachment.id::text
    ) order by attachment.label_index) from private.comun_relata_attachments attachment where attachment.report_id=context.report_id),'[]'::jsonb),
    'grouping',coalesce(membership.association_method,'case_individual'),
    'groupingConfidence',coalesce(collective.confidence_level,'low'),
    'activeReportsInCollective',coalesce(collective.active_members_count,0),
    'noOfficialSend',true,'nothingPublished',true
  )
  from private.comun_relata_authorized_context(p_protocol,p_receipt_secret) context
  left join private.comun_relata_private_locations location on location.report_id=context.report_id
  left join public.comun_relata_case_memberships membership on membership.individual_case_id=context.case_id and membership.active
  left join public.comun_relata_collective_cases collective on collective.id=membership.collective_case_id;
$$;

create or replace function public.comun_relata_withdraw(
  p_protocol text,p_receipt_secret text
)
returns table (protocol text,state text,category text,urgency text,rule_version text,created_at timestamptz,withdrawn_at timestamptz,timeline jsonb)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_case public.comun_relata_cases%rowtype; v_report private.comun_relata_reports%rowtype; v_collective uuid;
begin
  if p_protocol !~ '^COMUN-RELATA-[A-F0-9]{16}$' or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$' then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_protocol,4801));
  select * into v_case from public.comun_relata_cases where public.comun_relata_cases.protocol=p_protocol;
  if not found then return; end if;
  select * into v_report from private.comun_relata_reports report where report.id=v_case.report_id
    and report.receipt_hash=extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256');
  if not found then return; end if;
  if v_case.state<>'withdrawn' then
    select collective_case_id into v_collective from public.comun_relata_case_memberships
      where individual_case_id=v_case.id and active for update;
    update public.comun_relata_cases set state='withdrawn',withdrawn_at=now(),updated_at=now()
      where id=v_case.id returning * into v_case;
    update private.comun_relata_reports set withdrawn_at=v_case.withdrawn_at,retention_class='withdrawn',
      review_after=v_case.withdrawn_at+interval '30 days' where id=v_report.id;
    update private.comun_relata_private_locations set evidence_state='withdrawn',withdrawn_at=v_case.withdrawn_at
      where report_id=v_report.id and evidence_state<>'withdrawn';
    update private.comun_relata_attachments attachment set state='withdrawn',withdrawn_at=v_case.withdrawn_at,
      retention_class='withdrawn_evidence',review_after=least(attachment.review_after,v_case.withdrawn_at+interval '30 days'),updated_at=now()
      where attachment.report_id=v_report.id and attachment.state not in ('withdrawn','rejected');
    update public.comun_relata_case_memberships set active=false,ended_at=v_case.withdrawn_at,end_reason='RELATA_REPORT_WITHDRAWN'
      where individual_case_id=v_case.id and active;
    update private.comun_relata_case_match_keys set active=false,ended_at=v_case.withdrawn_at
      where individual_case_id=v_case.id and active;
    if v_collective is not null then
      update public.comun_relata_collective_cases set active_members_count=greatest(active_members_count-1,0),updated_at=now()
        where id=v_collective;
      update public.comun_relata_collective_cases set state='inactive' where id=v_collective and active_members_count=0;
      insert into public.comun_relata_case_match_events (
        individual_case_id,previous_collective_case_id,collective_case_id,decision,confidence_level,match_rule_version,result_code
      ) values (v_case.id,v_collective,v_collective,'withdrawn_unlinked','blocked','relata-match-v1','RELATA_WITHDRAWAL_UNLINKED');
    end if;
    insert into public.comun_relata_status_events(case_id,state,actor,result_code)
      values(v_case.id,'withdrawn','person','RELATA_WITHDRAWN_BY_HOLDER');
  end if;
  return query select receipt.* from public.comun_relata_get_receipt(p_protocol,p_receipt_secret) receipt;
end;
$$;

alter table private.comun_relata_attachments enable row level security;
alter table private.comun_relata_attachments force row level security;
alter table public.comun_relata_evidence_consents enable row level security;
alter table public.comun_relata_evidence_consents force row level security;
alter table public.comun_relata_collective_cases enable row level security;
alter table public.comun_relata_collective_cases force row level security;
alter table public.comun_relata_case_memberships enable row level security;
alter table public.comun_relata_case_memberships force row level security;
alter table private.comun_relata_case_match_keys enable row level security;
alter table private.comun_relata_case_match_keys force row level security;
alter table public.comun_relata_case_match_events enable row level security;
alter table public.comun_relata_case_match_events force row level security;

revoke all on table private.comun_relata_attachments from public,anon,authenticated;
revoke all on table private.comun_relata_case_match_keys from public,anon,authenticated;
revoke all on table public.comun_relata_evidence_consents from public,anon,authenticated;
revoke all on table public.comun_relata_collective_cases from public,anon,authenticated;
revoke all on table public.comun_relata_case_memberships from public,anon,authenticated;
revoke all on table public.comun_relata_case_match_events from public,anon,authenticated;
revoke all on sequence public.comun_relata_evidence_consents_id_seq from public,anon,authenticated;
revoke all on sequence public.comun_relata_case_match_events_id_seq from public,anon,authenticated;
revoke all on sequence private.comun_relata_case_match_keys_id_seq from public,anon,authenticated;

revoke all on function private.comun_relata_reject_append_only_mutation() from public;
revoke all on function private.comun_relata_guard_attachment() from public;
revoke all on function private.comun_relata_authorized_context(text,text) from public;
revoke all on function public.comun_relata_add_location(text,text,text,text,timestamptz,bytea,bytea,bytea,text,text,text,text) from public;
revoke all on function public.comun_relata_begin_attachment(text,text,uuid,text,text) from public;
revoke all on function public.comun_relata_withdraw_location(text,text) from public;
revoke all on function public.comun_relata_mark_attachment_validating(text,text,uuid) from public;
revoke all on function public.comun_relata_finalize_attachment(text,text,uuid,text,bigint,bigint,integer,integer,bytea,bytea) from public;
revoke all on function public.comun_relata_reject_attachment(text,text,uuid,text) from public;
revoke all on function public.comun_relata_withdraw_attachment(text,text,uuid) from public;
revoke all on function public.comun_relata_authorize_attachment_read(text,text,uuid) from public;
revoke all on function public.comun_relata_associate_collective(text,text,text,bytea[],timestamptz) from public;
revoke all on function public.comun_relata_get_evidence_state(text,text) from public;
revoke all on function public.comun_relata_withdraw(text,text) from public;

grant execute on function public.comun_relata_add_location(text,text,text,text,timestamptz,bytea,bytea,bytea,text,text,text,text) to service_role;
grant execute on function public.comun_relata_begin_attachment(text,text,uuid,text,text) to service_role;
grant execute on function public.comun_relata_withdraw_location(text,text) to service_role;
grant execute on function public.comun_relata_mark_attachment_validating(text,text,uuid) to service_role;
grant execute on function public.comun_relata_finalize_attachment(text,text,uuid,text,bigint,bigint,integer,integer,bytea,bytea) to service_role;
grant execute on function public.comun_relata_reject_attachment(text,text,uuid,text) to service_role;
grant execute on function public.comun_relata_withdraw_attachment(text,text,uuid) to service_role;
grant execute on function public.comun_relata_authorize_attachment_read(text,text,uuid) to service_role;
grant execute on function public.comun_relata_associate_collective(text,text,text,bytea[],timestamptz) to service_role;
grant execute on function public.comun_relata_get_evidence_state(text,text) to service_role;
grant execute on function public.comun_relata_withdraw(text,text) to service_role;

comment on table private.comun_relata_attachments is '48.0C local-only: originais e derivadas permanecem privados e exigem recibo.';
comment on table public.comun_relata_collective_cases is 'Camada operacional aditiva; sem texto privado, coordenada ou projeção pública.';
comment on table private.comun_relata_case_match_keys is 'HMACs espaciais não reversíveis; chave ausente do banco.';
comment on table public.comun_relata_case_match_events is 'Histórico append-only de associação, correção e retirada.';
