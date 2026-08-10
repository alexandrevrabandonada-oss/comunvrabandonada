begin;

alter table public.comun_relata_cases
  drop constraint comun_relata_cases_category_check;

alter table public.comun_relata_cases
  add constraint comun_relata_cases_category_check
  check (category in (
    'public_lighting','power_distribution','water_supply','electrical_hazard',
    'active_fire','smoke_or_environmental_trace','sidewalk_accessibility',
    'waste_or_debris','public_transport','public_health','public_education',
    'child_protection','workplace','environmental_pollution','urban_flooding',
    'stormwater_drainage','tree_hazard','other'
  ));

alter table private.comun_relata_classification_events
  drop constraint comun_relata_classification_events_next_category_check;

alter table private.comun_relata_classification_events
  add constraint comun_relata_classification_events_next_category_check
  check (next_category in (
    'water_supply','power_distribution','public_lighting','active_fire',
    'smoke_or_environmental_trace','environmental_pollution','waste_or_debris',
    'urban_flooding','stormwater_drainage','tree_hazard','public_health',
    'public_education','child_protection'
  ));

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
  routing_version text;
  health_issue_type text;
  education_issue_type text;
  child_safety_signal boolean;
  child_protection_issue_type text;
  immediate_danger boolean;
begin
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{32,160}$'
    or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$'
    or (p_original_text is not null and char_length(trim(p_original_text)) not between 8 and 600)
  then
    raise exception using errcode='22023', message='COMUN_RELATA_INVALID_PROOF';
  end if;

  routing_version := coalesce(nullif(p_decision->>'routingVersion',''),p_rule_version);
  health_issue_type := nullif(p_decision->>'healthIssueType','');
  education_issue_type := nullif(p_decision->>'educationIssueType','');
  child_safety_signal := coalesce((p_decision->>'childSafetySignal')::boolean,false);
  child_protection_issue_type := nullif(p_decision->>'childProtectionIssueType','');
  immediate_danger := case
    when p_decision->'immediateDanger' = 'true'::jsonb then true
    when p_decision->'immediateDanger' = 'false'::jsonb then false
    else null
  end;
  if jsonb_typeof(coalesce(p_answers,'{}'::jsonb)) <> 'object'
    or coalesce(p_answers,'{}'::jsonb)
      - 'homes_power' - 'smoke_active' - 'flood_active_risk' - 'tree_state'
      - 'health_issue_type' - 'education_issue_type' - 'child_immediate_danger'
      - 'blocked' - 'line' - 'direction' - 'unit' - 'school_type' <> '{}'::jsonb
    or (coalesce(p_answers,'{}'::jsonb) ? 'homes_power' and coalesce(p_answers,'{}'::jsonb)->>'homes_power' not in ('sim','nao'))
    or (coalesce(p_answers,'{}'::jsonb) ? 'smoke_active' and coalesce(p_answers,'{}'::jsonb)->>'smoke_active' not in ('sim','nao','nao_sei'))
    or (coalesce(p_answers,'{}'::jsonb) ? 'flood_active_risk' and coalesce(p_answers,'{}'::jsonb)->>'flood_active_risk' not in ('sim','nao','nao_sei'))
    or (coalesce(p_answers,'{}'::jsonb) ? 'tree_state' and coalesce(p_answers,'{}'::jsonb)->>'tree_state' not in ('caiu','em_pe','nao_sei'))
    or (coalesce(p_answers,'{}'::jsonb) ? 'child_immediate_danger' and coalesce(p_answers,'{}'::jsonb)->>'child_immediate_danger' not in ('sim','nao','nao_sei'))
    or (coalesce(p_answers,'{}'::jsonb) ? 'health_issue_type' and coalesce(p_answers,'{}'::jsonb)->>'health_issue_type' not in (
      'access_or_waiting','exam_or_procedure','medicine_or_supply',
      'staff_or_service_availability','facility_or_accessibility','care_conduct',
      'transfer_or_health_transport','information_or_followup','other_health_service'
    ))
    or (coalesce(p_answers,'{}'::jsonb) ? 'education_issue_type' and coalesce(p_answers,'{}'::jsonb)->>'education_issue_type' not in (
      'staff_or_service_availability','infrastructure_or_climate','school_meals_or_supplies',
      'school_transport_or_access','accessibility_or_inclusion','enrollment_or_attendance',
      'discrimination_or_bullying','information_or_management','other_education_service'
    ))
    or jsonb_typeof(coalesce(p_decision,'{}'::jsonb)) <> 'object'
    or coalesce(p_decision,'{}'::jsonb) ? 'matchedSignals'
    or routing_version not in (
      'relata-routing-v1','relata-routing-v2-environmental',
      'relata-routing-v3-urban-incidents','comun-health-service-routing-v1',
      'comun-education-service-routing-v1','comun-child-protection-routing-v1'
    )
    or octet_length(convert_to(coalesce(p_decision,'{}'::jsonb)::text,'utf8')) > 4096
  then
    raise exception using errcode='22023', message='COMUN_RELATA_INVALID_TRIAGE';
  end if;

  if p_category not in (
      'public_lighting','power_distribution','water_supply','electrical_hazard',
      'active_fire','smoke_or_environmental_trace','sidewalk_accessibility',
      'waste_or_debris','public_transport','public_health','public_education',
      'child_protection','workplace','environmental_pollution','urban_flooding',
      'stormwater_drainage','tree_hazard','other'
    )
    or p_urgency not in ('routine','attention','urgent','emergency')
    or p_rule_version <> 'relata-routing-v1'
    or p_privacy_class not in ('public_safe','public_after_sanitization','restricted','sensitive','high_risk')
    or p_consent_version <> 'relata-consent-v1'
    or (p_category='public_health' and (
      routing_version <> 'comun-health-service-routing-v1'
      or health_issue_type is null
      or health_issue_type not in (
        'access_or_waiting','exam_or_procedure','medicine_or_supply',
        'staff_or_service_availability','facility_or_accessibility','care_conduct',
        'transfer_or_health_transport','information_or_followup','other_health_service'
      )
      or p_privacy_class not in ('sensitive','high_risk')
      or p_decision->>'publication' is distinct from 'never_automatic'
    ))
    or (p_category<>'public_health' and (
      routing_version='comun-health-service-routing-v1'
      or health_issue_type is not null
    ))
    or (p_category='public_education' and (
      routing_version <> 'comun-education-service-routing-v1'
      or education_issue_type is null
      or education_issue_type not in (
        'staff_or_service_availability','infrastructure_or_climate','school_meals_or_supplies',
        'school_transport_or_access','accessibility_or_inclusion','enrollment_or_attendance',
        'discrimination_or_bullying','information_or_management','other_education_service'
      )
      or p_privacy_class not in ('restricted','sensitive','high_risk')
      or p_decision->>'publication' is distinct from 'never_automatic'
      or p_decision->'requiresHumanReview' is distinct from 'true'::jsonb
    ))
    or (p_category<>'public_education' and (
      routing_version='comun-education-service-routing-v1'
      or education_issue_type is not null
      or p_decision ? 'childSafetySignal'
    ))
    or (p_category='child_protection' and (
      routing_version <> 'comun-child-protection-routing-v1'
      or child_protection_issue_type not in (
        'immediate_danger','violence_or_abuse_concern',
        'neglect_or_abandonment_concern','exploitation_or_rights_violation',
        'institutional_protection_failure','other_child_protection'
      )
      or not (p_decision ? 'immediateDanger')
      or p_privacy_class <> 'high_risk'
      or p_decision->>'publication' is distinct from 'never_automatic'
      or p_decision->'requiresHumanReview' is distinct from 'true'::jsonb
      or (immediate_danger is true and p_urgency <> 'emergency')
      or (immediate_danger is not true and p_urgency not in ('urgent','emergency'))
    ))
    or (p_category<>'child_protection' and (
      routing_version='comun-child-protection-routing-v1'
      or child_protection_issue_type is not null
      or p_decision ? 'immediateDanger'
    ))
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
      'routingVersion',p_rule_version,'source','photo_first_private_capture',
      'captureBasis','photo_only','semanticTextState','absent',
      'captureState','captured_private','requiresEnrichment',true,
      'requiresHumanReview',true,'confidence','low',
      'agencyKind','community_review','publication','never_automatic',
      'automaticForwarding',false
    );
  else
    decision := jsonb_build_object(
      'category',p_category,'urgency',p_urgency,'ruleVersion',p_rule_version,
      'routingVersion',routing_version,'source','deterministic_server_route',
      'requiresHumanReview',coalesce((p_decision->>'requiresHumanReview')::boolean,false),
      'confidence',case when p_decision->>'confidence' in ('high','medium','low') then p_decision->>'confidence' else 'low' end,
      'publication','never_automatic','automaticForwarding',false
    ) || case when p_category='public_health'
      then jsonb_build_object('healthIssueType',health_issue_type)
      else '{}'::jsonb
    end || case when p_category='public_education'
      then jsonb_build_object(
        'educationIssueType',education_issue_type,
        'childSafetySignal',child_safety_signal
      )
      else '{}'::jsonb
    end || case when p_category='child_protection'
      then jsonb_build_object(
        'childProtectionIssueType',child_protection_issue_type,
        'immediateDanger',to_jsonb(immediate_danger)
      )
      else '{}'::jsonb
    end;
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
    case when p_category in ('public_education','child_protection') or p_privacy_class in ('sensitive','high_risk') then 'sensitive' else 'private_unsubmitted' end,
    now()+case when p_category in ('public_education','child_protection') or p_privacy_class in ('sensitive','high_risk') then interval '30 days' else interval '90 days' end
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
language plpgsql
security definer
set search_path=pg_catalog,private,public
as $$
declare
  v_context record;
  v_report private.comun_relata_reports%rowtype;
  v_decision jsonb;
  v_urgency text;
  v_routing_version text;
  v_health_issue_type text;
  v_education_issue_type text;
  v_child_safety_signal boolean;
  v_child_protection_issue_type text;
  v_immediate_danger boolean;
  v_privacy_class text;
  v_previous_text_absent boolean;
begin
  v_urgency := case when p_decision->>'urgency' in ('routine','attention','urgent','emergency') then p_decision->>'urgency' else null end;
  v_routing_version := coalesce(nullif(p_decision->>'routingVersion',''),'relata-routing-v1');
  v_health_issue_type := nullif(p_decision->>'healthIssueType','');
  v_education_issue_type := nullif(p_decision->>'educationIssueType','');
  v_child_safety_signal := coalesce((p_decision->>'childSafetySignal')::boolean,false);
  v_child_protection_issue_type := nullif(p_decision->>'childProtectionIssueType','');
  v_immediate_danger := case
    when p_decision->'immediateDanger' = 'true'::jsonb then true
    when p_decision->'immediateDanger' = 'false'::jsonb then false
    else null
  end;
  v_privacy_class := nullif(p_decision->>'privacyClass','');
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.case_state='withdrawn'
    or v_context.category not in ('other','public_education')
    or (v_context.category='public_education' and p_category<>'child_protection')
    or p_category not in (
      'water_supply','power_distribution','public_lighting','active_fire',
      'smoke_or_environmental_trace','environmental_pollution','waste_or_debris',
      'urban_flooding','stormwater_drainage','tree_hazard','public_health',
      'public_education','child_protection'
    )
    or v_urgency is null
    or v_routing_version not in (
      'relata-routing-v1','relata-routing-v2-environmental',
      'relata-routing-v3-urban-incidents','comun-health-service-routing-v1',
      'comun-education-service-routing-v1','comun-child-protection-routing-v1'
    )
    or (p_category='public_health' and (
      v_routing_version<>'comun-health-service-routing-v1'
      or v_health_issue_type is null
      or v_health_issue_type not in (
        'access_or_waiting','exam_or_procedure','medicine_or_supply',
        'staff_or_service_availability','facility_or_accessibility','care_conduct',
        'transfer_or_health_transport','information_or_followup','other_health_service'
      )
      or v_privacy_class not in ('sensitive','high_risk')
      or p_decision->>'publication' is distinct from 'never_automatic'
    ))
    or (p_category<>'public_health' and (
      v_routing_version='comun-health-service-routing-v1'
      or v_health_issue_type is not null
    ))
    or (p_category='public_education' and (
      v_routing_version<>'comun-education-service-routing-v1'
      or v_education_issue_type is null
      or v_education_issue_type not in (
        'staff_or_service_availability','infrastructure_or_climate','school_meals_or_supplies',
        'school_transport_or_access','accessibility_or_inclusion','enrollment_or_attendance',
        'discrimination_or_bullying','information_or_management','other_education_service'
      )
      or v_privacy_class not in ('restricted','sensitive','high_risk')
      or p_decision->>'publication' is distinct from 'never_automatic'
      or p_decision->'requiresHumanReview' is distinct from 'true'::jsonb
    ))
    or (p_category<>'public_education' and (
      v_routing_version='comun-education-service-routing-v1'
      or v_education_issue_type is not null
      or p_decision ? 'childSafetySignal'
    ))
    or (p_category='child_protection' and (
      v_routing_version<>'comun-child-protection-routing-v1'
      or v_child_protection_issue_type not in (
        'immediate_danger','violence_or_abuse_concern',
        'neglect_or_abandonment_concern','exploitation_or_rights_violation',
        'institutional_protection_failure','other_child_protection'
      )
      or not (p_decision ? 'immediateDanger')
      or v_privacy_class<>'high_risk'
      or p_decision->>'publication' is distinct from 'never_automatic'
      or p_decision->'requiresHumanReview' is distinct from 'true'::jsonb
      or (v_immediate_danger is true and v_urgency<>'emergency')
      or (v_immediate_danger is not true and v_urgency not in ('urgent','emergency'))
    ))
    or (p_category<>'child_protection' and (
      v_routing_version='comun-child-protection-routing-v1'
      or v_child_protection_issue_type is not null
      or p_decision ? 'immediateDanger'
    ))
    or coalesce(p_decision,'{}'::jsonb) ? 'matchedSignals'
    or char_length(trim(coalesce(p_original_text,''))) not between 8 and 600
    or jsonb_typeof(coalesce(p_decision,'{}'::jsonb))<>'object'
    or octet_length(convert_to(coalesce(p_decision,'{}'::jsonb)::text,'utf8'))>4096
  then return; end if;

  select * into v_report from private.comun_relata_reports
    where id=v_context.report_id and withdrawn_at is null for update;
  if not found then return; end if;
  v_previous_text_absent := v_report.original_text is null;

  v_decision:=jsonb_build_object(
    'category',p_category,'urgency',v_urgency,'ruleVersion','relata-routing-v1',
    'routingVersion',v_routing_version,'source','person_added_semantic_context',
    'requiresHumanReview',coalesce((p_decision->>'requiresHumanReview')::boolean,false),
    'confidence',case when p_decision->>'confidence' in ('high','medium','low') then p_decision->>'confidence' else 'low' end,
    'publication','never_automatic','automaticForwarding',false
  ) || case when p_category='public_health'
    then jsonb_build_object('healthIssueType',v_health_issue_type)
    else '{}'::jsonb
  end || case when p_category='public_education'
    then jsonb_build_object(
      'educationIssueType',v_education_issue_type,
      'childSafetySignal',v_child_safety_signal
    )
    else '{}'::jsonb
  end || case when p_category='child_protection'
    then jsonb_build_object(
      'childProtectionIssueType',v_child_protection_issue_type,
      'immediateDanger',to_jsonb(v_immediate_danger)
    )
    else '{}'::jsonb
  end;
  update private.comun_relata_reports set
    original_text=case
      when original_text is null then trim(p_original_text)
      else original_text||E'\n\nContexto adicional: '||trim(p_original_text)
    end,
    routing_decision=v_decision,routing_rule_version='relata-routing-v1',
    urgency=v_urgency,
    privacy_class=case when p_category in ('public_health','public_education','child_protection') then v_privacy_class else privacy_class end,
    retention_class=case when p_category in ('public_health','public_education','child_protection') then 'sensitive' else retention_class end,
    review_after=case when p_category in ('public_health','public_education','child_protection') then now()+interval '30 days' else review_after end,
    updated_at=now()
  where id=v_context.report_id;
  update public.comun_relata_cases set
    category=p_category,urgency=v_urgency,routing_decision=v_decision,
    routing_rule_version='relata-routing-v1',updated_at=now()
  where id=v_context.case_id;
  update private.comun_participation_wallet_items set
    category=p_category,
    title_template=case
      when p_category in ('water_supply','power_distribution','public_lighting') then 'Relato de serviço essencial'
      else 'Relato COMUN'
    end,
    presentation_state=case
      when p_category in ('water_supply','power_distribution','public_lighting') then 'Pronto para encaminhar'
      when p_category='child_protection' then 'Guardado com proteção reforçada'
      else 'Guardado'
    end,
    action_required=case
      when p_category in ('water_supply','power_distribution','public_lighting') then 'Preparar encaminhamento'
      else null
    end,
    metadata=case
      when p_category='public_education' then jsonb_build_object(
        'educationIssueType',v_education_issue_type,
        'childSafetySignal',v_child_safety_signal
      )
      when p_category='child_protection' then jsonb_build_object(
        'immediateDanger',coalesce(v_immediate_danger,false)
      )
      else metadata
    end,
    updated_at=now()
  where item_type='relata_report' and subject_ref=v_context.case_id::text and archived_at is null;
  insert into private.comun_relata_classification_events(
    report_id,case_id,previous_category,next_category,event_type,previous_text_absent,actor
  ) values(
    v_context.report_id,v_context.case_id,v_context.category,p_category,
    'person_added_semantic_context',v_previous_text_absent,'person'
  );
  return query select v_context.report_id,v_context.case_id,p_protocol,p_category,v_context.case_state;
end;
$$;

create or replace function public.comun_participation_wallet_attach_relata(
  p_token_hash_hex text,
  p_protocol text,
  p_receipt_secret text
)
returns table(item_id uuid,recovery_needed boolean)
language plpgsql
security definer
set search_path=pg_catalog,private,public
as $$
declare
  w uuid;
  c public.comun_relata_cases%rowtype;
  r private.comun_relata_reports%rowtype;
  i uuid;
  safe_metadata jsonb := '{}'::jsonb;
  education_issue_type text;
begin
  select id into w from private.comun_participation_wallets
    where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  select * into c from public.comun_relata_cases where protocol=p_protocol;
  select * into r from private.comun_relata_reports
    where id=c.report_id
      and receipt_hash=extensions.digest('relata-receipt-v1:'||p_receipt_secret,'sha256');
  if w is null or c.id is null or r.id is null then return; end if;

  if c.category='public_education'
    and c.routing_decision->>'routingVersion'='comun-education-service-routing-v1'
  then
    education_issue_type := nullif(c.routing_decision->>'educationIssueType','');
    if education_issue_type in (
      'staff_or_service_availability','infrastructure_or_climate','school_meals_or_supplies',
      'school_transport_or_access','accessibility_or_inclusion','enrollment_or_attendance',
      'discrimination_or_bullying','information_or_management','other_education_service'
    ) then
      safe_metadata := jsonb_build_object(
        'educationIssueType',education_issue_type,
        'childSafetySignal',coalesce((c.routing_decision->>'childSafetySignal')::boolean,false)
      );
    end if;
  elsif c.category='child_protection'
    and c.routing_decision->>'routingVersion'='comun-child-protection-routing-v1'
  then
    safe_metadata := jsonb_build_object(
      'immediateDanger',coalesce((c.routing_decision->>'immediateDanger')::boolean,false)
    );
  end if;

  insert into private.comun_participation_wallet_items(
    wallet_id,item_type,subject_ref,subject_hash,title_template,category,
    presentation_state,action_required,protocol_masked,source_domain,metadata
  ) values(
    w,'relata_report',c.id::text,
    extensions.digest('wallet-subject-v1:'||p_protocol,'sha256'),
    'Relato COMUN',c.category,
    case when c.category='child_protection' then 'Guardado com proteção reforçada' else 'Guardado' end,
    case when c.category='child_protection' then null else 'Precisa de informação' end,
    left(p_protocol,12)||'••••','relata',safe_metadata
  )
  on conflict(wallet_id,item_type,subject_hash) do update set
    archived_at=null,metadata=excluded.metadata,updated_at=now()
  returning id into i;
  insert into private.comun_participation_wallet_events(
    wallet_id,item_id,event_type,result_code
  ) values(w,i,'item_added','WALLET_RELATA_ATTACHED');
  return query select i,false;
end;
$$;

revoke all on function public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.comun_relata_classification_transition(text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.comun_participation_wallet_attach_relata(text,text,text) from public,anon,authenticated;
grant execute on function public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text) to service_role;
grant execute on function public.comun_relata_classification_transition(text,text,text,text,jsonb) to service_role;
grant execute on function public.comun_participation_wallet_attach_relata(text,text,text) to service_role;

commit;
