begin;

-- COMUN 48.1B-R2A. Production bundle aligned to the canonical runtime.
-- This migration is additive, private-by-default and intentionally does not
-- create publication, forwarding or STMU capabilities.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- Fail closed: this bundle is exclusive. A pre-existing canonical object means
-- the remote baseline is not the one this migration was audited against.
do $$
declare n text;
begin
  foreach n in array array[
    'comun_relata_reports','comun_relata_private_locations','comun_relata_attachments',
    'comun_participation_wallets','comun_participation_wallet_items',
    'comun_participation_wallet_events','comun_participation_wallet_recovery_credentials',
    'comun_participation_wallet_rate_limits','comun_participation_wallet_account_links',
    'comun_relata_cases','comun_relata_consents','comun_relata_status_events',
    'comun_relata_evidence_consents'
  ] loop
    if to_regclass('private.'||n) is not null or to_regclass('public.'||n) is not null then
      raise exception using errcode='P0001', message='COMUN_48_1B_R2A_BLOCKED_REMOTE_PRE_OBJECT_CONFLICT:'||n;
    end if;
  end loop;
end $$;

create table private.comun_relata_reports (
  id uuid primary key default gen_random_uuid(),
  original_text text not null,
  triage_answers jsonb not null default '{}'::jsonb,
  receipt_hash bytea not null unique,
  actor_hash bytea not null,
  idempotency_hash bytea not null unique,
  payload_hash bytea not null,
  privacy_class text not null check (privacy_class in ('public_safe','public_after_sanitization','restricted','sensitive','high_risk')),
  retention_class text not null default 'private_unsubmitted' check (retention_class in ('private_unsubmitted','withdrawn','future_forwarded','sensitive','audit_evidence')),
  routing_rule_version text not null default 'relata-routing-v1',
  routing_decision jsonb not null default '{}'::jsonb,
  urgency text not null default 'routine' check (urgency in ('routine','attention','urgent','emergency')),
  consent_version text not null default 'relata-consent-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  review_after timestamptz not null default (now()+interval '90 days'),
  check (char_length(original_text) between 8 and 600),
  check (jsonb_typeof(triage_answers)='object'),
  check (jsonb_typeof(routing_decision)='object'),
  check (octet_length(receipt_hash)=32 and octet_length(actor_hash)=32 and octet_length(idempotency_hash)=32 and octet_length(payload_hash)=32)
);

create table public.comun_relata_cases (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references private.comun_relata_reports(id) on delete restrict,
  protocol text not null unique check (protocol ~ '^COMUN-RELATA-[A-F0-9]{16}$'),
  protocol_kind text not null default 'comun' check (protocol_kind='comun'),
  is_official boolean not null default false check (is_official=false),
  official_protocol text check (official_protocol is null),
  category text not null check (category in ('public_lighting','power_distribution','electrical_hazard','active_fire','smoke_or_environmental_trace','sidewalk_accessibility','waste_or_debris','public_transport','public_health','public_education','workplace','environmental_pollution','other')),
  urgency text not null check (urgency in ('routine','attention','urgent','emergency')),
  routing_rule_version text not null,
  routing_decision jsonb not null check (jsonb_typeof(routing_decision)='object'),
  state text not null default 'stored_private' check (state in ('draft','triage','awaiting_person','routed','stored_private','captured_private','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table public.comun_relata_consents (
  id uuid primary key default gen_random_uuid(), case_id uuid not null unique references public.comun_relata_cases(id) on delete restrict,
  consent_version text not null, accepted_at timestamptz not null default now(),
  allows_public_projection boolean not null default false check (not allows_public_projection),
  allows_official_forwarding boolean not null default false check (not allows_official_forwarding)
);
create table public.comun_relata_status_events (
  id bigint generated always as identity primary key, case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  state text not null, actor text not null, result_code text not null, occurred_at timestamptz not null default now()
);
create table public.comun_relata_evidence_consents (
  id bigint generated always as identity primary key, case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  consent_kind text not null check (consent_kind in ('private_location','private_attachment','collective_grouping')),
  consent_version text not null, active boolean not null, result_code text not null, occurred_at timestamptz not null default now(),
  allows_public_projection boolean not null default false check (not allows_public_projection), allows_official_forwarding boolean not null default false check (not allows_official_forwarding)
);

create table private.comun_relata_private_locations (
  id uuid primary key default gen_random_uuid(), report_id uuid not null unique references private.comun_relata_reports(id) on delete restrict,
  precision text not null, encrypted_value bytea not null, origin text not null, accuracy_class text not null,
  captured_at timestamptz not null, contract_version text not null default 'relata-private-location-v1', nonce bytea not null,
  auth_tag bytea not null, key_version text not null, evidence_state text not null default 'added_private',
  approximate_region text, approximation_level text, derivation_method text, geographic_risk text not null default 'unreviewed',
  review_required boolean not null default true, created_at timestamptz not null default now(), withdrawn_at timestamptz,
  check (origin in ('device','map_pin')), check (accuracy_class in ('not_provided','under_25m','25_to_100m','over_100m')),
  check (octet_length(encrypted_value) between 16 and 512 and octet_length(nonce)=12 and octet_length(auth_tag)=16),
  check (key_version ~ '^relata-location-key-v[0-9]{1,3}$'), check (review_required)
);
create table private.comun_relata_attachments (
  id uuid primary key, report_id uuid not null references private.comun_relata_reports(id) on delete restrict,
  label_index smallint not null check (label_index between 1 and 3), object_key text not null unique,
  derivative_object_key text not null unique, declared_mime_type text not null check (declared_mime_type in ('image/jpeg','image/png','image/webp')),
  declared_size_bucket text not null check (declared_size_bucket in ('under_1mb','1_to_4mb','4_to_8mb')),
  actual_mime_type text, actual_size_bytes bigint, derivative_size_bytes bigint, width integer, height integer,
  checksum_sha256 bytea, derivative_checksum_sha256 bytea, state text not null default 'quarantine' check (state in ('quarantine','validating','sealed_private','rejected','orphaned','withdrawn')),
  rejection_code text, review_required_for_publication boolean not null default true, retention_class text not null default 'private_evidence',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), sealed_at timestamptz, withdrawn_at timestamptz,
  unique(report_id,label_index), check (object_key='quarantine/'||id::text||'.bin' and derivative_object_key='sealed/'||id::text||'.webp'), check (review_required_for_publication)
);

create table private.comun_participation_wallets (
  id uuid primary key default gen_random_uuid(), token_hash bytea not null unique, status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(), rotated_at timestamptz, revoked_at timestamptz, check(octet_length(token_hash)=32)
);
create table private.comun_participation_wallet_items (
  id uuid primary key default gen_random_uuid(), wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  item_type text not null check (item_type in ('relata_report','legacy_report_follow','bus_observation','collective_case_follow','community_confirmation')),
  subject_ref text not null, subject_hash bytea not null, title_template text not null, category text,
  presentation_state text not null default 'Guardado', action_required text, protocol_masked text, source_domain text not null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, withdrawn_at timestamptz,
  unique(wallet_id,item_type,subject_hash), check(octet_length(subject_hash)=32)
);
create table private.comun_participation_wallet_events (
  id bigint generated always as identity primary key, wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  item_id uuid references private.comun_participation_wallet_items(id) on delete restrict, event_type text not null, result_code text not null, created_at timestamptz not null default now()
);
create table private.comun_participation_wallet_recovery_credentials (
  id uuid primary key default gen_random_uuid(), wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  recovery_hash bytea not null unique, active boolean not null default true, created_at timestamptz not null default now(), used_at timestamptz, revoked_at timestamptz, check(octet_length(recovery_hash)=32)
);
create table private.comun_participation_wallet_rate_limits (
  attempt_hash bytea primary key, attempts integer not null default 0 check(attempts between 0 and 20), locked_until timestamptz, updated_at timestamptz not null default now(), check(octet_length(attempt_hash)=32)
);
create table private.comun_participation_wallet_account_links (
  id uuid primary key default gen_random_uuid(), wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  user_id uuid not null, linked_at timestamptz not null default now(), link_method text not null check(link_method in ('explicit_account_link','recovery_claim')),
  revoked_at timestamptz, unique(wallet_id,user_id)
);

create index comun_wallet_items_order_idx on private.comun_participation_wallet_items(wallet_id,archived_at,updated_at desc);
create index comun_wallet_events_order_idx on private.comun_participation_wallet_events(wallet_id,created_at desc,id desc);
create index comun_relata_status_case_idx on public.comun_relata_status_events(case_id,occurred_at,id);
create index comun_relata_attachment_report_idx on private.comun_relata_attachments(report_id,state,created_at);

create or replace function private.comun_relata_authorized_context(p_protocol text,p_receipt_secret text)
returns table(report_id uuid,case_id uuid,case_state text,category text,urgency text,privacy_class text)
language sql stable security definer set search_path=pg_catalog,private,public as $$
 select r.id,c.id,c.state,c.category,c.urgency,r.privacy_class from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id
 where c.protocol=p_protocol and r.receipt_hash=extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256'); $$;

create or replace function public.comun_relata_create(p_idempotency_key text,p_receipt_secret text,p_original_text text,p_answers jsonb,p_category text,p_urgency text,p_rule_version text,p_decision jsonb,p_privacy_class text,p_consent_version text)
returns table(protocol text,state text,category text,urgency text,rule_version text,created_at timestamptz,idempotent boolean)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare ih bytea; rh bytea; ph bytea; rid uuid; cid uuid; proto text; existing private.comun_relata_reports%rowtype;
begin
 if p_idempotency_key !~ '^[A-Za-z0-9_-]{32,160}$' or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$' or char_length(trim(p_original_text)) not between 8 and 600 then raise exception using errcode='22023',message='COMUN_RELATA_INVALID_PROOF'; end if;
 ih:=extensions.digest('relata-idempotency-v1:'||p_idempotency_key,'sha256'); rh:=extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256'); ph:=extensions.digest(convert_to(jsonb_build_object('text',trim(p_original_text),'answers',coalesce(p_answers,'{}'::jsonb),'category',p_category,'urgency',p_urgency,'decision',coalesce(p_decision,'{}'::jsonb))::text,'utf8'),'sha256');
 select * into existing from private.comun_relata_reports where idempotency_hash=ih;
 if found then return query select c.protocol,c.state,c.category,c.urgency,c.routing_rule_version,c.created_at,true from public.comun_relata_cases c where c.report_id=existing.id; return; end if;
 insert into private.comun_relata_reports(original_text,triage_answers,receipt_hash,actor_hash,idempotency_hash,payload_hash,privacy_class,routing_rule_version,routing_decision,urgency,consent_version) values(trim(p_original_text),coalesce(p_answers,'{}'::jsonb),rh,extensions.digest('relata-actor-v1:'||p_receipt_secret,'sha256'),ih,ph,p_privacy_class,p_rule_version,coalesce(p_decision,'{}'::jsonb),p_urgency,p_consent_version) returning id into rid;
 loop proto:='COMUN-RELATA-'||upper(encode(gen_random_bytes(8),'hex')); exit when not exists(select 1 from public.comun_relata_cases where protocol=proto); end loop;
 insert into public.comun_relata_cases(report_id,protocol,category,urgency,routing_rule_version,routing_decision,state) values(rid,proto,p_category,p_urgency,p_rule_version,coalesce(p_decision,'{}'::jsonb),'stored_private') returning id into cid;
 insert into public.comun_relata_consents(case_id,consent_version) values(cid,p_consent_version);
 insert into public.comun_relata_status_events(case_id,state,actor,result_code) values(cid,'stored_private','system_local','RELATA_STORED_PRIVATE');
 return query select proto,'stored_private',p_category,p_urgency,p_rule_version,now(),false;
end; $$;

create or replace function public.comun_relata_get_receipt(p_protocol text,p_receipt_secret text)
returns table(protocol text,state text,category text,urgency text,rule_version text,created_at timestamptz,withdrawn_at timestamptz,timeline jsonb)
language sql stable security definer set search_path=pg_catalog,private,public as $$
 select c.protocol,c.state,c.category,c.urgency,c.routing_rule_version,c.created_at,c.withdrawn_at,coalesce((select jsonb_agg(jsonb_build_object('state',e.state,'occurredAt',e.occurred_at,'resultCode',e.result_code) order by e.occurred_at,e.id) from public.comun_relata_status_events e where e.case_id=c.id),'[]'::jsonb) from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id where c.protocol=p_protocol and r.receipt_hash=extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256'); $$;

create or replace function public.comun_relata_withdraw(p_protocol text,p_receipt_secret text)
returns table(protocol text,state text,category text,urgency text,rule_version text,created_at timestamptz,withdrawn_at timestamptz,timeline jsonb)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare c public.comun_relata_cases%rowtype; r private.comun_relata_reports%rowtype;
begin select * into c from public.comun_relata_cases where protocol=p_protocol; select * into r from private.comun_relata_reports where id=c.report_id and receipt_hash=extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256'); if not found then return; end if; if c.state<>'withdrawn' then update public.comun_relata_cases set state='withdrawn',withdrawn_at=now(),updated_at=now() where id=c.id returning * into c; update private.comun_relata_reports set withdrawn_at=c.withdrawn_at,retention_class='withdrawn',updated_at=now() where id=r.id; insert into public.comun_relata_status_events(case_id,state,actor,result_code) values(c.id,'withdrawn','person','RELATA_WITHDRAWN_BY_HOLDER'); end if; return query select * from public.comun_relata_get_receipt(p_protocol,p_receipt_secret); end; $$;

create or replace function public.comun_participation_wallet_create(p_token_hash_hex text,p_recovery_hash_hex text)
returns table(wallet_id uuid) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare w uuid; begin if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_recovery_hash_hex !~ '^[0-9a-f]{64}$' then return; end if; insert into private.comun_participation_wallets(token_hash) values(decode(p_token_hash_hex,'hex')) on conflict(token_hash) do update set rotated_at=private.comun_participation_wallets.rotated_at returning id into w; insert into private.comun_participation_wallet_recovery_credentials(wallet_id,recovery_hash) values(w,decode(p_recovery_hash_hex,'hex')) on conflict(recovery_hash) do nothing; return query select w; end; $$;
create or replace function public.comun_participation_wallet_list(p_token_hash_hex text)
returns table(item_id uuid,item_type text,title_template text,category text,presentation_state text,action_required text,protocol_masked text,source_domain text,metadata jsonb,created_at timestamptz,updated_at timestamptz)
language sql stable security definer set search_path=pg_catalog,private,public as $$ select i.id,i.item_type,i.title_template,i.category,i.presentation_state,i.action_required,i.protocol_masked,i.source_domain,i.metadata,i.created_at,i.updated_at from private.comun_participation_wallets w join private.comun_participation_wallet_items i on i.wallet_id=w.id where w.token_hash=decode(p_token_hash_hex,'hex') and w.status='active' and i.archived_at is null order by (i.action_required is not null) desc,i.updated_at desc; $$;
create or replace function public.comun_participation_wallet_attach_relata(p_token_hash_hex text,p_protocol text,p_receipt_secret text)
returns table(item_id uuid,recovery_needed boolean) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare w uuid;c public.comun_relata_cases%rowtype;r private.comun_relata_reports%rowtype;i uuid; begin select id into w from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; select * into c from public.comun_relata_cases where protocol=p_protocol; select * into r from private.comun_relata_reports where id=c.report_id and receipt_hash=extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256'); if w is null or c.id is null or r.id is null then return; end if; insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,category,presentation_state,action_required,protocol_masked,source_domain) values(w,'relata_report',c.id::text,extensions.digest('wallet-subject-v1:'||p_protocol,'sha256'),'Relato COMUN',c.category,'Guardado','Precisa de informação',left(p_protocol,12)||'••••','relata') on conflict(wallet_id,item_type,subject_hash) do update set archived_at=null,updated_at=now() returning id into i; insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values(w,i,'item_added','WALLET_RELATA_ATTACHED'); return query select i,false; end; $$;

create or replace function public.comun_participation_wallet_follow_legacy(p_token_hash_hex text,p_protocol text) returns table(item_id uuid) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare w uuid;i uuid; begin select id into w from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; if w is null then return; end if; insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,presentation_state,protocol_masked,source_domain) values(w,'legacy_report_follow',p_protocol,extensions.digest('wallet-subject-v1:'||p_protocol,'sha256'),'Protocolo acompanhado','Acompanhando',left(p_protocol,12)||'••••','legacy') on conflict(wallet_id,item_type,subject_hash) do update set archived_at=null,updated_at=now() returning id into i; return query select i; end; $$;
create or replace function public.comun_participation_wallet_follow_case(p_token_hash_hex text,p_public_case_id text,p_category text default null) returns table(item_id uuid) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare w uuid;i uuid; begin select id into w from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; if w is null then return; end if; insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,category,presentation_state,source_domain) values(w,'collective_case_follow',p_public_case_id,extensions.digest('wallet-subject-v1:'||p_public_case_id,'sha256'),'Caso coletivo acompanhado',p_category,'Acompanhando','collective_case') on conflict(wallet_id,item_type,subject_hash) do update set archived_at=null,updated_at=now() returning id into i; return query select i; end; $$;
create or replace function public.comun_participation_wallet_claim_bus(p_token_hash_hex text,p_observation_id text,p_metadata jsonb default '{}'::jsonb) returns table(item_id uuid) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare w uuid;i uuid; begin select id into w from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; if w is null then return; end if; insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,category,presentation_state,source_domain,metadata) values(w,'bus_observation',p_observation_id,extensions.digest('wallet-subject-v1:'||p_observation_id,'sha256'),'Observação de ônibus','public_transport','Observação registrada','onibus',coalesce(p_metadata,'{}'::jsonb)) on conflict(wallet_id,item_type,subject_hash) do update set archived_at=null,updated_at=now(),metadata=excluded.metadata returning id into i; return query select i; end; $$;
create or replace function public.comun_participation_wallet_remove_item(p_token_hash_hex text,p_item_id uuid) returns boolean language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare w uuid; begin select id into w from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; if w is null then return false; end if; update private.comun_participation_wallet_items set archived_at=now(),updated_at=now() where id=p_item_id and wallet_id=w and archived_at is null; return found; end; $$;
create or replace function public.comun_participation_wallet_redeem(p_recovery_code_hash_hex text,p_new_token_hash_hex text) returns table(wallet_id uuid,recovery_ok boolean) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare c private.comun_participation_wallet_recovery_credentials%rowtype; begin select * into c from private.comun_participation_wallet_recovery_credentials where recovery_hash=decode(p_recovery_code_hash_hex,'hex') and active=true and revoked_at is null and used_at is null; if not found then return query select null::uuid,false; return; end if; update private.comun_participation_wallets set token_hash=decode(p_new_token_hash_hex,'hex'),rotated_at=now() where id=c.wallet_id; update private.comun_participation_wallet_recovery_credentials set active=false,used_at=now() where id=c.id; return query select c.wallet_id,true; end; $$;
create or replace function public.comun_participation_wallet_rotate_recovery(p_token_hash_hex text,p_new_recovery_hash_hex text,p_new_token_hash_hex text) returns table(wallet_id uuid,rotated boolean) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare w uuid; begin select id into w from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; if w is null then return; end if; update private.comun_participation_wallets set token_hash=decode(p_new_token_hash_hex,'hex'),rotated_at=now() where id=w; update private.comun_participation_wallet_recovery_credentials set active=false,revoked_at=now() where wallet_id=w and active=true; insert into private.comun_participation_wallet_recovery_credentials(wallet_id,recovery_hash) values(w,decode(p_new_recovery_hash_hex,'hex')); return query select w,true; end; $$;
create or replace function public.comun_participation_wallet_link_account(p_token_hash_hex text,p_user_id uuid,p_link_method text)
returns table(wallet_id uuid,linked boolean) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare w uuid; begin if p_link_method not in ('explicit_account_link','recovery_claim') then return; end if; select id into w from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; if w is null then return; end if; insert into private.comun_participation_wallet_account_links(wallet_id,user_id,link_method) values(w,p_user_id,p_link_method) on conflict(wallet_id,user_id) do update set revoked_at=null,link_method=excluded.link_method; insert into private.comun_participation_wallet_events(wallet_id,event_type,result_code) values(w,'item_updated','WALLET_ACCOUNT_LINKED'); return query select w,true; end; $$;

create or replace function public.comun_relata_add_location(p_protocol text,p_receipt_secret text,p_origin text,p_accuracy_class text,p_captured_at timestamptz,p_ciphertext bytea,p_nonce bytea,p_auth_tag bytea,p_key_version text,p_approximate_region text,p_approximation_level text,p_geographic_risk text)
returns table(location_state text,grouping_allowed boolean) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare x record; begin select * into x from private.comun_relata_authorized_context(p_protocol,p_receipt_secret); if not found then return; end if; insert into private.comun_relata_private_locations(report_id,precision,encrypted_value,origin,accuracy_class,captured_at,nonce,auth_tag,key_version,approximate_region,approximation_level,geographic_risk) values(x.report_id,p_origin,p_ciphertext,p_origin,p_accuracy_class,p_captured_at,p_nonce,p_auth_tag,p_key_version,left(p_approximate_region,80),p_approximation_level,p_geographic_risk) on conflict(report_id) do update set encrypted_value=excluded.encrypted_value,nonce=excluded.nonce,auth_tag=excluded.auth_tag,withdrawn_at=null; return query select 'added_private'::text,true; end; $$;
create or replace function public.comun_relata_withdraw_location(p_protocol text,p_receipt_secret text) returns boolean language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare x record; begin select * into x from private.comun_relata_authorized_context(p_protocol,p_receipt_secret); if not found then return false; end if; update private.comun_relata_private_locations set evidence_state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now()) where report_id=x.report_id; return found; end; $$;
create or replace function public.comun_relata_begin_attachment(p_protocol text,p_receipt_secret text,p_attachment_id uuid,p_declared_mime_type text,p_declared_size_bucket text) returns table(attachment_id uuid,label_index smallint,attachment_state text) language plpgsql security definer set search_path=pg_catalog,private,public as $$ declare x record;n smallint; begin select * into x from private.comun_relata_authorized_context(p_protocol,p_receipt_secret); if not found or p_declared_mime_type not in ('image/jpeg','image/png','image/webp') then return; end if; select coalesce(max(label_index),0)+1 into n from private.comun_relata_attachments where report_id=x.report_id; if n>3 then raise exception using errcode='23514',message='COMUN_RELATA_ATTACHMENT_LIMIT'; end if; insert into private.comun_relata_attachments(id,report_id,label_index,object_key,derivative_object_key,declared_mime_type,declared_size_bucket) values(p_attachment_id,x.report_id,n,'quarantine/'||p_attachment_id||'.bin','sealed/'||p_attachment_id||'.webp',p_declared_mime_type,p_declared_size_bucket) on conflict(id) do nothing; return query select p_attachment_id,n,'quarantine'::text; end; $$;
create or replace function public.comun_relata_mark_attachment_validating(p_protocol text,p_receipt_secret text,p_attachment_id uuid) returns table(attachment_id uuid,attachment_state text,declared_mime_type text) language plpgsql security definer set search_path=pg_catalog,private,public as $$ begin update private.comun_relata_attachments a set state='validating',updated_at=now() where a.id=p_attachment_id and a.report_id=(select report_id from private.comun_relata_authorized_context(p_protocol,p_receipt_secret)) and a.state='quarantine' returning a.id,a.state,a.declared_mime_type into attachment_id,attachment_state,declared_mime_type; return next; end; $$;
create or replace function public.comun_relata_finalize_attachment(p_protocol text,p_receipt_secret text,p_attachment_id uuid,p_actual_mime_type text,p_actual_size_bytes bigint,p_derivative_size_bytes bigint,p_width integer,p_height integer,p_checksum_sha256 bytea,p_derivative_checksum_sha256 bytea) returns table(attachment_id uuid,attachment_state text) language plpgsql security definer set search_path=pg_catalog,private,public as $$ begin update private.comun_relata_attachments a set state='sealed_private',actual_mime_type=p_actual_mime_type,actual_size_bytes=p_actual_size_bytes,derivative_size_bytes=p_derivative_size_bytes,width=p_width,height=p_height,checksum_sha256=p_checksum_sha256,derivative_checksum_sha256=p_derivative_checksum_sha256,sealed_at=now(),updated_at=now() where a.id=p_attachment_id and a.report_id=(select report_id from private.comun_relata_authorized_context(p_protocol,p_receipt_secret)) and a.state='validating' returning a.id,a.state into attachment_id,attachment_state; return next; end; $$;
create or replace function public.comun_relata_authorize_attachment_read(p_protocol text,p_receipt_secret text,p_attachment_id uuid) returns table(attachment_id uuid,attachment_state text,object_key text,derivative_object_key text) language sql stable security definer set search_path=pg_catalog,private,public as $$ select a.id,a.state,a.object_key,a.derivative_object_key from private.comun_relata_attachments a where a.id=p_attachment_id and a.report_id=(select report_id from private.comun_relata_authorized_context(p_protocol,p_receipt_secret)) and a.state='sealed_private'; $$;
create or replace function public.comun_relata_withdraw_attachment(p_protocol text,p_receipt_secret text,p_attachment_id uuid) returns boolean language plpgsql security definer set search_path=pg_catalog,private,public as $$ begin update private.comun_relata_attachments a set state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now()),updated_at=now() where a.id=p_attachment_id and a.report_id=(select report_id from private.comun_relata_authorized_context(p_protocol,p_receipt_secret)); return found; end; $$;

-- Private Storage contract. Existing incompatible bucket state is a hard stop.
do $$ begin if exists(select 1 from storage.buckets where id='comun-relata-private' and (public or file_size_limit<>8388608)) then raise exception 'COMUN_48_1B_R2A_BLOCKED_PRIVATE_STORAGE'; end if; if not exists(select 1 from storage.buckets where id='comun-relata-private') then insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('comun-relata-private','comun-relata-private',false,8388608,array['image/jpeg','image/png','image/webp']); end if; end $$;

do $$ declare t text; begin foreach t in array array['comun_relata_reports','comun_relata_private_locations','comun_relata_attachments','comun_participation_wallets','comun_participation_wallet_items','comun_participation_wallet_events','comun_participation_wallet_recovery_credentials','comun_participation_wallet_rate_limits','comun_participation_wallet_account_links'] loop execute format('alter table private.%I enable row level security',t); execute format('alter table private.%I force row level security',t); execute format('revoke all on private.%I from public,anon,authenticated',t); execute format('grant all on private.%I to service_role',t); end loop; foreach t in array array['comun_relata_cases','comun_relata_consents','comun_relata_status_events','comun_relata_evidence_consents'] loop execute format('alter table public.%I enable row level security',t); execute format('alter table public.%I force row level security',t); execute format('revoke all on public.%I from public,anon,authenticated',t); execute format('grant all on public.%I to service_role',t); end loop; end $$;

-- Explicit privilege declarations are kept alongside the loop so static and
-- runtime auditors see the complete contract without expanding dynamic SQL.
alter table private.comun_relata_reports enable row level security;
alter table private.comun_relata_reports force row level security;
revoke all on table private.comun_relata_reports from public, anon, authenticated;
grant all on table private.comun_relata_reports to service_role;
alter table private.comun_relata_private_locations enable row level security;
alter table private.comun_relata_private_locations force row level security;
revoke all on table private.comun_relata_private_locations from public, anon, authenticated;
grant all on table private.comun_relata_private_locations to service_role;
alter table private.comun_relata_attachments enable row level security;
alter table private.comun_relata_attachments force row level security;
revoke all on table private.comun_relata_attachments from public, anon, authenticated;
grant all on table private.comun_relata_attachments to service_role;
alter table private.comun_participation_wallets enable row level security;
alter table private.comun_participation_wallets force row level security;
revoke all on table private.comun_participation_wallets from public, anon, authenticated;
grant all on table private.comun_participation_wallets to service_role;
alter table private.comun_participation_wallet_items enable row level security;
alter table private.comun_participation_wallet_items force row level security;
revoke all on table private.comun_participation_wallet_items from public, anon, authenticated;
grant all on table private.comun_participation_wallet_items to service_role;
alter table private.comun_participation_wallet_events enable row level security;
alter table private.comun_participation_wallet_events force row level security;
revoke all on table private.comun_participation_wallet_events from public, anon, authenticated;
grant all on table private.comun_participation_wallet_events to service_role;
alter table private.comun_participation_wallet_recovery_credentials enable row level security;
alter table private.comun_participation_wallet_recovery_credentials force row level security;
revoke all on table private.comun_participation_wallet_recovery_credentials from public, anon, authenticated;
grant all on table private.comun_participation_wallet_recovery_credentials to service_role;
alter table private.comun_participation_wallet_rate_limits enable row level security;
alter table private.comun_participation_wallet_rate_limits force row level security;
revoke all on table private.comun_participation_wallet_rate_limits from public, anon, authenticated;
grant all on table private.comun_participation_wallet_rate_limits to service_role;
alter table private.comun_participation_wallet_account_links enable row level security;
alter table private.comun_participation_wallet_account_links force row level security;
revoke all on table private.comun_participation_wallet_account_links from public, anon, authenticated;
grant all on table private.comun_participation_wallet_account_links to service_role;
alter table public.comun_relata_cases enable row level security;
alter table public.comun_relata_cases force row level security;
revoke all on table public.comun_relata_cases from public, anon, authenticated;
grant all on table public.comun_relata_cases to service_role;
alter table public.comun_relata_consents enable row level security;
alter table public.comun_relata_consents force row level security;
revoke all on table public.comun_relata_consents from public, anon, authenticated;
grant all on table public.comun_relata_consents to service_role;
alter table public.comun_relata_status_events enable row level security;
alter table public.comun_relata_status_events force row level security;
revoke all on table public.comun_relata_status_events from public, anon, authenticated;
grant all on table public.comun_relata_status_events to service_role;
alter table public.comun_relata_evidence_consents enable row level security;
alter table public.comun_relata_evidence_consents force row level security;
revoke all on table public.comun_relata_evidence_consents from public, anon, authenticated;
grant all on table public.comun_relata_evidence_consents to service_role;

revoke all on all sequences in schema private from public,anon,authenticated;
grant usage,select,update on all sequences in schema private to service_role;
revoke all on sequence public.comun_relata_status_events_id_seq,public.comun_relata_evidence_consents_id_seq from public,anon,authenticated;
grant usage,select,update on sequence public.comun_relata_status_events_id_seq,public.comun_relata_evidence_consents_id_seq to service_role;

do $$ declare s text[] := array[
 'public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text)','public.comun_relata_get_receipt(text,text)','public.comun_relata_withdraw(text,text)',
 'public.comun_relata_add_location(text,text,text,text,timestamptz,bytea,bytea,bytea,text,text,text,text)','public.comun_relata_withdraw_location(text,text)',
 'public.comun_relata_begin_attachment(text,text,uuid,text,text)','public.comun_relata_mark_attachment_validating(text,text,uuid)','public.comun_relata_finalize_attachment(text,text,uuid,text,bigint,bigint,integer,integer,bytea,bytea)','public.comun_relata_authorize_attachment_read(text,text,uuid)','public.comun_relata_withdraw_attachment(text,text,uuid)',
 'public.comun_participation_wallet_create(text,text)','public.comun_participation_wallet_list(text)','public.comun_participation_wallet_attach_relata(text,text,text)','public.comun_participation_wallet_follow_legacy(text,text)','public.comun_participation_wallet_follow_case(text,text,text)','public.comun_participation_wallet_claim_bus(text,text,jsonb)','public.comun_participation_wallet_remove_item(text,uuid)','public.comun_participation_wallet_redeem(text,text)','public.comun_participation_wallet_rotate_recovery(text,text,text)','public.comun_participation_wallet_link_account(text,uuid,text)']; f text; begin foreach f in array s loop execute 'revoke all on function '||f||' from public,anon,authenticated'; execute 'grant execute on function '||f||' to service_role'; end loop; end $$;

comment on schema private is 'COMUN 48.1B-R2A: runtime canonical private capabilities; no direct client CRUD.';
comment on table private.comun_participation_wallet_account_links is 'Explicit account-wallet link; never a silent claim.';
commit;
