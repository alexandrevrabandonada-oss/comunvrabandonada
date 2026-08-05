-- COMUN 48.0L. Multichannel attempts for one Relata case, local-only.
-- No external delivery, mailbox access or protocol creation occurs here.

alter table private.comun_forwarding_attempts
  add column if not exists channel_id text references private.comun_forwarding_channels(id),
  add column if not exists adapter_version text not null default 'forwarding-attempt-v1',
  add column if not exists sequence_no integer,
  add column if not exists outcome text,
  add column if not exists automatic_ack_at timestamptz,
  add column if not exists human_first_response_at timestamptz,
  add column if not exists protocol_received_at timestamptz,
  add column if not exists final_response_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists latency_bucket text,
  add column if not exists supersedes_attempt_id uuid references private.comun_forwarding_attempts(id);

alter table private.comun_forwarding_attempts drop constraint if exists comun_forwarding_attempts_state_check;
alter table private.comun_forwarding_attempts add constraint comun_forwarding_attempts_state_check check (state in (
  'prepared','opened_by_person','person_declared_sent','acknowledgement_pending','acknowledged',
  'protocol_pending','protocol_recorded','human_response_pending','human_response_recorded',
  'resolved','no_response','bounced','channel_unavailable','abandoned','superseded_by_next_attempt',
  'not_sent','failed'
));
alter table private.comun_forwarding_attempts add constraint comun_forwarding_attempts_latency_bucket_check check (latency_bucket is null or latency_bucket in ('less_than_1_hour','1_to_6_hours','6_to_24_hours','1_to_3_days','4_to_7_days','more_than_7_days'));

create unique index if not exists comun_forwarding_attempts_package_sequence_idx on private.comun_forwarding_attempts(package_id, sequence_no) where sequence_no is not null;

create or replace function private.comun_forwarding_attempts_normalize()
returns trigger language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_channel text;
begin
  if new.channel_id is null then
    select a.channel_id into v_channel from private.comun_forwarding_packages p join private.comun_forwarding_adapters a on a.id=p.adapter_id where p.id=new.package_id;
    new.channel_id:=v_channel;
  end if;
  if new.sequence_no is null then select coalesce(max(sequence_no),0)+1 into new.sequence_no from private.comun_forwarding_attempts where package_id=new.package_id; end if;
  return new;
end; $$;
drop trigger if exists comun_forwarding_attempts_normalize on private.comun_forwarding_attempts;
create trigger comun_forwarding_attempts_normalize before insert on private.comun_forwarding_attempts for each row execute function private.comun_forwarding_attempts_normalize();

create table if not exists private.comun_forwarding_attempt_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references private.comun_forwarding_attempts(id) on delete restrict,
  state text not null,
  result_code text not null check (result_code ~ '^FORWARDING_[A-Z0-9_]{3,100}$'),
  occurred_at timestamptz not null default now(),
  metadata_sanitized jsonb not null default '{}'::jsonb,
  check (jsonb_typeof(metadata_sanitized) = 'object')
);

create table if not exists private.comun_forwarding_escalation_assessments (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  eligible boolean not null default false,
  reason_sanitized text not null default '',
  rule_version text not null,
  created_at timestamptz not null default now(),
  check (eligible = false or char_length(reason_sanitized) between 1 and 600)
);

insert into private.comun_forwarding_channels
  (id,name,channel_type,operator_name,sphere,territory,official_url,registration_required,protocol_behavior,tracking_behavior,availability,state,source_version,reviewed_at)
values
  ('vr-stmu-official-email','E-mail institucional STMU','email','Secretaria Municipal de Transporte e Mobilidade Urbana','municipal','Volta Redonda','mailto:stmu@voltaredonda.rj.gov.br',false,'unconfirmed','unconfirmed','source_verified','source_verified','stmu-email-official-page-v1','2026-08-04'),
  ('vr-stmu-field-ombudsman-email-candidate','E-mail observado em material de campo','email','Titularidade não confirmada','municipal','Volta Redonda','mailto:ouvidoria.onibusvr@gmail.com',false,'unconfirmed','unconfirmed','field_signage_observed','candidate','stmu-field-signage-candidate-v1','2026-08-04'),
  ('vr-stmu-phone','Telefone institucional STMU','phone','Secretaria Municipal de Transporte e Mobilidade Urbana','municipal','Volta Redonda','tel:+552435113728',false,'unconfirmed','unconfirmed','source_verified','source_verified','stmu-official-page-v1','2026-08-04'),
  ('vr-stmu-in-person','Atendimento presencial STMU','ouvidoria','Secretaria Municipal de Transporte e Mobilidade Urbana','municipal','Volta Redonda',null,true,'service_protocol_expected','unconfirmed','source_verified','source_verified','stmu-official-page-v1','2026-08-04')
on conflict (id) do update set name=excluded.name,official_url=excluded.official_url,availability=excluded.availability,state=excluded.state,source_version=excluded.source_version,reviewed_at=excluded.reviewed_at,updated_at=now();

insert into private.comun_forwarding_adapters
  (id,channel_id,name,relata_category,institutional_subcategory,requirements,fields,allowed_attachments,source_stated_duration,source_stated_unit,service_expectation,version,state)
values
  ('vr-stmu-official-email-complaint-v1','vr-stmu-official-email','STMU — e-mail institucional de reclamação','public_transport','complaint_email',
   '[{"key":"subject","label":"Assunto","source":"comun_generated","requiredStatus":"confirmed_required"},{"key":"description","label":"Descrição","source":"relata","requiredStatus":"confirmed_required"},{"key":"line","label":"Linha","source":"carta_211","requiredStatus":"source_declared"},{"key":"direction","label":"Sentido","source":"comun_structured_observation","requiredStatus":"optional"},{"key":"location_reference","label":"Local ou ponto","source":"carta_211","requiredStatus":"source_declared"},{"key":"observed_at","label":"Data e horário","source":"carta_211","requiredStatus":"source_declared"},{"key":"vehicle_order","label":"Número de ordem","source":"carta_211","requiredStatus":"optional"},{"key":"protocol_request","label":"Pedido de protocolo","source":"comun_generated","requiredStatus":"confirmed_required"}]'::jsonb,
   '[{"key":"subject","label":"Assunto","input":"text"},{"key":"description","label":"Descrição","input":"text"},{"key":"line","label":"Linha","input":"text"},{"key":"direction","label":"Sentido","input":"text"},{"key":"location_reference","label":"Local ou ponto","input":"text"},{"key":"observed_at","label":"Data e horário","input":"text"},{"key":"vehicle_order","label":"Número de ordem","input":"text"},{"key":"protocol_request","label":"Pedir protocolo","input":"boolean"}]'::jsonb,
   '[]'::jsonb,null,null,'A página atual da STMU publica o endereço institucional; operação e protocolo ainda não foram testados.','stmu-official-email-v1','active'),
  ('vr-stmu-field-ombudsman-email-candidate','vr-stmu-field-ombudsman-email-candidate','E-mail de material de campo — candidato não verificado','public_transport','complaint_email_candidate','[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null,null,'Titularidade e recebimento de reclamações não corroborados.','stmu-field-signage-candidate-v1','draft')
on conflict (id) do update set requirements=excluded.requirements,fields=excluded.fields,allowed_attachments=excluded.allowed_attachments,service_expectation=excluded.service_expectation,version=excluded.version,state=excluded.state,updated_at=now();

insert into private.comun_forwarding_source_records
  (id,channel_id,adapter_id,source_kind,source_url,source_version,observed_at,deadline_value,deadline_unit,deadline_nature,operational_status,included_in_due_calculation,claims,notes_sanitized,evidence_hash)
values
  ('stmu-email-official-current-2026','vr-stmu-official-email','vr-stmu-official-email-complaint-v1','current_general','https://www.voltaredonda.rj.gov.br/stmu/atendimento','stmu-email-official-page-v1','2026-08-04T00:00:00Z',72,'hours','service_response_expectation','source_verified_not_tested',false,'["stmu@voltaredonda.rj.gov.br","demands_protocoladas","retorno_empresas_72_horas"]','E-mail publicado na página atual; não houve envio nem verificação operacional. 72h é expectativa de resposta, não prazo legal.','1111111111111111111111111111111111111111111111111111111111111111'),
  ('stmu-email-field-signage-2026','vr-stmu-field-ombudsman-email-candidate','vr-stmu-field-ombudsman-email-candidate','historical_source','local:field-signage','stmu-field-signage-candidate-v1','2026-08-04T00:00:00Z',null,null,'not_stated','field_signage_observed',false,'["ouvidoria.onibusvr@gmail.com"]','Fotografia fornecida pelo responsável do produto; titularidade e operação não confirmadas. Botão bloqueado.','2222222222222222222222222222222222222222222222222222222222222222'),
  ('stmu-phone-official-current-2026','vr-stmu-phone',null,'current_general','https://www.voltaredonda.rj.gov.br/stmu/atendimento','stmu-official-page-v1','2026-08-04T00:00:00Z',null,null,'not_stated','source_verified_not_tested',false,'["+552435113728"]','Telefone publicado; ligação automática proibida e operação não testada.','3333333333333333333333333333333333333333333333333333333333333333')
on conflict (id) do update set source_url=excluded.source_url,source_version=excluded.source_version,deadline_value=excluded.deadline_value,deadline_unit=excluded.deadline_unit,deadline_nature=excluded.deadline_nature,operational_status=excluded.operational_status,included_in_due_calculation=excluded.included_in_due_calculation,claims=excluded.claims,notes_sanitized=excluded.notes_sanitized,evidence_hash=excluded.evidence_hash;

create or replace function public.comun_stmu_email_package_create(p_token_hash_hex text,p_relata_case_id text)
returns table(package_id uuid,relata_case_id uuid,state text,adapter_id text,missing_requirements jsonb,institutional_text text,channel_url text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_wallet uuid; v_case public.comun_relata_cases%rowtype; v_report private.comun_relata_reports%rowtype; v_package uuid; v_text text; v_case_ref text;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_relata_case_id !~ '^[0-9a-f-]{36}$' then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; if v_wallet is null then return; end if;
  v_case_ref:=p_relata_case_id; select wi.subject_ref into v_case_ref from private.comun_participation_wallet_items wi where wi.id=p_relata_case_id::uuid and wi.wallet_id=v_wallet and wi.item_type='relata_report' and wi.archived_at is null; if not found then v_case_ref:=p_relata_case_id; end if;
  select c.* into v_case from public.comun_relata_cases c where c.id=v_case_ref::uuid and c.category='public_transport' and c.state <> 'withdrawn'; if not found then return; end if;
  if not exists(select 1 from private.comun_participation_wallet_items wi where wi.wallet_id=v_wallet and wi.item_type='relata_report' and wi.subject_ref=v_case.id::text and wi.archived_at is null) then return; end if;
  select r.* into v_report from private.comun_relata_reports r where r.id=v_case.report_id and r.withdrawn_at is null; if not found then return; end if;
  v_text:='Assunto: Reclamação sobre transporte coletivo'||E'\n\nDescrição:\n'||v_report.original_text||E'\n\nLinha: [informar]\nSentido: [não informado]\nLocal: [informar]\nData e horário: [informar]\nNúmero de ordem do veículo: [não observado]\n\nSolicito, por favor, o registro da reclamação e o número de protocolo.\n\nProtocolo COMUN (interno): '||v_case.protocol;
  insert into private.comun_forwarding_packages(wallet_id,relata_case_id,adapter_id,state,original_report_ref,comun_protocol_masked,structured_summary,institutional_text,adapter_version)
  values(v_wallet,v_case.id,'vr-stmu-official-email-complaint-v1','missing_information',v_report.id,left(v_case.protocol,12)||'••••',jsonb_build_object('category','public_transport','channel','email','responseExpectation','72_hours_source_stated'),v_text,'stmu-official-email-v1')
  on conflict on constraint comun_forwarding_packages_wallet_id_relata_case_id_adapter__key do update set withdrawn_at=null,updated_at=now(),institutional_text=excluded.institutional_text returning id into v_package;
  insert into private.comun_forwarding_requirements(package_id,requirement_key,label,required,sensitive) values
    (v_package,'subject','Assunto',true,false),(v_package,'description','Descrição',true,false),(v_package,'line','Linha',true,false),(v_package,'direction','Sentido',false,false),(v_package,'location_reference','Local ou ponto',true,false),(v_package,'observed_at','Data e horário',true,false),(v_package,'vehicle_order','Número de ordem',false,false),(v_package,'protocol_request','Pedido de protocolo',true,false)
  on conflict on constraint comun_forwarding_requirements_package_id_requirement_key_key do nothing;
  update private.comun_forwarding_requirements as req set satisfied=true where req.package_id=v_package and req.requirement_key='description';
  insert into private.comun_forwarding_deadlines(package_id,source_stated_duration,source_stated_unit,service_expectation,rule_version) values(v_package,72,'hours','A página atual informa expectativa de retorno em 72 horas; não é prazo legal e não foi confirmada no e-mail.','stmu-email-response-v1') on conflict on constraint comun_forwarding_deadlines_package_id_key do nothing;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(v_package,'email_package_created','FORWARDING_STMU_EMAIL_PACKAGE_CREATED');
  return query select v_package,v_case.id,'missing_information','vr-stmu-official-email-complaint-v1','[{"key":"subject"},{"key":"description"},{"key":"line"},{"key":"location_reference"},{"key":"observed_at"},{"key":"protocol_request"}]'::jsonb,v_text,'mailto:stmu@voltaredonda.rj.gov.br';
end; $$;

create or replace function public.comun_stmu_email_requirements_update(p_token_hash_hex text,p_package_id uuid,p_subject text,p_line text,p_direction text,p_location text,p_observed_at text,p_vehicle_order text,p_confirm_text boolean)
returns table(package_id uuid,state text,missing_requirements jsonb,institutional_text text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_wallet uuid; v_count integer; v_text text; v_report text; v_protocol text;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  if not exists(select 1 from private.comun_forwarding_packages p where p.id=p_package_id and p.wallet_id=v_wallet and p.adapter_id='vr-stmu-official-email-complaint-v1' and p.withdrawn_at is null) then return; end if;
  update private.comun_forwarding_requirements as r set value_sanitized=left(trim(coalesce(p_subject,'')),600),satisfied=char_length(trim(coalesce(p_subject,'')))>0 where r.package_id=p_package_id and r.requirement_key='subject';
  update private.comun_forwarding_requirements as r set value_sanitized=left(trim(coalesce(p_line,'')),600),satisfied=char_length(trim(coalesce(p_line,'')))>0 where r.package_id=p_package_id and r.requirement_key='line';
  update private.comun_forwarding_requirements as r set value_sanitized=left(trim(coalesce(p_direction,'')),600),satisfied=char_length(trim(coalesce(p_direction,'')))>0 where r.package_id=p_package_id and r.requirement_key='direction';
  update private.comun_forwarding_requirements as r set value_sanitized=left(trim(coalesce(p_location,'')),600),satisfied=char_length(trim(coalesce(p_location,'')))>0 where r.package_id=p_package_id and r.requirement_key='location_reference';
  update private.comun_forwarding_requirements as r set value_sanitized=left(trim(coalesce(p_observed_at,'')),600),satisfied=char_length(trim(coalesce(p_observed_at,'')))>0 where r.package_id=p_package_id and r.requirement_key='observed_at';
  update private.comun_forwarding_requirements as r set value_sanitized=left(trim(coalesce(p_vehicle_order,'')),600),satisfied=char_length(trim(coalesce(p_vehicle_order,'')))>0 where r.package_id=p_package_id and r.requirement_key='vehicle_order';
  update private.comun_forwarding_requirements as r set satisfied=coalesce(p_confirm_text,false) where r.package_id=p_package_id and r.requirement_key='protocol_request';
  select original_report_ref::text into v_report from private.comun_forwarding_packages p where p.id=p_package_id; select c.protocol into v_protocol from public.comun_relata_cases c join private.comun_forwarding_packages p on p.relata_case_id=c.id where p.id=p_package_id;
  v_text:='Assunto: '||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='subject'),'Reclamação sobre transporte coletivo')||E'\n\nDescrição:\n'||coalesce((select rr.original_text from private.comun_relata_reports rr where rr.id=v_report::uuid),'')||E'\n\nLinha: '||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='line'),'não informado')||E'\nSentido: '||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='direction'),'não informado')||E'\nLocal: '||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='location_reference'),'não informado')||E'\nData e horário: '||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='observed_at'),'não informado')||E'\nNúmero de ordem do veículo: '||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='vehicle_order'),'não observado')||E'\n\nSolicito, por favor, o registro da reclamação e o número de protocolo.\n\nProtocolo COMUN (interno): '||coalesce(v_protocol,'não informado');
  select count(*) into v_count from private.comun_forwarding_requirements as r where r.package_id=p_package_id and r.required and not r.satisfied;
  update private.comun_forwarding_packages as p set institutional_text=v_text,state=case when v_count=0 then 'ready_for_review' else 'missing_information' end,updated_at=now() where p.id=p_package_id and p.wallet_id=v_wallet;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'email_requirements_updated','FORWARDING_STMU_EMAIL_REQUIREMENTS_UPDATED');
  return query select p_package_id,case when v_count=0 then 'ready_for_review' else 'missing_information' end,(select coalesce(jsonb_agg(jsonb_build_object('key',r.requirement_key,'label',r.label,'required',r.required,'satisfied',r.satisfied)),'[]'::jsonb) from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.required and not r.satisfied),v_text;
end; $$;

create or replace function public.comun_stmu_email_opened(p_token_hash_hex text,p_package_id uuid)
returns table(package_id uuid,state text,channel_url text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_wallet uuid; v_url text; v_attempt uuid; v_seq integer;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  select c.official_url into v_url from private.comun_forwarding_packages p join private.comun_forwarding_adapters a on a.id=p.adapter_id join private.comun_forwarding_channels c on c.id=a.channel_id where p.id=p_package_id and p.wallet_id=v_wallet and p.adapter_id='vr-stmu-official-email-complaint-v1' and p.state='ready_for_assisted_opening' and c.state='source_verified'; if v_url <> 'mailto:stmu@voltaredonda.rj.gov.br' then return; end if;
  select coalesce(max(sequence_no),0)+1 into v_seq from private.comun_forwarding_attempts as a where a.package_id=p_package_id;
  insert into private.comun_forwarding_attempts(package_id,channel_id,adapter_version,sequence_no,state,result_code,opened_at) values(p_package_id,'vr-stmu-official-email','stmu-official-email-v1',v_seq,'opened_by_person','FORWARDING_EMAIL_OPENED_BY_PERSON',now()) returning id into v_attempt;
  insert into private.comun_forwarding_attempt_events(attempt_id,state,result_code) values(v_attempt,'opened_by_person','FORWARDING_EMAIL_OPENED_BY_PERSON');
  update private.comun_forwarding_packages set state='opened_by_person',updated_at=now() where id=p_package_id and wallet_id=v_wallet;
  insert into private.comun_forwarding_consents(package_id,consent_kind,consent_version,active) values(p_package_id,'assisted_opening','stmu-email-consent-v1',true);
  return query select p_package_id,'opened_by_person','mailto:stmu@voltaredonda.rj.gov.br';
end; $$;

create or replace function public.comun_stmu_email_declare_sent(p_token_hash_hex text,p_package_id uuid,p_result text)
returns table(package_id uuid,state text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_state text;
begin
  select d.state into v_state from public.comun_forwarding_declare_sent(p_token_hash_hex,p_package_id,p_result) as d limit 1;
  if v_state='person_declared_sent' then update private.comun_forwarding_deadlines as d set calculated_due_at=now()+interval '72 hours',updated_at=now() where d.package_id=p_package_id; end if;
  return query select p_package_id,v_state;
end; $$;

create or replace function public.comun_forwarding_attempt_list(p_token_hash_hex text,p_relata_case_id uuid)
returns table(attempt_id uuid,package_id uuid,channel_id text,adapter_version text,sequence_no integer,state text,outcome text,latency_bucket text,opened_at timestamptz,declared_at timestamptz,protocol_received_at timestamptz,final_response_at timestamptz,resolved_at timestamptz)
language sql stable security definer set search_path='pg_catalog'
as $$
select a.id,a.package_id,a.channel_id,a.adapter_version,a.sequence_no,a.state,a.outcome,a.latency_bucket,a.opened_at,a.declared_at,a.protocol_received_at,a.final_response_at,a.resolved_at
from private.comun_forwarding_attempts a join private.comun_forwarding_packages p on p.id=a.package_id
where p.wallet_id=public.comun_forwarding_wallet_id(p_token_hash_hex) and p.relata_case_id=p_relata_case_id and p.withdrawn_at is null order by a.sequence_no nulls last,a.created_at;
$$;

alter table private.comun_forwarding_attempts enable row level security;
alter table private.comun_forwarding_attempts force row level security;
alter table private.comun_forwarding_attempt_events enable row level security;
alter table private.comun_forwarding_attempt_events force row level security;
alter table private.comun_forwarding_escalation_assessments enable row level security;
alter table private.comun_forwarding_escalation_assessments force row level security;
revoke all on table private.comun_forwarding_attempt_events,private.comun_forwarding_escalation_assessments from public,anon,authenticated;
revoke all on table private.comun_forwarding_escalation_assessments from public,anon,authenticated;
revoke all on table private.comun_forwarding_attempt_events from public,anon,authenticated;
revoke all on function public.comun_stmu_email_package_create(text,text),public.comun_stmu_email_requirements_update(text,uuid,text,text,text,text,text,text,boolean),public.comun_stmu_email_opened(text,uuid),public.comun_stmu_email_declare_sent(text,uuid,text),public.comun_forwarding_attempt_list(text,uuid) from public,anon,authenticated;
grant execute on function public.comun_stmu_email_package_create(text,text),public.comun_stmu_email_requirements_update(text,uuid,text,text,text,text,text,text,boolean),public.comun_stmu_email_opened(text,uuid),public.comun_stmu_email_declare_sent(text,uuid,text),public.comun_forwarding_attempt_list(text,uuid) to service_role;
