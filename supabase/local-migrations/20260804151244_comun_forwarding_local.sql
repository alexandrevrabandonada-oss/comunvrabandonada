-- COMUN 48.0H. Encaminhamento institucional compartilhado, local-only.
-- Nenhuma função abre canal externo ou cria protocolo oficial.

create table private.comun_forwarding_channels (
  id text primary key,
  name text not null,
  channel_type text not null check (channel_type in ('web','whatsapp','phone','email','ouvidoria','emergency')),
  operator_name text not null,
  sphere text not null check (sphere in ('municipal','state','federal','private')),
  territory text not null,
  official_url text,
  registration_required boolean not null default false,
  protocol_behavior text not null default 'unknown',
  tracking_behavior text not null default 'unknown',
  availability text not null default 'unknown',
  state text not null default 'candidate' check (state in ('candidate','source_verified','operational_check_pending','operationally_confirmed','degraded','unavailable','retired')),
  source_version text not null,
  reviewed_at date not null,
  automation_allowed boolean not null default false check (automation_allowed = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.comun_forwarding_adapters (
  id text primary key,
  channel_id text not null references private.comun_forwarding_channels(id) on delete restrict,
  name text not null,
  relata_category text not null,
  institutional_subcategory text not null,
  requirements jsonb not null default '[]'::jsonb,
  fields jsonb not null default '[]'::jsonb,
  allowed_attachments jsonb not null default '[]'::jsonb,
  source_stated_duration integer,
  source_stated_unit text,
  service_expectation text,
  version text not null,
  state text not null default 'active' check (state in ('draft','active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(requirements) = 'array' and jsonb_typeof(fields) = 'array' and jsonb_typeof(allowed_attachments) = 'array')
);

create table private.comun_forwarding_packages (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  relata_case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  adapter_id text not null references private.comun_forwarding_adapters(id) on delete restrict,
  state text not null default 'draft' check (state in ('draft','missing_information','ready_for_review','ready_for_assisted_opening','opened_by_person','person_declared_sent','official_protocol_pending','official_protocol_recorded','awaiting_response','response_recorded','resolved','deadline_expired','escalation_available','withdrawn')),
  original_report_ref uuid not null references private.comun_relata_reports(id) on delete restrict,
  comun_protocol_masked text not null,
  structured_summary jsonb not null default '{}'::jsonb,
  institutional_text text not null,
  adapter_version text not null,
  consent_version text not null default 'forwarding-consent-v1',
  source_domain text not null default 'relata' check (source_domain = 'relata'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (wallet_id, relata_case_id, adapter_id)
);

create table private.comun_forwarding_requirements (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  requirement_key text not null,
  label text not null,
  required boolean not null default true,
  sensitive boolean not null default false,
  satisfied boolean not null default false,
  value_sanitized text,
  updated_at timestamptz not null default now(),
  unique (package_id, requirement_key),
  check (value_sanitized is null or char_length(value_sanitized) <= 600)
);

create table private.comun_forwarding_private_contacts (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  field_key text not null check (field_key in ('name','phone','email')),
  value_private text not null check (char_length(value_private) between 1 and 240),
  consent_version text not null,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (package_id, field_key)
);

create table private.comun_forwarding_consents (
  id bigint generated always as identity primary key,
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  consent_kind text not null check (consent_kind in ('private_contact','institutional_text','assisted_opening','declared_submission','official_protocol')),
  consent_version text not null,
  active boolean not null,
  occurred_at timestamptz not null default now(),
  allows_public_projection boolean not null default false,
  allows_automatic_submission boolean not null default false,
  check (allows_public_projection = false and allows_automatic_submission = false)
);

create table private.comun_forwarding_attempts (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  state text not null check (state in ('opened_by_person','person_declared_sent','not_sent','failed')),
  result_code text not null check (result_code ~ '^FORWARDING_[A-Z0-9_]{3,80}$'),
  failure_code text,
  opened_at timestamptz,
  declared_at timestamptz,
  created_at timestamptz not null default now()
);

create table private.comun_forwarding_official_protocols (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  protocol_value text not null check (char_length(protocol_value) between 1 and 240 and protocol_value !~ '[<>]'),
  status text not null default 'official_declared_by_person' check (status in ('official_declared_by_person','official_verified_future')),
  declared_at timestamptz not null default now(),
  source text not null default 'person',
  unique (package_id)
);

create table private.comun_forwarding_official_status_events (
  id bigint generated always as identity primary key,
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  state text not null,
  public_note text not null check (char_length(public_note) between 1 and 600),
  occurred_at timestamptz not null default now(),
  result_code text not null check (result_code ~ '^FORWARDING_[A-Z0-9_]{3,80}$')
);

create table private.comun_forwarding_deadlines (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null unique references private.comun_forwarding_packages(id) on delete restrict,
  source_stated_duration integer,
  source_stated_unit text,
  calculated_due_at timestamptz,
  legal_deadline boolean not null default false,
  service_expectation text,
  rule_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_stated_duration is null or source_stated_duration > 0),
  check (legal_deadline = false)
);

create table private.comun_forwarding_escalation_paths (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null unique references private.comun_forwarding_packages(id) on delete restrict,
  next_channel_id text not null references private.comun_forwarding_channels(id) on delete restrict,
  required_preconditions jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  check (active = false)
);

create table private.comun_forwarding_channel_verifications (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null references private.comun_forwarding_channels(id) on delete restrict,
  state text not null check (state in ('source_verified_operational_form_observed','operationally_confirmed')),
  checklist jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null,
  result_code text not null check (result_code ~ '^FORWARDING_[A-Z0-9_]{3,80}$'),
  check (state <> 'operationally_confirmed')
);

create table private.comun_forwarding_events (
  id bigint generated always as identity primary key,
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  event_type text not null,
  result_code text not null check (result_code ~ '^FORWARDING_[A-Z0-9_]{3,80}$'),
  created_at timestamptz not null default now()
);

insert into private.comun_forwarding_channels (id,name,channel_type,operator_name,sphere,territory,official_url,registration_required,protocol_behavior,tracking_behavior,availability,state,source_version,reviewed_at)
values ('vr-fiscaliza-web','Fiscaliza VR','web','Prefeitura Municipal de Volta Redonda','municipal','Volta Redonda','https://www.voltaredonda.rj.gov.br/fiscalizavr',false,'service_protocol_expected','tracking_described_by_source','source_verified','source_verified','relata-channel-catalog-v1','2026-08-04')
on conflict (id) do update set name=excluded.name, official_url=excluded.official_url, reviewed_at=excluded.reviewed_at, state=excluded.state, updated_at=now();

insert into private.comun_forwarding_adapters (id,channel_id,name,relata_category,institutional_subcategory,requirements,fields,allowed_attachments,source_stated_duration,source_stated_unit,service_expectation,version)
values (
  'vr-fiscaliza-lighting-v1','vr-fiscaliza-web','Fiscaliza VR — manutenção de iluminação pública','public_lighting','iluminacao_e_energia',
  '[{"key":"location_reference","label":"Endereço ou ponto de referência","sensitive":false},{"key":"contact","label":"Uma forma de contato","sensitive":true},{"key":"institutional_text_confirmation","label":"Confirmação da mensagem","sensitive":false}]'::jsonb,
  '[{"key":"location_reference","label":"Endereço ou ponto de referência","input":"text"},{"key":"contact","label":"Telefone ou e-mail","input":"contact"},{"key":"institutional_text_confirmation","label":"Confirmar texto","input":"boolean"}]'::jsonb,
  '["image/jpeg","image/png","image/webp"]'::jsonb,
  48,'hours','A fonte municipal informa resposta inicial em até 48 horas; não é prazo legal.','fiscaliza-vr-lighting-v1'
)
on conflict (id) do update set requirements=excluded.requirements, fields=excluded.fields, allowed_attachments=excluded.allowed_attachments, source_stated_duration=excluded.source_stated_duration, source_stated_unit=excluded.source_stated_unit, service_expectation=excluded.service_expectation, version=excluded.version, updated_at=now();

create or replace function public.comun_forwarding_wallet_id(p_token_hash_hex text)
returns uuid language sql stable security definer set search_path = 'pg_catalog'
as $$ select id from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active' and p_token_hash_hex ~ '^[0-9a-f]{64}$' limit 1 $$;

drop function if exists public.comun_forwarding_package_create(text,text,text);
create or replace function public.comun_forwarding_package_create(p_token_hash_hex text,p_relata_case_id text,p_adapter_id text)
returns table(package_id uuid,relata_case_id uuid,state text,adapter_id text,missing_requirements jsonb,institutional_text text,channel_url text)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_case public.comun_relata_cases%rowtype; v_report private.comun_relata_reports%rowtype; v_adapter private.comun_forwarding_adapters%rowtype; v_channel private.comun_forwarding_channels%rowtype; v_package uuid; v_text text; v_missing jsonb; v_case_ref text; v_wallet_case_ref text;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_relata_case_id !~ '^[0-9a-f-]{36}$' then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null then return; end if;
  select * into v_adapter from private.comun_forwarding_adapters a where a.id=p_adapter_id and a.state='active';
  if not found then return; end if;
  select * into v_channel from private.comun_forwarding_channels c where c.id=v_adapter.channel_id and c.state='source_verified' and c.automation_allowed=false;
  if not found then return; end if;
  v_case_ref:=p_relata_case_id;
  select wi.subject_ref into v_wallet_case_ref from private.comun_participation_wallet_items wi where wi.id=p_relata_case_id::uuid and wi.wallet_id=v_wallet and wi.item_type='relata_report' and wi.archived_at is null;
  if found then v_case_ref:=v_wallet_case_ref; end if;
  select * into v_case from public.comun_relata_cases c where c.id=v_case_ref::uuid and c.category=v_adapter.relata_category and c.state <> 'withdrawn';
  if not found then return; end if;
  if not exists (select 1 from private.comun_participation_wallet_items where wallet_id=v_wallet and item_type='relata_report' and subject_ref=v_case.id::text and archived_at is null) then return; end if;
  select * into v_report from private.comun_relata_reports where id=v_case.report_id and withdrawn_at is null;
  if not found then return; end if;
  v_text := 'Solicitação de manutenção de iluminação pública' || E'\n\nLocal: [informado pela pessoa]' || E'\n\nPonto de referência: [informado pela pessoa]' || E'\n\nProblema: Iluminação pública' || E'\n\nDescrição: ' || v_report.original_text || E'\n\nData do registro: ' || to_char(v_case.created_at at time zone 'UTC','YYYY-MM-DD') || E'\n\nProtocolo COMUN: ' || v_case.protocol || E'\n\nSolicito o protocolo de atendimento e informação sobre o andamento.';
  v_missing := '[{"key":"location_reference","label":"Endereço ou ponto de referência"},{"key":"contact","label":"Uma forma de contato"},{"key":"institutional_text_confirmation","label":"Confirmação da mensagem"}]'::jsonb;
  insert into private.comun_forwarding_packages(wallet_id,relata_case_id,adapter_id,state,original_report_ref,comun_protocol_masked,structured_summary,institutional_text,adapter_version)
  values(v_wallet,v_case.id,v_adapter.id,'missing_information',v_report.id,left(v_case.protocol,12)||'••••',jsonb_build_object('category',v_case.category,'urgency',v_case.urgency,'hasLocation',exists(select 1 from private.comun_relata_private_locations l where l.report_id=v_report.id),'hasEvidence',exists(select 1 from private.comun_relata_attachments a where a.report_id=v_report.id and a.state='sealed_private')),v_text,v_adapter.version)
  on conflict on constraint comun_forwarding_packages_wallet_id_relata_case_id_adapter__key do update set updated_at=now(), withdrawn_at=null returning id into v_package;
  insert into private.comun_forwarding_requirements(package_id,requirement_key,label,required,sensitive) values(v_package,'location_reference','Endereço ou ponto de referência',true,false), (v_package,'contact','Uma forma de contato',true,true), (v_package,'institutional_text_confirmation','Confirmação da mensagem',true,false) on conflict on constraint comun_forwarding_requirements_package_id_requirement_key_key do nothing;
  insert into private.comun_forwarding_deadlines(package_id,source_stated_duration,source_stated_unit,service_expectation,rule_version) values(v_package,v_adapter.source_stated_duration,v_adapter.source_stated_unit,v_adapter.service_expectation,'fiscaliza-vr-lighting-v1') on conflict on constraint comun_forwarding_deadlines_package_id_key do nothing;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(v_package,'package_created','FORWARDING_PACKAGE_CREATED');
  return query select v_package,v_case.id,'missing_information',v_adapter.id,v_missing,v_text,v_channel.official_url;
end; $$;

drop function if exists public.comun_forwarding_package_list(text);
create or replace function public.comun_forwarding_package_list(p_token_hash_hex text)
returns table(package_id uuid,wallet_item_id uuid,relata_case_id uuid,adapter_id text,state text,comun_protocol_masked text,institutional_text text,requirements jsonb,deadline jsonb,official_protocol_masked text,channel_url text,updated_at timestamptz)
language sql stable security definer set search_path = 'pg_catalog'
as $$
select p.id,wi.id,p.relata_case_id,p.adapter_id,p.state,p.comun_protocol_masked,p.institutional_text,
  coalesce((select jsonb_agg(jsonb_build_object('key',r.requirement_key,'label',r.label,'required',r.required,'sensitive',r.sensitive,'satisfied',r.satisfied,'value',case when r.sensitive then null else r.value_sanitized end) order by r.requirement_key) from private.comun_forwarding_requirements r where r.package_id=p.id),'[]'::jsonb),
  coalesce((select jsonb_build_object('sourceStatedDuration',d.source_stated_duration,'sourceStatedUnit',d.source_stated_unit,'calculatedDueAt',d.calculated_due_at,'legalDeadline',d.legal_deadline,'serviceExpectation',d.service_expectation) from private.comun_forwarding_deadlines d where d.package_id=p.id),'{}'::jsonb),
  case when op.protocol_value is null then null else left(op.protocol_value,3)||'••••' end,c.official_url,p.updated_at
from private.comun_forwarding_packages p join private.comun_forwarding_channels c on c.id=(select a.channel_id from private.comun_forwarding_adapters a where a.id=p.adapter_id) left join private.comun_forwarding_official_protocols op on op.package_id=p.id left join private.comun_participation_wallet_items wi on wi.wallet_id=p.wallet_id and wi.item_type='relata_report' and wi.subject_ref=p.relata_case_id::text and wi.archived_at is null
where p.wallet_id=public.comun_forwarding_wallet_id(p_token_hash_hex) and p.withdrawn_at is null order by p.updated_at desc $$;

create or replace function public.comun_forwarding_requirements_update(p_token_hash_hex text,p_package_id uuid,p_location_reference text,p_contact text,p_confirm_text boolean)
returns table(package_id uuid,state text,missing_requirements jsonb)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_count integer; v_state text; v_contact text; v_location text;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  if char_length(coalesce(p_location_reference,'')) > 240 or char_length(coalesce(p_contact,'')) > 240 then return; end if;
  if p_location_reference is not null then update private.comun_forwarding_requirements r set value_sanitized=trim(p_location_reference),satisfied=(char_length(trim(p_location_reference))>1),updated_at=now() where r.package_id=p_package_id and r.requirement_key='location_reference' and exists(select 1 from private.comun_forwarding_packages p where p.id=p_package_id and p.wallet_id=v_wallet); end if;
  if p_contact is not null and char_length(trim(p_contact))>1 then insert into private.comun_forwarding_private_contacts(package_id,field_key,value_private,consent_version) values(p_package_id,case when position('@' in trim(p_contact)) > 1 then 'email' else 'phone' end,trim(p_contact),'forwarding-consent-v1') on conflict on constraint comun_forwarding_private_contacts_package_id_field_key_key do update set value_private=excluded.value_private,consent_version=excluded.consent_version; update private.comun_forwarding_requirements r set satisfied=true,updated_at=now() where r.package_id=p_package_id and r.requirement_key='contact'; end if;
  update private.comun_forwarding_requirements r set satisfied=coalesce(p_confirm_text,false),updated_at=now() where r.package_id=p_package_id and r.requirement_key='institutional_text_confirmation';
  select count(*) into v_count from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.required and not r.satisfied;
  v_state:=case when v_count=0 then 'ready_for_review' else 'missing_information' end;
  update private.comun_forwarding_packages p set state=v_state,updated_at=now() where p.id=p_package_id and p.wallet_id=v_wallet;
  insert into private.comun_forwarding_consents(package_id,consent_kind,consent_version,active) values(p_package_id,'private_contact','forwarding-consent-v1',true) on conflict do nothing;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'requirements_updated','FORWARDING_REQUIREMENTS_UPDATED');
  return query select p_package_id,v_state,(select coalesce(jsonb_agg(jsonb_build_object('key',r.requirement_key,'label',r.label)),'[]'::jsonb) from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.required and not r.satisfied);
end; $$;

create or replace function public.comun_forwarding_review(p_token_hash_hex text,p_package_id uuid,p_institutional_text text)
returns table(package_id uuid,state text,institutional_text text)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_missing integer; v_text text;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null or char_length(trim(coalesce(p_institutional_text,''))) not between 20 and 3000 then return; end if;
  select count(*) into v_missing from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.required and not r.satisfied;
  if v_missing>0 or not exists(select 1 from private.comun_forwarding_packages p where p.id=p_package_id and p.wallet_id=v_wallet and p.state in ('ready_for_review','draft','missing_information')) then return; end if;
  v_text:=trim(p_institutional_text); update private.comun_forwarding_packages p set institutional_text=v_text,state='ready_for_assisted_opening',updated_at=now() where p.id=p_package_id and p.wallet_id=v_wallet;
  insert into private.comun_forwarding_consents(package_id,consent_kind,consent_version,active) values(p_package_id,'institutional_text','forwarding-consent-v1',true);
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'reviewed','FORWARDING_REVIEWED');
  return query select p_package_id,'ready_for_assisted_opening',v_text;
end; $$;

create or replace function public.comun_forwarding_opened(p_token_hash_hex text,p_package_id uuid)
returns table(package_id uuid,state text,channel_url text)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_url text;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  select c.official_url into v_url from private.comun_forwarding_packages p join private.comun_forwarding_adapters a on a.id=p.adapter_id join private.comun_forwarding_channels c on c.id=a.channel_id where p.id=p_package_id and p.wallet_id=v_wallet and p.state='ready_for_assisted_opening' and c.state='source_verified' and c.automation_allowed=false;
  if v_url is null then return; end if;
  update private.comun_forwarding_packages set state='opened_by_person',updated_at=now() where id=p_package_id and wallet_id=v_wallet;
  insert into private.comun_forwarding_attempts(package_id,state,result_code,opened_at) values(p_package_id,'opened_by_person','FORWARDING_OPENED_BY_PERSON',now());
  insert into private.comun_forwarding_consents(package_id,consent_kind,consent_version,active) values(p_package_id,'assisted_opening','forwarding-consent-v1',true);
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'opened_by_person','FORWARDING_OPENED_BY_PERSON');
  return query select p_package_id,'opened_by_person',v_url;
end; $$;

create or replace function public.comun_forwarding_declare_sent(p_token_hash_hex text,p_package_id uuid,p_result text)
returns table(package_id uuid,state text)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_state text; v_code text;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null or p_result not in ('sent','not_sent','site_failed','could_not_login','service_missing','other_data','abandoned') then return; end if;
  v_state:=case when p_result='sent' then 'person_declared_sent' else 'opened_by_person' end; v_code:='FORWARDING_'||upper(regexp_replace(p_result,'[^a-zA-Z0-9]+','_','g'));
  update private.comun_forwarding_packages p set state=v_state,updated_at=now() where p.id=p_package_id and p.wallet_id=v_wallet and p.state='opened_by_person';
  if not found then return; end if;
  insert into private.comun_forwarding_attempts(package_id,state,result_code,failure_code,declared_at) values(p_package_id,case when p_result='sent' then 'person_declared_sent' else 'failed' end,v_code,case when p_result='sent' then null else v_code end,now());
  insert into private.comun_forwarding_consents(package_id,consent_kind,consent_version,active) values(p_package_id,'declared_submission','forwarding-consent-v1',p_result='sent');
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'declared_sent',v_code);
  return query select p_package_id,v_state;
end; $$;

create or replace function public.comun_forwarding_record_official_protocol(p_token_hash_hex text,p_package_id uuid,p_protocol text)
returns table(package_id uuid,state text,protocol_masked text)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_protocol text; v_mask text;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); v_protocol:=trim(coalesce(p_protocol,'')); if v_wallet is null or char_length(v_protocol) not between 1 and 240 or v_protocol ~ '[<>]' then return; end if;
  if not exists(select 1 from private.comun_forwarding_packages p where p.id=p_package_id and p.wallet_id=v_wallet and p.state in ('person_declared_sent','official_protocol_pending','opened_by_person','official_protocol_recorded')) then return; end if;
  insert into private.comun_forwarding_official_protocols(package_id,protocol_value) values(p_package_id,v_protocol) on conflict on constraint comun_forwarding_official_protocols_package_id_key do nothing;
  if not found then
    select left(op.protocol_value,3)||'••••' into v_mask from private.comun_forwarding_official_protocols op where op.package_id=p_package_id;
    return query select p_package_id,'official_protocol_recorded',v_mask;
    return;
  end if;
  update private.comun_forwarding_packages set state='official_protocol_recorded',updated_at=now() where id=p_package_id and wallet_id=v_wallet;
  insert into private.comun_forwarding_consents(package_id,consent_kind,consent_version,active) values(p_package_id,'official_protocol','forwarding-consent-v1',true);
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'official_protocol_recorded','FORWARDING_OFFICIAL_PROTOCOL_DECLARED_BY_PERSON');
  return query select p_package_id,'official_protocol_recorded',left(v_protocol,3)||'••••';
end; $$;

create or replace function public.comun_forwarding_record_response(p_token_hash_hex text,p_package_id uuid,p_note text,p_state text default 'response_recorded')
returns table(package_id uuid,state text)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null or p_state not in ('response_recorded','resolved','awaiting_response') or char_length(trim(coalesce(p_note,''))) not between 1 and 600 then return; end if;
  if not exists(select 1 from private.comun_forwarding_packages p where p.id=p_package_id and p.wallet_id=v_wallet and p.state not in ('withdrawn','draft')) then return; end if;
  update private.comun_forwarding_packages set state=p_state,updated_at=now() where id=p_package_id and wallet_id=v_wallet;
  insert into private.comun_forwarding_official_status_events(package_id,state,public_note,result_code) values(p_package_id,p_state,trim(p_note),'FORWARDING_RESPONSE_RECORDED');
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'response_recorded','FORWARDING_RESPONSE_RECORDED');
  return query select p_package_id,p_state;
end; $$;

create or replace function public.comun_forwarding_withdraw(p_token_hash_hex text,p_package_id uuid)
returns boolean language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null then return false; end if;
  update private.comun_forwarding_packages set state='withdrawn',withdrawn_at=now(),updated_at=now() where id=p_package_id and wallet_id=v_wallet and withdrawn_at is null;
  if not found then return false; end if;
  update private.comun_forwarding_private_contacts c set withdrawn_at=now() where c.package_id=p_package_id and c.withdrawn_at is null;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'withdrawn','FORWARDING_PACKAGE_WITHDRAWN'); return true;
end; $$;

alter table private.comun_forwarding_channels enable row level security;
alter table private.comun_forwarding_channels force row level security;
alter table private.comun_forwarding_adapters enable row level security;
alter table private.comun_forwarding_adapters force row level security;
alter table private.comun_forwarding_packages enable row level security;
alter table private.comun_forwarding_packages force row level security;
alter table private.comun_forwarding_requirements enable row level security;
alter table private.comun_forwarding_requirements force row level security;
alter table private.comun_forwarding_private_contacts enable row level security;
alter table private.comun_forwarding_private_contacts force row level security;
alter table private.comun_forwarding_consents enable row level security;
alter table private.comun_forwarding_consents force row level security;
alter table private.comun_forwarding_attempts enable row level security;
alter table private.comun_forwarding_attempts force row level security;
alter table private.comun_forwarding_official_protocols enable row level security;
alter table private.comun_forwarding_official_protocols force row level security;
alter table private.comun_forwarding_official_status_events enable row level security;
alter table private.comun_forwarding_official_status_events force row level security;
alter table private.comun_forwarding_deadlines enable row level security;
alter table private.comun_forwarding_deadlines force row level security;
alter table private.comun_forwarding_escalation_paths enable row level security;
alter table private.comun_forwarding_escalation_paths force row level security;
alter table private.comun_forwarding_channel_verifications enable row level security;
alter table private.comun_forwarding_channel_verifications force row level security;
alter table private.comun_forwarding_events enable row level security;
alter table private.comun_forwarding_events force row level security;

do $$ declare t text; begin for t in select unnest(array['comun_forwarding_channels','comun_forwarding_adapters','comun_forwarding_packages','comun_forwarding_requirements','comun_forwarding_private_contacts','comun_forwarding_consents','comun_forwarding_attempts','comun_forwarding_official_protocols','comun_forwarding_official_status_events','comun_forwarding_deadlines','comun_forwarding_escalation_paths','comun_forwarding_channel_verifications','comun_forwarding_events']) loop execute format('revoke all on table private.%I from public, anon, authenticated',t); end loop; end $$;

revoke all on table private.comun_forwarding_channels from public, anon, authenticated;
revoke all on table private.comun_forwarding_adapters from public, anon, authenticated;
revoke all on table private.comun_forwarding_packages from public, anon, authenticated;
revoke all on table private.comun_forwarding_requirements from public, anon, authenticated;
revoke all on table private.comun_forwarding_private_contacts from public, anon, authenticated;
revoke all on table private.comun_forwarding_consents from public, anon, authenticated;
revoke all on table private.comun_forwarding_attempts from public, anon, authenticated;
revoke all on table private.comun_forwarding_official_protocols from public, anon, authenticated;
revoke all on table private.comun_forwarding_official_status_events from public, anon, authenticated;
revoke all on table private.comun_forwarding_deadlines from public, anon, authenticated;
revoke all on table private.comun_forwarding_escalation_paths from public, anon, authenticated;
revoke all on table private.comun_forwarding_channel_verifications from public, anon, authenticated;
revoke all on table private.comun_forwarding_events from public, anon, authenticated;

revoke all on function public.comun_forwarding_wallet_id(text) from public,anon,authenticated;
revoke all on function public.comun_forwarding_package_create(text,text,text) from public,anon,authenticated;
revoke all on function public.comun_forwarding_package_list(text) from public,anon,authenticated;
revoke all on function public.comun_forwarding_requirements_update(text,uuid,text,text,boolean) from public,anon,authenticated;
revoke all on function public.comun_forwarding_review(text,uuid,text) from public,anon,authenticated;
revoke all on function public.comun_forwarding_opened(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_forwarding_declare_sent(text,uuid,text) from public,anon,authenticated;
revoke all on function public.comun_forwarding_record_official_protocol(text,uuid,text) from public,anon,authenticated;
revoke all on function public.comun_forwarding_record_response(text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.comun_forwarding_withdraw(text,uuid) from public,anon,authenticated;
grant execute on function public.comun_forwarding_wallet_id(text) to service_role;
grant execute on function public.comun_forwarding_package_create(text,text,text) to service_role;
grant execute on function public.comun_forwarding_package_list(text) to service_role;
grant execute on function public.comun_forwarding_requirements_update(text,uuid,text,text,boolean) to service_role;
grant execute on function public.comun_forwarding_review(text,uuid,text) to service_role;
grant execute on function public.comun_forwarding_opened(text,uuid) to service_role;
grant execute on function public.comun_forwarding_declare_sent(text,uuid,text) to service_role;
grant execute on function public.comun_forwarding_record_official_protocol(text,uuid,text) to service_role;
grant execute on function public.comun_forwarding_record_response(text,uuid,text,text) to service_role;
grant execute on function public.comun_forwarding_withdraw(text,uuid) to service_role;
