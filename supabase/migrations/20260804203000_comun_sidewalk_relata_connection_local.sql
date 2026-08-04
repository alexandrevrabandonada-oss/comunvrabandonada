-- TIJOLO 48.0J. Ponte local-only entre Calçadas, Relata, Carteira e encaminhamento.
-- Forward-only; não promove migration, não publica coordenada e não envia a órgão.

alter table private.comun_forwarding_channel_observations
  drop constraint if exists comun_forwarding_channel_observations_state_check;
alter table private.comun_forwarding_channel_observations
  add constraint comun_forwarding_channel_observations_state_check check (state in (
    'source_verified','public_entry_reachable','authentication_boundary_observed',
    'service_category_observed','form_fields_observed','review_boundary_observed',
    'submission_boundary_observed','protocol_behavior_unconfirmed',
    'public_entry_observed_auth_boundary_pending','degraded_public_entry_auth_unconfirmed',
    'operationally_observed_no_submission','degraded','unavailable'
  ));
update private.comun_forwarding_channel_observations
  set state='public_entry_observed_auth_boundary_pending'
  where channel_id='vr-fiscaliza-web' and state='operationally_observed_no_submission';

alter table public.comun_relata_cases
  drop constraint if exists comun_relata_case_category;
alter table public.comun_relata_cases
  add constraint comun_relata_case_category check (
    category in ('public_lighting','power_distribution','electrical_hazard','active_fire',
      'smoke_or_environmental_trace','sidewalk_accessibility','waste_or_debris','public_transport','public_health','public_education','workplace','environmental_pollution','other')
  );

alter table private.comun_forwarding_packages
  drop constraint if exists comun_forwarding_packages_state_check;
alter table private.comun_forwarding_packages
  add constraint comun_forwarding_packages_state_check check (state in (
    'draft','missing_information','jurisdiction_required','ready_for_review',
    'forwarding_eligible','package_ready_channel_degraded','ready_for_assisted_opening',
    'opened_by_person','person_declared_sent','official_protocol_pending',
    'official_protocol_recorded','awaiting_response','response_recorded','resolved',
    'deadline_expired','escalation_available','withdrawn'
  ));

create table private.comun_sidewalk_relata_links (
  id uuid primary key default gen_random_uuid(),
  sidewalk_record_id uuid references public.comun_sidewalk_records(id) on delete restrict,
  relata_case_id uuid references public.comun_relata_cases(id) on delete restrict,
  wallet_id uuid references private.comun_participation_wallets(id) on delete restrict,
  direction text not null check (direction in ('sidewalk_to_relata','relata_to_sidewalk')),
  state text not null default 'relata_created' check (state in (
    'observation_only','relata_available','relata_created','candidate_review',
    'jurisdiction_required','forwarding_eligible','package_ready_channel_degraded',
    'withdrawn'
  )),
  jurisdiction_state text not null default 'unknown' check (jurisdiction_state in (
    'public_municipal_sidewalk','public_square_or_equipment','urban_center_or_interchange',
    'private_property_frontage','other_public_authority','unknown'
  )),
  jurisdiction_note_sanitized text,
  consent_version text not null default 'sidewalk-relata-v1',
  source_summary_sanitized text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  check (sidewalk_record_id is not null or relata_case_id is not null),
  unique (sidewalk_record_id, relata_case_id, direction)
);

create unique index comun_sidewalk_relata_one_active_case
  on private.comun_sidewalk_relata_links(relata_case_id)
  where relata_case_id is not null and direction = 'sidewalk_to_relata' and withdrawn_at is null;

create table private.comun_sidewalk_relata_events (
  id bigint generated always as identity primary key,
  link_id uuid not null references private.comun_sidewalk_relata_links(id) on delete restrict,
  event_type text not null check (event_type in (
    'link_created','consent_recorded','jurisdiction_requested','jurisdiction_recorded',
    'relata_created','candidate_review_created','forwarding_eligible',
    'package_prepared','withdrawn'
  )),
  result_code text not null check (result_code ~ '^SIDEWALK_RELATA_[A-Z0-9_]{3,80}$'),
  occurred_at timestamptz not null default now()
);

create table private.comun_sidewalk_relata_idempotency (
  idempotency_hash bytea primary key,
  link_id uuid not null references private.comun_sidewalk_relata_links(id) on delete restrict,
  payload_hash bytea not null,
  created_at timestamptz not null default now(),
  constraint comun_sidewalk_relata_idempotency_hash_len check (octet_length(idempotency_hash)=32),
  constraint comun_sidewalk_relata_payload_hash_len check (octet_length(payload_hash)=32)
);

create index comun_sidewalk_relata_links_wallet_idx
  on private.comun_sidewalk_relata_links(wallet_id, updated_at desc);
create index comun_sidewalk_relata_links_record_idx
  on private.comun_sidewalk_relata_links(sidewalk_record_id, updated_at desc);

alter table private.comun_sidewalk_relata_links enable row level security;
alter table private.comun_sidewalk_relata_links force row level security;
alter table private.comun_sidewalk_relata_events enable row level security;
alter table private.comun_sidewalk_relata_events force row level security;
alter table private.comun_sidewalk_relata_idempotency enable row level security;
alter table private.comun_sidewalk_relata_idempotency force row level security;
revoke all on table private.comun_sidewalk_relata_links from public, anon, authenticated;
revoke all on table private.comun_sidewalk_relata_events from public, anon, authenticated;
revoke all on table private.comun_sidewalk_relata_idempotency from public, anon, authenticated;
grant select, insert, update, delete on table private.comun_sidewalk_relata_links to service_role;
grant select, insert, update, delete on table private.comun_sidewalk_relata_events to service_role;
grant select, insert, update, delete on table private.comun_sidewalk_relata_idempotency to service_role;

create or replace function private.comun_sidewalk_relata_reject_event_mutation()
returns trigger language plpgsql security definer set search_path = 'pg_catalog' as $$
begin
  raise exception using errcode='42501', message='COMUN_SIDEWALK_RELATA_EVENT_APPEND_ONLY';
end; $$;
drop trigger if exists comun_sidewalk_relata_events_append_only on private.comun_sidewalk_relata_events;
create trigger comun_sidewalk_relata_events_append_only
before update or delete on private.comun_sidewalk_relata_events
for each row execute function private.comun_sidewalk_relata_reject_event_mutation();

create trigger comun_sidewalk_relata_links_updated_at
before update on private.comun_sidewalk_relata_links
for each row execute function public.set_updated_at();

insert into private.comun_forwarding_adapters
  (id,channel_id,name,relata_category,institutional_subcategory,requirements,fields,allowed_attachments,source_stated_duration,source_stated_unit,service_expectation,version)
values (
  'vr-smi-public-sidewalk-maintenance-v1','vr-fiscaliza-web',
  'Fiscaliza VR — manutenção de calçadas públicas', 'sidewalk_accessibility',
  'manutencao_de_calcadas',
  '[{"key":"full_name","label":"Nome completo","sensitive":true},{"key":"contact","label":"Contato","sensitive":true},{"key":"street","label":"Rua","sensitive":false},{"key":"number","label":"Número","sensitive":false},{"key":"reference","label":"Ponto de referência","sensitive":false},{"key":"structured_description","label":"Descrição estruturada","sensitive":false}]'::jsonb,
  '[{"key":"full_name","input":"text"},{"key":"contact","input":"contact"},{"key":"street","input":"text"},{"key":"number","input":"text"},{"key":"reference","input":"text"},{"key":"structured_description","input":"textarea"}]'::jsonb,
  '["image/jpeg","image/png","image/webp"]'::jsonb,
  30,'days','Inspeção estimada em até 7 dias; execução estimada em até 30 dias. São estimativas de serviço, não prazos legais.','carta-165-sidewalk-maintenance-v1'
)
on conflict (id) do update set requirements=excluded.requirements,fields=excluded.fields,allowed_attachments=excluded.allowed_attachments,source_stated_duration=excluded.source_stated_duration,source_stated_unit=excluded.source_stated_unit,service_expectation=excluded.service_expectation,version=excluded.version,updated_at=now();

create or replace function public.comun_sidewalk_relata_status(p_token_hash_hex text, p_link_id uuid)
returns table(link_id uuid, direction text, state text, jurisdiction_state text, relata_case_id uuid, sidewalk_record_id uuid)
language sql stable security definer set search_path = 'pg_catalog' as $$
  select l.id,l.direction,l.state,l.jurisdiction_state,l.relata_case_id,l.sidewalk_record_id
  from private.comun_sidewalk_relata_links l
  join private.comun_participation_wallets w on w.id=l.wallet_id
  where w.token_hash=decode(p_token_hash_hex,'hex') and w.status='active' and l.id=p_link_id and l.withdrawn_at is null;
$$;

create or replace function public.comun_sidewalk_relata_create(
  p_token_hash_hex text, p_record_id uuid, p_possession_proof_hex text,
  p_idempotency_key text, p_receipt_secret text, p_original_text text,
  p_urgency text default 'attention', p_consent_version text default 'sidewalk-relata-v1'
)
returns table(link_id uuid, case_id uuid, protocol text, state text, idempotent boolean)
language plpgsql security definer set search_path = 'pg_catalog' as $$
declare
  v_wallet uuid; v_record public.comun_sidewalk_records%rowtype; v_report private.comun_relata_reports%rowtype;
  v_case public.comun_relata_cases%rowtype; v_existing_case uuid; v_existing_state text; v_link uuid; v_idem bytea; v_payload bytea; v_protocol text;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_possession_proof_hex !~ '^[0-9a-f]{64}$'
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,160}$' or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$'
    or char_length(trim(p_original_text)) not between 8 and 600
    or p_urgency not in ('routine','attention','urgent','emergency')
    or p_consent_version <> 'sidewalk-relata-v1' then return; end if;
  if p_possession_proof_hex <> encode(extensions.digest('sidewalk-possession-v1:'||p_record_id::text||':'||p_token_hash_hex,'sha256'),'hex') then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null then return; end if;
  select * into v_record from public.comun_sidewalk_records where id=p_record_id and status <> 'withdrawn';
  if not found then return; end if;
  v_idem:=extensions.digest('sidewalk-relata-idempotency-v1:'||p_idempotency_key,'sha256');
  v_payload:=extensions.digest(convert_to(jsonb_build_object('record',p_record_id,'text',trim(p_original_text),'urgency',p_urgency)::text,'utf8'),'sha256');
  perform pg_advisory_xact_lock(hashtextextended(encode(v_idem,'hex'),4810));
  select i.link_id into v_link from private.comun_sidewalk_relata_idempotency i where i.idempotency_hash=v_idem and i.payload_hash=v_payload;
  if v_link is not null then
    select l.relata_case_id,c.protocol,c.state into v_existing_case,v_protocol,v_existing_state
    from private.comun_sidewalk_relata_links l join public.comun_relata_cases c on c.id=l.relata_case_id where l.id=v_link;
    return query select v_link,v_existing_case,v_protocol,v_existing_state,true; return;
  end if;
  insert into private.comun_relata_reports(original_text,triage_answers,receipt_hash,actor_hash,idempotency_hash,payload_hash,privacy_class,retention_class)
    values(trim(p_original_text),'{}'::jsonb,extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256'),extensions.digest('relata-actor-v1:'||p_receipt_secret,'sha256'),v_idem,v_payload,'public_after_sanitization','private_unsubmitted') returning * into v_report;
  loop v_protocol:='COMUN-RELATA-'||upper(encode(extensions.gen_random_bytes(8),'hex')); exit when not exists(select 1 from public.comun_relata_cases c where c.protocol=v_protocol); end loop;
  insert into public.comun_relata_cases(report_id,protocol,category,urgency,routing_rule_version,routing_decision,state)
    values(v_report.id,v_protocol,'sidewalk_accessibility',p_urgency,'relata-routing-v2',jsonb_build_object('category','sidewalk_accessibility','source','sidewalk_bridge','recordId',p_record_id::text),'stored_private') returning * into v_case;
  insert into public.comun_relata_consents(case_id,consent_version) values(v_case.id,p_consent_version);
  insert into public.comun_relata_status_events(case_id,state,actor,result_code) values(v_case.id,'draft','person','RELATA_DRAFT_ACCEPTED'),(v_case.id,'triage','system_local','RELATA_TRIAGE_RECORDED'),(v_case.id,'routed','system_local','RELATA_ROUTE_CLASSIFIED'),(v_case.id,'stored_private','system_local','RELATA_STORED_PRIVATE');
  insert into private.comun_sidewalk_relata_links(sidewalk_record_id,relata_case_id,wallet_id,direction,state,source_summary_sanitized) values(p_record_id,v_case.id,v_wallet,'sidewalk_to_relata','relata_created',null) returning id into v_link;
  insert into private.comun_sidewalk_relata_idempotency(idempotency_hash,link_id,payload_hash) values(v_idem,v_link,v_payload);
  insert into private.comun_sidewalk_relata_events(link_id,event_type,result_code) values(v_link,'link_created','SIDEWALK_RELATA_LINK_CREATED'),(v_link,'relata_created','SIDEWALK_RELATA_CREATED');
  insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,category,presentation_state,action_required,protocol_masked,source_domain,metadata)
    values(v_wallet,'relata_report',v_case.id::text,extensions.digest('wallet-subject-v1:'||v_case.protocol,'sha256'),'Relato de calçada','sidewalk_accessibility','Guardado','Complete a responsabilidade do trecho',left(v_case.protocol,12)||'••••','relata','{"relatedDomain":"sidewalks","grouped":true}'::jsonb)
    on conflict(wallet_id,item_type,subject_hash) do update set archived_at=null,updated_at=now();
  insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code)
    select v_wallet,id,'item_added','WALLET_SIDEWALK_RELATA_ATTACHED'
    from private.comun_participation_wallet_items where wallet_id=v_wallet and item_type='relata_report' and subject_ref=v_case.id::text and archived_at is null;
  return query select v_link,v_case.id,v_case.protocol,v_case.state,false;
end; $$;

create or replace function public.comun_sidewalk_relata_candidate(
  p_token_hash_hex text, p_case_id uuid, p_consent boolean
)
returns table(link_id uuid, state text)
language plpgsql security definer set search_path = 'pg_catalog' as $$
declare v_wallet uuid; v_link uuid;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or not p_consent then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null or not exists(select 1 from private.comun_participation_wallet_items where wallet_id=v_wallet and item_type='relata_report' and subject_ref=p_case_id::text and archived_at is null) then return; end if;
  if not exists(select 1 from public.comun_relata_cases where id=p_case_id and category='sidewalk_accessibility' and state <> 'withdrawn') then return; end if;
  insert into private.comun_sidewalk_relata_links(relata_case_id,wallet_id,direction,state,source_summary_sanitized) values(p_case_id,v_wallet,'relata_to_sidewalk','candidate_review',null)
    on conflict (sidewalk_record_id,relata_case_id,direction) do update set withdrawn_at=null,updated_at=now() returning id into v_link;
  insert into private.comun_sidewalk_relata_events(link_id,event_type,result_code) values(v_link,'candidate_review_created','SIDEWALK_RELATA_CANDIDATE_REVIEW');
  return query select v_link,'candidate_review';
end; $$;

create or replace function public.comun_sidewalk_jurisdiction_set(p_token_hash_hex text,p_link_id uuid,p_jurisdiction text,p_note text default null)
returns table(link_id uuid,state text,jurisdiction_state text)
language plpgsql security definer set search_path = 'pg_catalog' as $$
declare v_wallet uuid; v_state text;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_jurisdiction not in ('public_municipal_sidewalk','public_square_or_equipment','urban_center_or_interchange','private_property_frontage','other_public_authority','unknown') then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null or not exists(select 1 from private.comun_sidewalk_relata_links where id=p_link_id and wallet_id=v_wallet and withdrawn_at is null) then return; end if;
  v_state:=case when p_jurisdiction in ('public_municipal_sidewalk','public_square_or_equipment','urban_center_or_interchange','other_public_authority') then 'forwarding_eligible' else 'jurisdiction_required' end;
  update private.comun_sidewalk_relata_links set jurisdiction_state=p_jurisdiction,jurisdiction_note_sanitized=left(nullif(trim(p_note),''),240),state=v_state,updated_at=now() where id=p_link_id and wallet_id=v_wallet;
  insert into private.comun_sidewalk_relata_events(link_id,event_type,result_code) values(p_link_id,'jurisdiction_recorded','SIDEWALK_RELATA_JURISDICTION_RECORDED');
  return query select p_link_id,v_state,p_jurisdiction;
end; $$;

create or replace function public.comun_sidewalk_forwarding_prepare(p_token_hash_hex text,p_link_id uuid)
returns table(package_id uuid,state text,adapter_id text,missing_requirements jsonb,service_expectation text)
language plpgsql security definer set search_path = 'pg_catalog' as $$
declare v_wallet uuid; v_link private.comun_sidewalk_relata_links%rowtype; v_case public.comun_relata_cases%rowtype; v_report private.comun_relata_reports%rowtype; v_adapter private.comun_forwarding_adapters%rowtype; v_package uuid;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null then return; end if;
  select * into v_link from private.comun_sidewalk_relata_links where id=p_link_id and wallet_id=v_wallet and withdrawn_at is null;
  if not found or v_link.jurisdiction_state not in ('public_municipal_sidewalk','public_square_or_equipment','urban_center_or_interchange','other_public_authority') or v_link.relata_case_id is null then return; end if;
  select * into v_case from public.comun_relata_cases c where c.id=v_link.relata_case_id and c.state <> 'withdrawn';
  select * into v_report from private.comun_relata_reports where id=v_case.report_id and withdrawn_at is null;
  select * into v_adapter from private.comun_forwarding_adapters a where a.id='vr-smi-public-sidewalk-maintenance-v1' and a.state='active';
  if not found then return; end if;
  insert into private.comun_forwarding_packages(wallet_id,relata_case_id,adapter_id,state,original_report_ref,comun_protocol_masked,structured_summary,institutional_text,adapter_version)
    values(v_wallet,v_case.id,v_adapter.id,'package_ready_channel_degraded',v_report.id,left(v_case.protocol,12)||'••••',jsonb_build_object('category','sidewalk_accessibility','jurisdiction',v_link.jurisdiction_state,'hasPrivateEvidence',false),'Solicitação de manutenção de calçada pública'||E'\n\nProblema observado: '||v_report.original_text||E'\n\nLocal e contato serão informados pela pessoa no canal oficial.' ,v_adapter.version)
    on conflict on constraint comun_forwarding_packages_wallet_id_relata_case_id_adapter__key do update set state=excluded.state,updated_at=now(),withdrawn_at=null returning id into v_package;
  insert into private.comun_forwarding_requirements(package_id,requirement_key,label,required,sensitive)
    values(v_package,'full_name','Nome completo',true,true),(v_package,'contact','Contato',true,true),(v_package,'street','Rua',true,false),(v_package,'number','Número',true,false),(v_package,'reference','Ponto de referência',false,false),(v_package,'structured_description','Descrição estruturada',true,false)
    on conflict on constraint comun_forwarding_requirements_package_id_requirement_key_key do nothing;
  insert into private.comun_forwarding_deadlines(package_id,source_stated_duration,source_stated_unit,service_expectation,rule_version) values(v_package,30,'days','Inspeção estimada em até 7 dias; execução estimada em até 30 dias. Estimativas de serviço, não prazos legais.','carta-165-sidewalk-maintenance-v1') on conflict on constraint comun_forwarding_deadlines_package_id_key do update set service_expectation=excluded.service_expectation;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(v_package,'package_created','FORWARDING_SIDEWALK_PACKAGE_DEGRADED');
  update private.comun_sidewalk_relata_links set state='package_ready_channel_degraded',updated_at=now() where id=p_link_id and wallet_id=v_wallet;
  insert into private.comun_sidewalk_relata_events(link_id,event_type,result_code) values(p_link_id,'package_prepared','SIDEWALK_RELATA_PACKAGE_PREPARED');
  return query select v_package,'package_ready_channel_degraded',v_adapter.id,'[{"key":"full_name"},{"key":"contact"},{"key":"street"},{"key":"number"},{"key":"structured_description"}]'::jsonb,v_adapter.service_expectation;
end; $$;

revoke all on function public.comun_sidewalk_relata_status(text,uuid), public.comun_sidewalk_relata_create(text,uuid,text,text,text,text,text,text), public.comun_sidewalk_relata_candidate(text,uuid,boolean), public.comun_sidewalk_jurisdiction_set(text,uuid,text,text), public.comun_sidewalk_forwarding_prepare(text,uuid) from public, anon, authenticated;
grant execute on function public.comun_sidewalk_relata_status(text,uuid), public.comun_sidewalk_relata_create(text,uuid,text,text,text,text,text,text), public.comun_sidewalk_relata_candidate(text,uuid,boolean), public.comun_sidewalk_jurisdiction_set(text,uuid,text,text), public.comun_sidewalk_forwarding_prepare(text,uuid) to service_role;

comment on table private.comun_sidewalk_relata_links is '48.0J local-only relation ledger; Sidewalks remain canonical for observations, Relata for private reports.';
comment on table private.comun_sidewalk_relata_events is '48.0J append-only bridge events; no text, coordinate, photo or secret.';
