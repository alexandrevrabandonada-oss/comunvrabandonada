-- COMUN 48.0K. Observação humana do WhatsApp STMU e abertura assistida local-only.
-- Nenhuma mensagem é enviada, nenhum cadastro é criado e nenhum protocolo é confirmado.

alter table private.comun_forwarding_channels
  add column if not exists operational_state text not null default 'source_verified',
  add column if not exists live_channel_reached boolean not null default false,
  add column if not exists channel_identity_observed boolean not null default false,
  add column if not exists menu_observed boolean not null default false,
  add column if not exists service_hours_observed boolean not null default false,
  add column if not exists complaint_option_observed boolean not null default false;

alter table private.comun_forwarding_channel_observations
  drop constraint if exists comun_forwarding_channel_observations_state_check;
alter table private.comun_forwarding_channel_observations
  add constraint comun_forwarding_channel_observations_state_check check (state in (
    'source_verified','public_entry_reachable','authentication_boundary_observed',
    'service_category_observed','form_fields_observed','review_boundary_observed',
    'submission_boundary_observed','protocol_behavior_unconfirmed',
    'public_entry_observed_auth_boundary_pending','degraded_public_entry_auth_unconfirmed',
    'menu_operational_complaint_flow_pending','operationally_observed_no_submission',
    'degraded','unavailable'
  ));

insert into private.comun_forwarding_channels
  (id,name,channel_type,operator_name,sphere,territory,official_url,registration_required,protocol_behavior,tracking_behavior,availability,state,source_version,reviewed_at,operational_state,live_channel_reached,channel_identity_observed,menu_observed,service_hours_observed,complaint_option_observed)
values
  ('vr-stmu-whatsapp','WhatsApp de Ônibus — STMU/STPP Volta Redonda','whatsapp','Secretaria Municipal de Transporte e Mobilidade Urbana','municipal','Volta Redonda','https://wa.me/5524992958558',false,'unconfirmed','unconfirmed','observed_live_channel','source_verified','stmu-whatsapp-human-live-observation-v1','2026-08-04','menu_operational_complaint_flow_pending',true,true,true,true,true)
on conflict (id) do update set name=excluded.name, official_url=excluded.official_url, source_version=excluded.source_version, reviewed_at=excluded.reviewed_at, operational_state=excluded.operational_state, live_channel_reached=excluded.live_channel_reached, channel_identity_observed=excluded.channel_identity_observed, menu_observed=excluded.menu_observed, service_hours_observed=excluded.service_hours_observed, complaint_option_observed=excluded.complaint_option_observed, updated_at=now();

insert into private.comun_forwarding_adapters
  (id,channel_id,name,relata_category,institutional_subcategory,requirements,fields,allowed_attachments,source_stated_duration,source_stated_unit,service_expectation,version)
values
  ('vr-stmu-whatsapp-complaint-v1','vr-stmu-whatsapp','STMU WhatsApp — reclamação de transporte','public_transport','complaint',
   '[{"key":"name","label":"Nome","source":"live_menu","requiredStatus":"confirmed_required","liveConfirmed":true,"sensitive":true},{"key":"line","label":"Linha","source":"carta_211","requiredStatus":"source_declared","liveConfirmed":false},{"key":"direction","label":"Sentido","source":"structured_observation","requiredStatus":"optional","liveConfirmed":false},{"key":"location_reference","label":"Local ou ponto","source":"carta_211","requiredStatus":"source_declared","liveConfirmed":false},{"key":"observed_at","label":"Data e horário","source":"carta_211","requiredStatus":"source_declared","liveConfirmed":false},{"key":"vehicle_order","label":"Número de ordem do veículo","source":"carta_211","requiredStatus":"optional","liveConfirmed":false}]'::jsonb,
   '[{"key":"name","label":"Nome","input":"private_text"},{"key":"line","label":"Linha","input":"text"},{"key":"direction","label":"Sentido","input":"text"},{"key":"location_reference","label":"Local ou ponto","input":"text"},{"key":"observed_at","label":"Data e horário","input":"text"},{"key":"vehicle_order","label":"Número de ordem","input":"text"}]'::jsonb,
   '["image/jpeg","image/png","image/webp"]'::jsonb,72,'hours','A STMU informa expectativa de retorno em 72 horas em fontes oficiais; não é prazo legal nem confirmação operacional do WhatsApp.','stmu-whatsapp-complaint-v1')
on conflict (id) do update set requirements=excluded.requirements,fields=excluded.fields,allowed_attachments=excluded.allowed_attachments,source_stated_duration=excluded.source_stated_duration,source_stated_unit=excluded.source_stated_unit,service_expectation=excluded.service_expectation,version=excluded.version,updated_at=now();

insert into private.comun_forwarding_channel_observations
  (channel_id,adapter_id,source_version,observation_type,state,observed_at,environment,authentication_required,service_found,fields_observed,attachment_behavior,review_screen_observed,submission_boundary_observed,protocol_behavior,tracking_behavior,accessibility_notes,mobile_notes,result,evidence_hash,review_due_at)
values
  ('vr-stmu-whatsapp','vr-stmu-whatsapp-complaint-v1','stmu-whatsapp-human-live-observation-v1','human_micro_gate','menu_operational_complaint_flow_pending','2026-08-04T00:00:00Z','human_observation','no','yes','["nome","opcao_1_horario","opcao_2_elogio_sugestao","opcao_3_reclamacao","horario_segunda_sexta_8_17"]'::jsonb,'unconfirmed','unconfirmed','not_reached','unconfirmed','unconfirmed','Checklist sem dados pessoais; abertura manual e cancelamento preservados.','Menu observado em canal móvel; perguntas da opção 3 ainda não observadas.','STMU_COMPLAINT_PROMPT_PENDING','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','2026-09-04T00:00:00Z')
on conflict do nothing;

insert into private.comun_forwarding_source_records
  (id,channel_id,adapter_id,source_kind,source_url,source_version,observed_at,deadline_value,deadline_unit,deadline_nature,operational_status,included_in_due_calculation,claims,notes_sanitized,evidence_hash)
values
  ('stmu-whatsapp-live-2026-08-04','vr-stmu-whatsapp','vr-stmu-whatsapp-complaint-v1','current_general','https://wa.me/5524992958558','stmu-whatsapp-human-live-observation-v1','2026-08-04T00:00:00Z',null,null,'not_stated','human_observation',false,'["identidade_observada","menu_1_2_3","horario_8_17"]','Observação humana sanitizada; opção 3 alcançada como menu, perguntas e protocolo não observados.',repeat('4',64)),
  ('stmu-official-historical-2022','vr-stmu-whatsapp','vr-stmu-whatsapp-complaint-v1','historical_source','https://www.voltaredonda.rj.gov.br/','stmu-whatsapp-source-reconciliation-v1','2026-08-04T00:00:00Z',72,'hours','source_stated_response_expectation','official_historical_source',false,'["menu_1_2_3","resposta_72_horas"]','Fonte oficial de 2022; não promove garantia atual nem protocolo confirmado.',repeat('5',64)),
  ('stmu-current-page-2026','vr-stmu-whatsapp','vr-stmu-whatsapp-complaint-v1','current_specific_service','https://www.voltaredonda.rj.gov.br/','stmu-whatsapp-source-reconciliation-v1','2026-08-04T00:00:00Z',72,'hours','source_stated_response_expectation','current_official_page_whatsapp_omitted',false,'["demandas_protocoladas","retorno_empresas_72_horas"]','Página atual lista telefone/e-mail e não lista WhatsApp; conflito preservado.',repeat('6',64))
on conflict (id) do update set source_url=excluded.source_url,source_version=excluded.source_version,deadline_value=excluded.deadline_value,deadline_unit=excluded.deadline_unit,deadline_nature=excluded.deadline_nature,operational_status=excluded.operational_status,included_in_due_calculation=excluded.included_in_due_calculation,claims=excluded.claims,notes_sanitized=excluded.notes_sanitized,evidence_hash=excluded.evidence_hash;

create or replace function public.comun_forwarding_package_list(p_token_hash_hex text)
returns table(package_id uuid,wallet_item_id uuid,relata_case_id uuid,adapter_id text,state text,comun_protocol_masked text,institutional_text text,requirements jsonb,deadline jsonb,official_protocol_masked text,channel_url text,updated_at timestamptz)
language sql stable security definer set search_path='pg_catalog'
as $$
select p.id,wi.id,p.relata_case_id,p.adapter_id,p.state,p.comun_protocol_masked,
  case when p.adapter_id='vr-stmu-whatsapp-complaint-v1' then null else p.institutional_text end,
  coalesce((select jsonb_agg(jsonb_build_object('key',r.requirement_key,'label',r.label,'required',r.required,'sensitive',r.sensitive,'satisfied',r.satisfied,'value',case when r.sensitive then null else r.value_sanitized end) order by r.requirement_key) from private.comun_forwarding_requirements r where r.package_id=p.id),'[]'::jsonb),
  coalesce((select jsonb_build_object('sourceStatedDuration',d.source_stated_duration,'sourceStatedUnit',d.source_stated_unit,'calculatedDueAt',d.calculated_due_at,'legalDeadline',d.legal_deadline,'serviceExpectation',d.service_expectation) from private.comun_forwarding_deadlines d where d.package_id=p.id),'{}'::jsonb),
  case when op.protocol_value is null then null else left(op.protocol_value,3)||'••••' end,c.official_url,p.updated_at
from private.comun_forwarding_packages p join private.comun_forwarding_channels c on c.id=(select a.channel_id from private.comun_forwarding_adapters a where a.id=p.adapter_id) left join private.comun_forwarding_official_protocols op on op.package_id=p.id left join private.comun_participation_wallet_items wi on wi.wallet_id=p.wallet_id and wi.item_type='relata_report' and wi.subject_ref=p.relata_case_id::text and wi.archived_at is null
where p.wallet_id=public.comun_forwarding_wallet_id(p_token_hash_hex) and p.withdrawn_at is null order by p.updated_at desc $$;

create or replace function public.comun_stmu_package_create(p_token_hash_hex text,p_relata_case_id text)
returns table(package_id uuid,relata_case_id uuid,state text,adapter_id text,missing_requirements jsonb,institutional_text text,channel_url text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_wallet uuid; v_case public.comun_relata_cases%rowtype; v_report private.comun_relata_reports%rowtype; v_package uuid; v_text text; v_case_ref text;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_relata_case_id !~ '^[0-9a-f-]{36}$' then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active'; if v_wallet is null then return; end if;
  v_case_ref:=p_relata_case_id; select subject_ref into v_case_ref from private.comun_participation_wallet_items where id=p_relata_case_id::uuid and wallet_id=v_wallet and item_type='relata_report' and archived_at is null; if not found then v_case_ref:=p_relata_case_id; end if;
  select c.* into v_case from public.comun_relata_cases c where c.id=v_case_ref::uuid and c.category='public_transport' and c.state <> 'withdrawn'; if not found then return; end if;
  if not exists(select 1 from private.comun_participation_wallet_items where wallet_id=v_wallet and item_type='relata_report' and subject_ref=v_case.id::text and archived_at is null) then return; end if;
  select r.* into v_report from private.comun_relata_reports r where r.id=v_case.report_id and r.withdrawn_at is null; if not found then return; end if;
  v_text:='Olá. Gostaria de registrar uma reclamação sobre o transporte coletivo.'||E'\n\nNome:\n[nome informado privadamente]\n\nLinha:\n[informar]\n\nSentido:\n[não informado]\n\nLocal:\n[informar]\n\nData e horário:\n[informar]\n\nNúmero de ordem do veículo:\nnão observado\n\nOcorrência:\n[selecionar]\n\nDescrição:\n'||v_report.original_text||E'\n\nProtocolo COMUN (interno): '||v_case.protocol||E'\n\nSolicito, por favor, o registro da reclamação e o número de protocolo.';
  insert into private.comun_forwarding_packages(wallet_id,relata_case_id,adapter_id,state,original_report_ref,comun_protocol_masked,structured_summary,institutional_text,adapter_version)
  values(v_wallet,v_case.id,'vr-stmu-whatsapp-complaint-v1','missing_information',v_report.id,left(v_case.protocol,12)||'••••',jsonb_build_object('category','public_transport','state','menu_operational_complaint_flow_pending','protocolBoundary','unconfirmed'),v_text,'stmu-whatsapp-complaint-v1')
  on conflict on constraint comun_forwarding_packages_wallet_id_relata_case_id_adapter__key do update set withdrawn_at=null,updated_at=now() returning id into v_package;
  insert into private.comun_forwarding_requirements(package_id,requirement_key,label,required,sensitive) values
    (v_package,'name','Nome',true,true),(v_package,'line','Linha',true,false),(v_package,'direction','Sentido',false,false),(v_package,'location_reference','Local ou ponto',true,false),(v_package,'observed_at','Data e horário',true,false),(v_package,'vehicle_order','Número de ordem do veículo',false,false),(v_package,'institutional_text_confirmation','Revisar mensagem',true,false)
    on conflict on constraint comun_forwarding_requirements_package_id_requirement_key_key do nothing;
  insert into private.comun_forwarding_deadlines(package_id,source_stated_duration,source_stated_unit,service_expectation,rule_version) values(v_package,72,'hours','A STMU informa expectativa de retorno em 72 horas em fontes oficiais; esse prazo ainda não foi confirmado no WhatsApp.','stmu-whatsapp-response-v1') on conflict on constraint comun_forwarding_deadlines_package_id_key do update set service_expectation=excluded.service_expectation,source_stated_duration=excluded.source_stated_duration,source_stated_unit=excluded.source_stated_unit;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(v_package,'package_created','FORWARDING_STMU_PACKAGE_CREATED');
  return query select v_package,v_case.id,'missing_information','vr-stmu-whatsapp-complaint-v1',(select coalesce(jsonb_agg(jsonb_build_object('key',r.requirement_key,'label',r.label,'required',r.required,'sensitive',r.sensitive,'satisfied',r.satisfied)),'[]'::jsonb) from private.comun_forwarding_requirements r where r.package_id=v_package and r.required and not r.satisfied),v_text,'https://wa.me/5524992958558';
end; $$;

create or replace function public.comun_stmu_requirements_update(p_token_hash_hex text,p_package_id uuid,p_name text,p_line text,p_direction text,p_location text,p_observed_at text,p_vehicle_order text,p_occurrence text,p_confirm_text boolean)
returns table(package_id uuid,state text,missing_requirements jsonb,institutional_text text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_wallet uuid; v_count integer; v_text text; v_report text; v_protocol text;
begin
  v_wallet:=public.comun_forwarding_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  if not exists(select 1 from private.comun_forwarding_packages p where p.id=p_package_id and p.wallet_id=v_wallet and p.adapter_id='vr-stmu-whatsapp-complaint-v1' and p.withdrawn_at is null) then return; end if;
  if p_name is not null and char_length(trim(p_name)) between 1 and 240 then insert into private.comun_forwarding_private_contacts(package_id,field_key,value_private,consent_version) values(p_package_id,'name',trim(p_name),'stmu-whatsapp-consent-v1') on conflict on constraint comun_forwarding_private_contacts_package_id_field_key_key do update set value_private=excluded.value_private; update private.comun_forwarding_requirements as req set satisfied=true where req.package_id=p_package_id and req.requirement_key='name'; end if;
  update private.comun_forwarding_requirements as req set value_sanitized=left(trim(coalesce(p_line,'')),600),satisfied=char_length(trim(coalesce(p_line,'')))>0 where req.package_id=p_package_id and req.requirement_key='line';
  update private.comun_forwarding_requirements as req set value_sanitized=left(trim(coalesce(p_direction,'')),600),satisfied=char_length(trim(coalesce(p_direction,'')))>0 where req.package_id=p_package_id and req.requirement_key='direction';
  update private.comun_forwarding_requirements as req set value_sanitized=left(trim(coalesce(p_location,'')),600),satisfied=char_length(trim(coalesce(p_location,'')))>0 where req.package_id=p_package_id and req.requirement_key='location_reference';
  update private.comun_forwarding_requirements as req set value_sanitized=left(trim(coalesce(p_observed_at,'')),600),satisfied=char_length(trim(coalesce(p_observed_at,'')))>0 where req.package_id=p_package_id and req.requirement_key='observed_at';
  update private.comun_forwarding_requirements as req set value_sanitized=left(trim(coalesce(p_vehicle_order,'')),600),satisfied=char_length(trim(coalesce(p_vehicle_order,'')))>0 where req.package_id=p_package_id and req.requirement_key='vehicle_order';
  update private.comun_forwarding_requirements as req set satisfied=coalesce(p_confirm_text,false) where req.package_id=p_package_id and req.requirement_key='institutional_text_confirmation';
  select original_report_ref::text into v_report from private.comun_forwarding_packages where id=p_package_id; select c.protocol into v_protocol from public.comun_relata_cases c join private.comun_forwarding_packages p on p.relata_case_id=c.id where p.id=p_package_id;
  v_text:='Olá. Gostaria de registrar uma reclamação sobre o transporte coletivo.'||E'\n\nNome:\n'||coalesce((select c.value_private from private.comun_forwarding_private_contacts c where c.package_id=p_package_id and c.field_key='name'),'[nome informado privadamente]')||E'\n\nLinha:\n'||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='line'),'não informado')||E'\n\nSentido:\n'||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='direction'),'não informado')||E'\n\nLocal:\n'||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='location_reference'),'não informado')||E'\n\nData e horário:\n'||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='observed_at'),'não informado')||E'\n\nNúmero de ordem do veículo:\n'||coalesce((select r.value_sanitized from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.requirement_key='vehicle_order'),'não observado')||E'\n\nOcorrência:\n'||coalesce(p_occurrence,'não informado')||E'\n\nDescrição:\n'||coalesce((select r.original_text from private.comun_relata_reports r join public.comun_relata_cases c on c.report_id=r.id join private.comun_forwarding_packages p on p.relata_case_id=c.id where p.id=p_package_id),'')||E'\n\nProtocolo COMUN (interno): '||coalesce(v_protocol,'não informado')||E'\n\nSolicito, por favor, o registro da reclamação e o número de protocolo.';
  select count(*) into v_count from private.comun_forwarding_requirements as req where req.package_id=p_package_id and req.required and not req.satisfied;
  update private.comun_forwarding_packages set institutional_text=v_text,state=case when v_count=0 then 'ready_for_review' else 'missing_information' end,updated_at=now() where id=p_package_id and wallet_id=v_wallet;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(p_package_id,'requirements_updated','FORWARDING_STMU_REQUIREMENTS_UPDATED');
  return query select p_package_id,case when v_count=0 then 'ready_for_review' else 'missing_information' end,(select coalesce(jsonb_agg(jsonb_build_object('key',r.requirement_key,'label',r.label)),'[]'::jsonb) from private.comun_forwarding_requirements r where r.package_id=p_package_id and r.required and not r.satisfied),v_text;
end; $$;

create or replace function public.comun_stmu_declare_sent(p_token_hash_hex text,p_package_id uuid,p_result text)
returns table(package_id uuid,state text)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_state text;
begin
  select d.state into v_state from public.comun_forwarding_declare_sent(p_token_hash_hex,p_package_id,p_result) as d limit 1;
  if v_state='person_declared_sent' then update private.comun_forwarding_deadlines as d set calculated_due_at=now()+interval '72 hours',updated_at=now() where d.package_id=p_package_id; end if;
  return query select p_package_id,v_state;
end; $$;

alter table private.comun_forwarding_channels enable row level security;
alter table private.comun_forwarding_channels force row level security;
alter table private.comun_forwarding_adapters enable row level security;
alter table private.comun_forwarding_adapters force row level security;
revoke all on function public.comun_stmu_package_create(text,text), public.comun_stmu_requirements_update(text,uuid,text,text,text,text,text,text,text,boolean), public.comun_stmu_declare_sent(text,uuid,text) from public,anon,authenticated;
grant execute on function public.comun_stmu_package_create(text,text), public.comun_stmu_requirements_update(text,uuid,text,text,text,text,text,text,text,boolean), public.comun_stmu_declare_sent(text,uuid,text) to service_role;
