begin;

alter table public.comun_relata_cases
  drop constraint comun_relata_cases_category_check;

alter table public.comun_relata_cases
  add constraint comun_relata_cases_category_check
  check (category in (
    'public_lighting','power_distribution','water_supply','electrical_hazard',
    'active_fire','smoke_or_environmental_trace','sidewalk_accessibility',
    'waste_or_debris','public_transport','public_health','public_education',
    'workplace','environmental_pollution','other'
  ));

create table private.comun_relata_classification_events (
  id bigint generated always as identity primary key,
  report_id uuid not null references private.comun_relata_reports(id) on delete restrict,
  case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  previous_category text not null,
  next_category text not null check (next_category in ('water_supply','power_distribution','public_lighting')),
  event_type text not null check (event_type = 'person_added_semantic_context'),
  previous_text_absent boolean not null check (previous_text_absent),
  actor text not null check (actor = 'person'),
  created_at timestamptz not null default now()
);

create or replace function private.comun_relata_classification_events_append_only()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  raise exception using errcode='42501', message='COMUN_RELATA_CLASSIFICATION_EVENTS_APPEND_ONLY';
end;
$$;

create trigger comun_relata_classification_events_append_only
  before update or delete on private.comun_relata_classification_events
  for each row execute function private.comun_relata_classification_events_append_only();

alter table private.comun_relata_classification_events enable row level security;
alter table private.comun_relata_classification_events force row level security;
revoke all on table private.comun_relata_classification_events from public, anon, authenticated;
grant select, insert on table private.comun_relata_classification_events to service_role;
grant usage, select on sequence private.comun_relata_classification_events_id_seq to service_role;
revoke all on function private.comun_relata_classification_events_append_only() from public, anon, authenticated;

alter table private.comun_forwarding_packages
  add column source_domain text;

update private.comun_forwarding_packages
set source_domain = 'bus'
where source_domain is null;

alter table private.comun_forwarding_packages
  alter column source_domain set default 'bus',
  alter column source_domain set not null,
  alter column bus_intake_id drop not null,
  add constraint comun_forwarding_packages_source_domain_check
    check (source_domain in ('bus','essential_service')),
  add constraint comun_forwarding_packages_source_reference_check
    check (
      (source_domain='bus' and bus_intake_id is not null)
      or (source_domain='essential_service' and bus_intake_id is null)
    );

alter table private.comun_forwarding_attempts
  drop constraint comun_forwarding_attempts_channel_check;

alter table private.comun_forwarding_attempts
  add constraint comun_forwarding_attempts_channel_check
  check (channel in ('whatsapp','email','phone','in_person','web'));

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
    or (p_original_text is not null and char_length(trim(p_original_text)) not between 8 and 600)
  then
    raise exception using errcode='22023', message='COMUN_RELATA_INVALID_PROOF';
  end if;

  if jsonb_typeof(coalesce(p_answers,'{}'::jsonb)) <> 'object'
    or coalesce(p_answers,'{}'::jsonb)
      - 'homes_power' - 'smoke_active' - 'blocked' - 'line' - 'direction' - 'unit' - 'school_type' <> '{}'::jsonb
    or (coalesce(p_answers,'{}'::jsonb) ? 'homes_power' and coalesce(p_answers,'{}'::jsonb)->>'homes_power' not in ('sim','nao'))
    or jsonb_typeof(coalesce(p_decision,'{}'::jsonb)) <> 'object'
    or octet_length(convert_to(coalesce(p_decision,'{}'::jsonb)::text,'utf8')) > 4096
  then
    raise exception using errcode='22023', message='COMUN_RELATA_INVALID_TRIAGE';
  end if;

  if p_category not in (
      'public_lighting','power_distribution','water_supply','electrical_hazard',
      'active_fire','smoke_or_environmental_trace','sidewalk_accessibility',
      'waste_or_debris','public_transport','public_health','public_education',
      'workplace','environmental_pollution','other'
    )
    or p_urgency not in ('routine','attention','urgent','emergency')
    or p_rule_version <> 'relata-routing-v1'
    or p_privacy_class not in ('public_safe','public_after_sanitization','restricted','sensitive','high_risk')
    or p_consent_version <> 'relata-consent-v1'
  then
    raise exception using errcode='22023', message='COMUN_RELATA_INVALID_CONTRACT';
  end if;

  if p_original_text is null and (
    p_category not in ('other','sidewalk_accessibility')
    or p_privacy_class not in ('sensitive','high_risk')
    or p_decision->>'captureBasis' is distinct from 'photo_only'
    or p_decision->>'semanticTextState' is distinct from 'absent'
    or p_decision->>'captureState' is distinct from 'captured_private'
    or p_decision->'requiresEnrichment' is distinct from 'true'::jsonb
  ) then
    raise exception using errcode='22023', message='COMUN_RELATA_INVALID_PHOTO_ONLY_CONTRACT';
  end if;

  if p_original_text is null then
    decision := jsonb_build_object(
      'category',p_category,'urgency',p_urgency,'ruleVersion',p_rule_version,
      'source','photo_first_private_capture','captureBasis','photo_only',
      'semanticTextState','absent','captureState','captured_private',
      'requiresEnrichment',true,'requiresHumanReview',true,'confidence','low',
      'agencyKind','community_review','publication','never_automatic',
      'automaticForwarding',false
    );
  else
    decision := jsonb_build_object(
      'category',p_category,'urgency',p_urgency,'ruleVersion',p_rule_version,
      'source','deterministic_server_route'
    );
  end if;

  ih := extensions.digest('relata-idempotency-v1:'||p_idempotency_key,'sha256');
  rh := extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256');
  ph := extensions.digest(convert_to(jsonb_build_object(
    'text',case when p_original_text is null then 'COMUN_NO_SEMANTIC_TEXT_V1' else trim(p_original_text) end,
    'answers',coalesce(p_answers,'{}'::jsonb),'category',p_category,
    'urgency',p_urgency,'decision',decision
  )::text,'utf8'),'sha256');

  perform pg_advisory_xact_lock(hashtextextended(encode(ih,'hex'),4800));
  select * into existing from private.comun_relata_reports where idempotency_hash=ih;
  if found then
    if existing.payload_hash<>ph or existing.receipt_hash<>rh then
      raise exception using errcode='P0001',message='COMUN_RELATA_IDEMPOTENCY_CONFLICT';
    end if;
    return query select c.protocol,c.state,c.category,c.urgency,c.routing_rule_version,c.created_at,true
      from public.comun_relata_cases c where c.report_id=existing.id;
    return;
  end if;

  insert into private.comun_relata_reports(
    original_text,triage_answers,receipt_hash,actor_hash,idempotency_hash,
    payload_hash,privacy_class,routing_rule_version,routing_decision,urgency,
    consent_version,retention_class,review_after
  ) values(
    case when p_original_text is null then null else trim(p_original_text) end,
    coalesce(p_answers,'{}'::jsonb),rh,
    extensions.digest('relata-actor-v1:'||p_receipt_secret,'sha256'),ih,ph,
    p_privacy_class,p_rule_version,decision,p_urgency,p_consent_version,
    case when p_privacy_class in ('sensitive','high_risk') then 'sensitive' else 'private_unsubmitted' end,
    now()+case when p_privacy_class in ('sensitive','high_risk') then interval '30 days' else interval '90 days' end
  ) returning id into rid;

  loop
    proto := 'COMUN-RELATA-'||upper(encode(extensions.gen_random_bytes(8),'hex'));
    exit when not exists(select 1 from public.comun_relata_cases c where c.protocol=proto);
  end loop;

  insert into public.comun_relata_cases(
    report_id,protocol,category,urgency,routing_rule_version,routing_decision,state
  ) values(rid,proto,p_category,p_urgency,p_rule_version,decision,'stored_private')
  returning id into cid;
  insert into public.comun_relata_consents(case_id,consent_version) values(cid,p_consent_version);
  insert into public.comun_relata_status_events(case_id,state,actor,result_code) values
    (cid,'draft','person','RELATA_DRAFT_ACCEPTED'),
    (cid,'triage','system_local','RELATA_TRIAGE_RECORDED'),
    (cid,'routed','system_local','RELATA_ROUTE_CLASSIFIED'),
    (cid,'stored_private','system_local','RELATA_STORED_PRIVATE');
  return query select proto,'stored_private',p_category,p_urgency,p_rule_version,now(),false;
end;
$$;

create or replace function public.comun_relata_classification_transition(
  p_protocol text,
  p_receipt_secret text,
  p_original_text text,
  p_category text,
  p_decision jsonb
)
returns table(report_id uuid,case_id uuid,protocol text,category text,state text)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_context record;
  v_report private.comun_relata_reports%rowtype;
  v_decision jsonb;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.case_state='withdrawn' or v_context.category<>'other'
    or p_category not in ('water_supply','power_distribution','public_lighting')
    or char_length(trim(coalesce(p_original_text,''))) not between 8 and 600
    or jsonb_typeof(coalesce(p_decision,'{}'::jsonb))<>'object'
    or octet_length(convert_to(coalesce(p_decision,'{}'::jsonb)::text,'utf8'))>4096
  then return; end if;
  select * into v_report from private.comun_relata_reports
    where id=v_context.report_id and original_text is null and withdrawn_at is null for update;
  if not found then return; end if;
  v_decision:=jsonb_build_object(
    'category',p_category,'urgency','attention','ruleVersion','relata-routing-v1',
    'source','person_added_semantic_context','requiresHumanReview',false,
    'publication','never_automatic','automaticForwarding',false
  );
  update private.comun_relata_reports set
    original_text=trim(p_original_text), routing_decision=v_decision,
    routing_rule_version='relata-routing-v1',updated_at=now()
  where id=v_context.report_id;
  update public.comun_relata_cases set
    category=p_category,routing_decision=v_decision,
    routing_rule_version='relata-routing-v1',updated_at=now()
  where id=v_context.case_id;
  update private.comun_participation_wallet_items set
    category=p_category,title_template='Relato de serviço essencial',
    presentation_state='Pronto para encaminhar',
    action_required='Preparar encaminhamento',updated_at=now()
  where item_type='relata_report' and subject_ref=v_context.case_id::text and archived_at is null;
  insert into private.comun_relata_classification_events(
    report_id,case_id,previous_category,next_category,event_type,previous_text_absent,actor
  ) values(v_context.report_id,v_context.case_id,'other',p_category,'person_added_semantic_context',true,'person');
  return query select v_context.report_id,v_context.case_id,p_protocol,p_category,v_context.case_state;
end;
$$;

create or replace function private.comun_assisted_wallet_id(p_token_hash_hex text)
returns uuid language sql stable security definer set search_path=pg_catalog,private as $$
  select id from private.comun_participation_wallets
  where p_token_hash_hex ~ '^[0-9a-f]{64}$'
    and token_hash=decode(p_token_hash_hex,'hex') and status='active' limit 1;
$$;

create or replace function public.comun_essential_wallet_mark_ready(
  p_token_hash_hex text,p_wallet_item_id uuid
)
returns boolean language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare v_wallet uuid;
begin
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return false; end if;
  update private.comun_participation_wallet_items set
    title_template='Relato de serviço essencial',presentation_state='Pronto para encaminhar',
    action_required='Preparar encaminhamento',updated_at=now()
  where id=p_wallet_item_id and wallet_id=v_wallet and item_type='relata_report'
    and category in ('water_supply','power_distribution','public_lighting')
    and archived_at is null;
  return found;
end;
$$;

create or replace function public.comun_essential_assisted_prepare(
  p_token_hash_hex text,p_wallet_item_id uuid
)
returns table(package_id uuid,state text,category text,subject text,institutional_text text,response_expectation text)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid;
  v_case public.comun_relata_cases%rowtype;
  v_report private.comun_relata_reports%rowtype;
  v_package private.comun_forwarding_packages%rowtype;
  v_subject text;
  v_intro text;
  v_body text;
begin
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;
  select c.* into v_case
  from private.comun_participation_wallet_items wi
  join public.comun_relata_cases c on c.id=wi.subject_ref::uuid
  where wi.id=p_wallet_item_id and wi.wallet_id=v_wallet
    and wi.item_type='relata_report' and wi.archived_at is null
    and c.category in ('water_supply','power_distribution','public_lighting')
    and c.state<>'withdrawn';
  if not found then return; end if;
  select * into v_report from private.comun_relata_reports
    where id=v_case.report_id and withdrawn_at is null;
  if not found then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_case.id::text,4806));
  select * into v_package from private.comun_forwarding_packages
    where wallet_id=v_wallet and relata_case_id=v_case.id and withdrawn_at is null for update;
  if not found then
    v_subject:=case v_case.category
      when 'water_supply' then 'Ocorrência de abastecimento de água'
      when 'power_distribution' then 'Ocorrência de falta de energia'
      else 'Solicitação sobre iluminação pública' end;
    v_intro:=case v_case.category
      when 'water_supply' then 'Gostaria de registrar uma ocorrência relacionada ao abastecimento de água.'
      when 'power_distribution' then 'Gostaria de registrar uma ocorrência de falta de energia.'
      else 'Gostaria de solicitar verificação da iluminação pública.' end;
    v_body:=v_intro||E'\n\n'||case when v_report.original_text is null
      then 'Descrição adicional não informada.'
      else 'Descrição informada pela pessoa: '||v_report.original_text end
      ||E'\n\nInforme o local ao serviço para concluir a solicitação.'
      ||E'\n\nSolicito, por favor, o registro e o número de protocolo do serviço.';
    insert into private.comun_forwarding_packages(
      wallet_id,relata_case_id,bus_intake_id,source_domain,state,subject,
      institutional_text,response_expectation
    ) values(
      v_wallet,v_case.id,null,'essential_service','ready_for_forwarding',v_subject,v_body,
      'O protocolo do serviço é opcional no COMUN e deve ser informado manualmente pela pessoa.'
    ) returning * into v_package;
    insert into private.comun_forwarding_events(package_id,event_type,result_code)
      values(v_package.id,'package_prepared','FORWARDING_ESSENTIAL_PACKAGE_PREPARED');
  elsif v_package.source_domain<>'essential_service' then
    return;
  end if;
  update private.comun_participation_wallet_items set
    presentation_state='Encaminhamento preparado',
    action_required='Conferir e enviar manualmente',updated_at=now()
  where id=p_wallet_item_id and wallet_id=v_wallet;
  return query select v_package.id,v_package.state,v_case.category,
    v_package.subject,v_package.institutional_text,v_package.response_expectation;
end;
$$;

create or replace function public.comun_assisted_wallet_item_category(
  p_token_hash_hex text,p_wallet_item_id uuid
)
returns table(category text)
language sql stable security definer set search_path=pg_catalog,private,public as $$
  select wi.category
  from private.comun_participation_wallet_items wi
  where wi.id=p_wallet_item_id
    and wi.wallet_id=private.comun_assisted_wallet_id(p_token_hash_hex)
    and wi.item_type='relata_report' and wi.archived_at is null;
$$;

create or replace function public.comun_assisted_forwarding_list(
  p_token_hash_hex text,p_wallet_item_id uuid
)
returns table(package_id uuid,state text,source_domain text,category text,subject text,institutional_text text,response_expectation text,attempts jsonb)
language sql stable security definer set search_path=pg_catalog,private,public as $$
  select p.id,p.state,p.source_domain,c.category,p.subject,p.institutional_text,p.response_expectation,
    coalesce((select jsonb_agg(jsonb_build_object(
      'attemptId',a.id,'sequence',a.sequence_no,'channel',a.channel,'state',a.state,
      'openedAt',a.opened_at,'declaredAt',a.declared_at,'dueAt',a.due_at,
      'officialProtocolMasked',case when a.official_protocol is null then null else left(a.official_protocol,3)||'••••' end,
      'respondedAt',a.responded_at
    ) order by a.sequence_no) from private.comun_forwarding_attempts a where a.package_id=p.id),'[]'::jsonb)
  from private.comun_forwarding_packages p
  join public.comun_relata_cases c on c.id=p.relata_case_id
  join private.comun_participation_wallet_items wi
    on wi.wallet_id=p.wallet_id and wi.subject_ref=p.relata_case_id::text
    and wi.item_type='relata_report' and wi.archived_at is null
  where p.wallet_id=private.comun_assisted_wallet_id(p_token_hash_hex)
    and wi.id=p_wallet_item_id and p.withdrawn_at is null;
$$;

create or replace function public.comun_assisted_forwarding_open(
  p_token_hash_hex text,p_package_id uuid,p_channel text
)
returns table(attempt_id uuid,attempt_state text,channel text,sequence_no integer)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid;
  v_attempt private.comun_forwarding_attempts%rowtype;
  v_sequence integer;
begin
  if p_channel not in ('whatsapp','email','phone','in_person','web') then return; end if;
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;
  perform 1 from private.comun_forwarding_packages
    where id=p_package_id and wallet_id=v_wallet and withdrawn_at is null for update;
  if not found then return; end if;
  select a.* into v_attempt from private.comun_forwarding_attempts a
    where a.package_id=p_package_id and a.channel=p_channel and a.state='prepared';
  if not found then
    select coalesce(max(a.sequence_no),0)+1 into v_sequence
      from private.comun_forwarding_attempts a where a.package_id=p_package_id;
    insert into private.comun_forwarding_attempts(package_id,sequence_no,channel,state)
      values(p_package_id,v_sequence,p_channel,'prepared') returning * into v_attempt;
    insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code)
      values(p_package_id,v_attempt.id,'channel_opened','FORWARDING_CHANNEL_PREPARED_BY_PERSON');
  end if;
  update private.comun_forwarding_packages set state='forwarding_prepared',updated_at=now()
    where id=p_package_id;
  update private.comun_participation_wallet_items wi set
    presentation_state='Encaminhamento preparado',action_required='Confirmar se conseguiu enviar',updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=p_package_id and wi.wallet_id=p.wallet_id
    and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null;
  return query select v_attempt.id,v_attempt.state,v_attempt.channel,v_attempt.sequence_no;
end;
$$;

create or replace function public.comun_assisted_forwarding_declare_sent(
  p_token_hash_hex text,p_attempt_id uuid,p_sent boolean
)
returns table(attempt_id uuid,attempt_state text,due_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid;
  v_attempt private.comun_forwarding_attempts%rowtype;
  v_state text;
  v_due timestamptz;
begin
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;
  select a.* into v_attempt from private.comun_forwarding_attempts a
    join private.comun_forwarding_packages p on p.id=a.package_id
    where a.id=p_attempt_id and p.wallet_id=v_wallet and p.withdrawn_at is null for update of a;
  if not found or v_attempt.state<>'prepared' then return; end if;
  v_state:=case when p_sent then 'person_declared_sent' else 'abandoned' end;
  v_due:=case when p_sent then now()+interval '72 hours' else null end;
  update private.comun_forwarding_attempts set state=v_state,declared_at=now(),due_at=v_due,updated_at=now()
    where id=p_attempt_id;
  update private.comun_forwarding_packages set
    state=case when p_sent then 'waiting_response' else 'ready_for_forwarding' end,updated_at=now()
    where id=v_attempt.package_id;
  update private.comun_bus_relata_intakes b set
    state=case when p_sent then 'waiting_response' else 'forwarding_prepared' end,updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and p.source_domain='bus' and b.id=p.bus_intake_id;
  update private.comun_participation_wallet_items wi set
    presentation_state=case when p_sent then 'Aguardando retorno' else 'Pronto para encaminhar' end,
    action_required=case when p_sent then 'Acompanhar retorno' else 'Preparar encaminhamento' end,
    updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and wi.wallet_id=p.wallet_id
    and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code)
    values(v_attempt.package_id,p_attempt_id,
      case when p_sent then 'person_declared_sent' else 'not_sent' end,
      case when p_sent then 'FORWARDING_PERSON_DECLARED_SENT' else 'FORWARDING_PERSON_DID_NOT_SEND' end);
  return query select p_attempt_id,v_state,v_due;
end;
$$;

create or replace function public.comun_assisted_forwarding_withdraw(
  p_token_hash_hex text,p_package_id uuid
)
returns boolean
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare v_wallet uuid; v_package private.comun_forwarding_packages%rowtype;
begin
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return false; end if;
  select * into v_package from private.comun_forwarding_packages
    where id=p_package_id and wallet_id=v_wallet and withdrawn_at is null for update;
  if not found then return false; end if;
  update private.comun_forwarding_attempts set state='abandoned',updated_at=now()
    where package_id=p_package_id and state='prepared';
  update private.comun_forwarding_packages set
    state='withdrawn',withdrawn_at=now(),updated_at=now()
    where id=p_package_id;
  update private.comun_bus_relata_intakes set
    state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now()),updated_at=now()
    where id=v_package.bus_intake_id and v_package.source_domain='bus';
  update private.comun_participation_wallet_items set
    presentation_state='Retirado',action_required=null,updated_at=now()
    where wallet_id=v_wallet and subject_ref=v_package.relata_case_id::text
      and item_type='relata_report' and archived_at is null;
  insert into private.comun_forwarding_events(package_id,event_type,result_code)
    values(p_package_id,'forwarding_withdrawn','FORWARDING_WITHDRAWN_BY_PERSON');
  return true;
end;
$$;

create or replace function public.comun_assisted_forwarding_record_response(
  p_token_hash_hex text,p_attempt_id uuid,p_response_note text,
  p_official_protocol text,p_resolved boolean
)
returns table(attempt_id uuid,attempt_state text)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare v_wallet uuid; v_attempt private.comun_forwarding_attempts%rowtype;
begin
  if char_length(trim(coalesce(p_response_note,''))) not between 1 and 600
    or char_length(coalesce(p_official_protocol,''))>240 then return; end if;
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;
  select a.* into v_attempt from private.comun_forwarding_attempts a
    join private.comun_forwarding_packages p on p.id=a.package_id
    where a.id=p_attempt_id and p.wallet_id=v_wallet
      and a.state in ('person_declared_sent','no_response') for update of a;
  if not found then return; end if;
  update private.comun_forwarding_attempts set
    state='responded',response_note=trim(p_response_note),
    official_protocol=nullif(trim(p_official_protocol),''),responded_at=now(),updated_at=now()
    where id=p_attempt_id;
  update private.comun_forwarding_packages set state='responded',updated_at=now()
    where id=v_attempt.package_id;
  update private.comun_bus_relata_intakes b set state='responded',updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and p.source_domain='bus' and b.id=p.bus_intake_id;
  update private.comun_participation_wallet_items wi set
    presentation_state='Resposta registrada',action_required=null,updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and wi.wallet_id=p.wallet_id
    and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code)
    values(v_attempt.package_id,p_attempt_id,'response_recorded',
      case when p_resolved then 'FORWARDING_RESPONSE_RESOLVED' else 'FORWARDING_RESPONSE_NOT_RESOLVED' end);
  return query select p_attempt_id,'responded'::text;
end;
$$;

revoke all on function public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.comun_relata_classification_transition(text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function private.comun_assisted_wallet_id(text) from public,anon,authenticated;
revoke all on function public.comun_essential_wallet_mark_ready(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_essential_assisted_prepare(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_assisted_wallet_item_category(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_list(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_open(text,uuid,text) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_declare_sent(text,uuid,boolean) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_record_response(text,uuid,text,text,boolean) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_withdraw(text,uuid) from public,anon,authenticated;
grant execute on function public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text) to service_role;
grant execute on function public.comun_relata_classification_transition(text,text,text,text,jsonb) to service_role;
grant execute on function public.comun_essential_wallet_mark_ready(text,uuid) to service_role;
grant execute on function public.comun_essential_assisted_prepare(text,uuid) to service_role;
grant execute on function public.comun_assisted_wallet_item_category(text,uuid) to service_role;
grant execute on function public.comun_assisted_forwarding_list(text,uuid) to service_role;
grant execute on function public.comun_assisted_forwarding_open(text,uuid,text) to service_role;
grant execute on function public.comun_assisted_forwarding_declare_sent(text,uuid,boolean) to service_role;
grant execute on function public.comun_assisted_forwarding_record_response(text,uuid,text,text,boolean) to service_role;
grant execute on function public.comun_assisted_forwarding_withdraw(text,uuid) to service_role;

commit;
