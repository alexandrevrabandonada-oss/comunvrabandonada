begin;

alter table private.comun_forwarding_packages
  drop constraint comun_forwarding_packages_source_domain_check,
  drop constraint comun_forwarding_packages_source_reference_check;

alter table private.comun_forwarding_packages
  add column policy_identifier text,
  add column policy_version integer,
  add column disclosure_manifest jsonb not null default '{}'::jsonb,
  add column content_withdrawn_at timestamptz,
  add constraint comun_forwarding_packages_source_domain_check
    check (source_domain in ('bus','essential_service','sensitive_service')),
  add constraint comun_forwarding_packages_source_reference_check
    check (
      (source_domain='bus' and bus_intake_id is not null)
      or (source_domain in ('essential_service','sensitive_service') and bus_intake_id is null)
    ),
  add constraint comun_forwarding_packages_sensitive_policy_check
    check (
      (
        source_domain<>'sensitive_service'
        and policy_identifier is null
        and policy_version is null
        and disclosure_manifest='{}'::jsonb
        and content_withdrawn_at is null
      )
      or (
        source_domain='sensitive_service'
        and policy_identifier in (
          'health_minimal_v1',
          'education_minimal_v1',
          'child_protection_channel_only_v1'
        )
        and policy_version=1
        and jsonb_typeof(disclosure_manifest)='object'
        and disclosure_manifest->>'policy'=policy_identifier
        and jsonb_typeof(disclosure_manifest->'channelOnly')='boolean'
        and (disclosure_manifest - array[
          'policy','includeIssueType','includeUnitLabel','includeNetworkLabel',
          'includeApproximatePeriod','includePersonAuthoredSummary','channelOnly'
        ]::text[])='{}'::jsonb
      )
    );

create or replace function public.comun_sensitive_wallet_item_context(
  p_token_hash_hex text,p_wallet_item_id uuid
)
returns table(category text,issue_type text,immediate_danger boolean)
language sql stable security definer set search_path=pg_catalog,private,public as $$
  select c.category,
    case c.category
      when 'public_health' then nullif(c.routing_decision->>'healthIssueType','')
      when 'public_education' then nullif(c.routing_decision->>'educationIssueType','')
      else nullif(c.routing_decision->>'childProtectionIssueType','') end,
    coalesce((c.routing_decision->>'immediateDanger')::boolean,false)
  from private.comun_participation_wallet_items wi
  join public.comun_relata_cases c on c.id=wi.subject_ref::uuid
  where wi.id=p_wallet_item_id
    and wi.wallet_id=private.comun_assisted_wallet_id(p_token_hash_hex)
    and wi.item_type='relata_report' and wi.archived_at is null
    and c.category in ('public_health','public_education','child_protection')
    and c.state<>'withdrawn';
$$;

create or replace function public.comun_sensitive_assisted_prepare(
  p_token_hash_hex text,
  p_wallet_item_id uuid,
  p_include_issue_type boolean,
  p_include_unit_label boolean,
  p_unit_label text,
  p_include_network_label boolean,
  p_network_label text,
  p_include_approximate_period boolean,
  p_approximate_period text,
  p_include_person_authored_summary boolean,
  p_person_authored_summary text,
  p_authorization_confirmed boolean
)
returns table(
  package_id uuid,
  state text,
  category text,
  policy_identifier text,
  disclosure_manifest jsonb,
  subject text,
  institutional_text text,
  response_expectation text
)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid;
  v_case public.comun_relata_cases%rowtype;
  v_package private.comun_forwarding_packages%rowtype;
  v_policy text;
  v_issue_type text;
  v_issue_label text;
  v_subject text;
  v_body text;
  v_manifest jsonb;
  v_channel_only boolean;
  v_unit text:=nullif(trim(coalesce(p_unit_label,'')),'');
  v_network text:=nullif(trim(coalesce(p_network_label,'')),'');
  v_period text:=nullif(trim(coalesce(p_approximate_period,'')),'');
  v_summary text:=nullif(trim(coalesce(p_person_authored_summary,'')),'');
begin
  if p_authorization_confirmed is not true then return; end if;
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;

  select c.* into v_case
  from private.comun_participation_wallet_items wi
  join public.comun_relata_cases c on c.id=wi.subject_ref::uuid
  where wi.id=p_wallet_item_id and wi.wallet_id=v_wallet
    and wi.item_type='relata_report' and wi.archived_at is null
    and c.category in ('public_health','public_education','child_protection')
    and c.state<>'withdrawn';
  if not found then return; end if;

  if char_length(coalesce(v_unit,''))>120
    or char_length(coalesce(v_network,''))>40
    or char_length(coalesce(v_period,''))>80
    or char_length(coalesce(v_summary,''))>1000 then return; end if;

  v_policy:=case v_case.category
    when 'public_health' then 'health_minimal_v1'
    when 'public_education' then 'education_minimal_v1'
    else 'child_protection_channel_only_v1' end;
  v_channel_only:=v_case.category='child_protection';

  if v_channel_only and (
    coalesce(p_include_issue_type,false)
    or coalesce(p_include_unit_label,false)
    or coalesce(p_include_network_label,false)
    or coalesce(p_include_approximate_period,false)
    or coalesce(p_include_person_authored_summary,false)
    or v_unit is not null or v_network is not null or v_period is not null or v_summary is not null
  ) then return; end if;

  if p_include_unit_label is true and v_unit is null then return; end if;
  if p_include_network_label is true and v_network is null then return; end if;
  if p_include_approximate_period is true and v_period is null then return; end if;
  if p_include_person_authored_summary is true and v_summary is null then return; end if;
  if p_include_unit_label is not true then v_unit:=null; end if;
  if p_include_network_label is not true then v_network:=null; end if;
  if p_include_approximate_period is not true then v_period:=null; end if;
  if p_include_person_authored_summary is not true then v_summary:=null; end if;

  v_issue_type:=case v_case.category
    when 'public_health' then nullif(v_case.routing_decision->>'healthIssueType','')
    when 'public_education' then nullif(v_case.routing_decision->>'educationIssueType','')
    else null end;
  v_issue_label:=case v_case.category||':'||coalesce(v_issue_type,'')
    when 'public_health:access_or_waiting' then 'Atendimento ou demora'
    when 'public_health:exam_or_procedure' then 'Exame, procedimento ou cirurgia'
    when 'public_health:medicine_or_supply' then 'Medicamento ou insumo'
    when 'public_health:staff_or_service_availability' then 'Falta de profissional ou serviço'
    when 'public_health:facility_or_accessibility' then 'Estrutura ou acessibilidade'
    when 'public_health:care_conduct' then 'Conduta no atendimento'
    when 'public_health:transfer_or_health_transport' then 'Transferência ou transporte sanitário'
    when 'public_health:information_or_followup' then 'Informação ou acompanhamento'
    when 'public_health:other_health_service' then 'Outro problema no SUS'
    when 'public_education:staff_or_service_availability' then 'Falta de profissional ou serviço'
    when 'public_education:infrastructure_or_climate' then 'Estrutura ou climatização'
    when 'public_education:school_meals_or_supplies' then 'Merenda, material ou insumo'
    when 'public_education:school_transport_or_access' then 'Transporte ou acesso à escola'
    when 'public_education:accessibility_or_inclusion' then 'Acessibilidade ou inclusão'
    when 'public_education:enrollment_or_attendance' then 'Matrícula, vaga ou permanência'
    when 'public_education:discrimination_or_bullying' then 'Discriminação ou bullying'
    when 'public_education:information_or_management' then 'Informação ou gestão escolar'
    when 'public_education:other_education_service' then 'Outro problema na Educação'
    else null end;
  if p_include_issue_type is true and v_issue_label is null then return; end if;

  v_manifest:=jsonb_build_object(
    'policy',v_policy,
    'includeIssueType',coalesce(p_include_issue_type,false),
    'includeUnitLabel',coalesce(p_include_unit_label,false),
    'includeNetworkLabel',coalesce(p_include_network_label,false),
    'includeApproximatePeriod',coalesce(p_include_approximate_period,false),
    'includePersonAuthoredSummary',coalesce(p_include_person_authored_summary,false),
    'channelOnly',v_channel_only
  );
  v_subject:=case v_case.category
    when 'public_health' then 'Manifestação sobre Saúde pública'
    when 'public_education' then 'Manifestação sobre Educação pública'
    else 'Canal de proteção escolhido pela pessoa' end;
  v_body:=case when v_channel_only
    then 'Conteúdo será informado diretamente pela pessoa ao canal.'
    else 'Quero registrar uma manifestação sobre '
      ||case when v_case.category='public_health' then 'Saúde pública.' else 'Educação pública.' end
      ||case when p_include_issue_type is true then E'\nTipo do problema: '||v_issue_label else '' end
      ||case when v_unit is not null then E'\nUnidade informada para este encaminhamento: '||v_unit else '' end
      ||case when v_network is not null then E'\nRede informada para este encaminhamento: '||v_network else '' end
      ||case when v_period is not null then E'\nPeríodo aproximado: '||v_period else '' end
      ||case when v_summary is not null then E'\nMensagem escrita para este encaminhamento: '||v_summary else '' end
    end;

  perform pg_advisory_xact_lock(hashtextextended(v_case.id::text,4812));
  select * into v_package from private.comun_forwarding_packages
    where wallet_id=v_wallet and relata_case_id=v_case.id and withdrawn_at is null for update;
  if found then
    if v_package.source_domain<>'sensitive_service'
      or v_package.disclosure_manifest<>v_manifest
      or v_package.institutional_text<>v_body then return; end if;
    return query select v_package.id,v_package.state,v_case.category,
      v_package.policy_identifier,v_package.disclosure_manifest,v_package.subject,
      v_package.institutional_text,v_package.response_expectation;
    return;
  end if;

  insert into private.comun_forwarding_packages(
    wallet_id,relata_case_id,bus_intake_id,source_domain,state,subject,
    institutional_text,response_expectation,policy_identifier,policy_version,
    disclosure_manifest
  ) values(
    v_wallet,v_case.id,null,'sensitive_service','ready_for_forwarding',v_subject,
    v_body,'Nenhum prazo institucional foi presumido pelo COMUN.',v_policy,1,
    v_manifest
  ) returning * into v_package;
  update private.comun_participation_wallet_items set
    presentation_state='Encaminhamento preparado',
    action_required='Revisar e abrir o canal escolhido',updated_at=now()
  where id=p_wallet_item_id and wallet_id=v_wallet;
  insert into private.comun_forwarding_events(package_id,event_type,result_code)
    values(v_package.id,'package_prepared','FORWARDING_SENSITIVE_PACKAGE_PREPARED');
  return query select v_package.id,v_package.state,v_case.category,
    v_package.policy_identifier,v_package.disclosure_manifest,v_package.subject,
    v_package.institutional_text,v_package.response_expectation;
end;
$$;

create or replace function public.comun_sensitive_assisted_list(
  p_token_hash_hex text,p_wallet_item_id uuid
)
returns table(
  package_id uuid,state text,category text,policy_identifier text,
  disclosure_manifest jsonb,subject text,institutional_text text,
  response_expectation text,attempts jsonb
)
language sql stable security definer set search_path=pg_catalog,private,public as $$
  select p.id,p.state,c.category,p.policy_identifier,p.disclosure_manifest,
    p.subject,p.institutional_text,p.response_expectation,
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
    and wi.id=p_wallet_item_id and p.source_domain='sensitive_service'
    and p.withdrawn_at is null;
$$;

create or replace function public.comun_assisted_forwarding_declare_sent(
  p_token_hash_hex text,p_attempt_id uuid,p_sent boolean
)
returns table(attempt_id uuid,attempt_state text,due_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid;
  v_attempt private.comun_forwarding_attempts%rowtype;
  v_source_domain text;
  v_state text;
  v_due timestamptz;
begin
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;
  select a.* into v_attempt
  from private.comun_forwarding_attempts a
  join private.comun_forwarding_packages p on p.id=a.package_id
  where a.id=p_attempt_id and p.wallet_id=v_wallet and p.withdrawn_at is null
  for update of a;
  if not found or v_attempt.state<>'prepared' then return; end if;
  select source_domain into v_source_domain
  from private.comun_forwarding_packages where id=v_attempt.package_id;
  v_state:=case when p_sent then 'person_declared_sent' else 'abandoned' end;
  v_due:=case when p_sent and v_source_domain='bus' then now()+interval '72 hours' else null end;
  update private.comun_forwarding_attempts set
    state=v_state,declared_at=now(),due_at=v_due,updated_at=now()
  where id=p_attempt_id;
  update private.comun_forwarding_packages set
    state=case when p_sent then 'waiting_response' else 'ready_for_forwarding' end,
    updated_at=now() where id=v_attempt.package_id;
  update private.comun_bus_relata_intakes b set
    state=case when p_sent then 'waiting_response' else 'forwarding_prepared' end,
    updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and p.source_domain='bus' and b.id=p.bus_intake_id;
  update private.comun_participation_wallet_items wi set
    presentation_state=case when p_sent then 'Aguardando retorno' else 'Pronto para encaminhar' end,
    action_required=case when p_sent then 'Acompanhar retorno' else 'Preparar encaminhamento' end,
    updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and wi.wallet_id=p.wallet_id
    and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report'
    and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code)
    values(v_attempt.package_id,p_attempt_id,
      case when p_sent then 'person_declared_sent' else 'not_sent' end,
      case when p_sent then 'FORWARDING_PERSON_DECLARED_SENT' else 'FORWARDING_PERSON_DID_NOT_SEND' end);
  return query select p_attempt_id,v_state,v_due;
end;
$$;

create or replace function public.comun_sensitive_assisted_record_response(
  p_token_hash_hex text,p_attempt_id uuid,p_response_outcome text,
  p_response_note text,p_official_protocol text
)
returns table(attempt_id uuid,attempt_state text)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid;
  v_attempt private.comun_forwarding_attempts%rowtype;
  v_category text;
  v_note text:=nullif(trim(coalesce(p_response_note,'')),'');
  v_stored_note text;
begin
  if p_response_outcome not in ('return_received','no_return','situation_forwarded','prefer_not_to_record_details')
    or char_length(coalesce(v_note,''))>280
    or char_length(coalesce(p_official_protocol,''))>240 then return; end if;
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;
  select a.* into v_attempt
  from private.comun_forwarding_attempts a
  join private.comun_forwarding_packages p on p.id=a.package_id
  join public.comun_relata_cases c on c.id=p.relata_case_id
  where a.id=p_attempt_id and p.wallet_id=v_wallet
    and p.source_domain='sensitive_service' and p.withdrawn_at is null
    and a.state in ('person_declared_sent','no_response') for update of a;
  if not found then return; end if;
  select c.category into v_category
  from private.comun_forwarding_packages p
  join public.comun_relata_cases c on c.id=p.relata_case_id
  where p.id=v_attempt.package_id;
  if v_category='child_protection' and v_note is not null then return; end if;
  v_stored_note:=case when v_category='child_protection' then p_response_outcome
    else coalesce(v_note,p_response_outcome) end;
  update private.comun_forwarding_attempts set
    state='responded',response_note=v_stored_note,
    official_protocol=nullif(trim(coalesce(p_official_protocol,'')),''),
    responded_at=now(),updated_at=now() where id=p_attempt_id;
  update private.comun_forwarding_packages set state='responded',updated_at=now()
    where id=v_attempt.package_id;
  update private.comun_participation_wallet_items wi set
    presentation_state='Resposta registrada',action_required=null,updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and wi.wallet_id=p.wallet_id
    and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report'
    and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code)
    values(v_attempt.package_id,p_attempt_id,'response_recorded','FORWARDING_SENSITIVE_RESPONSE_RECORDED');
  return query select p_attempt_id,'responded'::text;
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
      and p.source_domain in ('bus','essential_service')
      and p.withdrawn_at is null
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
  update private.comun_forwarding_attempts set
    state=case when state='prepared' then 'abandoned' else state end,
    official_protocol=case when v_package.source_domain='sensitive_service' then null else official_protocol end,
    response_note=case when v_package.source_domain='sensitive_service' then null else response_note end,
    updated_at=now() where package_id=p_package_id;
  update private.comun_forwarding_packages set
    state='withdrawn',withdrawn_at=now(),
    subject=case when source_domain='sensitive_service' then 'Encaminhamento sensível retirado' else subject end,
    institutional_text=case when source_domain='sensitive_service' then 'Conteúdo retirado pela pessoa.' else institutional_text end,
    disclosure_manifest=case when source_domain='sensitive_service' then jsonb_build_object(
      'policy',policy_identifier,'includeIssueType',false,'includeUnitLabel',false,
      'includeNetworkLabel',false,'includeApproximatePeriod',false,
      'includePersonAuthoredSummary',false,
      'channelOnly',policy_identifier='child_protection_channel_only_v1'
    ) else disclosure_manifest end,
    content_withdrawn_at=case when source_domain='sensitive_service' then now() else content_withdrawn_at end,
    updated_at=now() where id=p_package_id;
  update private.comun_bus_relata_intakes set
    state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now()),updated_at=now()
    where id=v_package.bus_intake_id and v_package.source_domain='bus';
  update private.comun_participation_wallet_items set
    presentation_state='Retirado',action_required=null,updated_at=now()
    where wallet_id=v_wallet and subject_ref=v_package.relata_case_id::text
      and item_type='relata_report' and archived_at is null;
  insert into private.comun_forwarding_events(package_id,event_type,result_code)
    values(p_package_id,'forwarding_withdrawn',case
      when v_package.source_domain='sensitive_service' then 'FORWARDING_SENSITIVE_CONTENT_WITHDRAWN'
      else 'FORWARDING_WITHDRAWN_BY_PERSON' end);
  return true;
end;
$$;

revoke all on function public.comun_sensitive_assisted_prepare(text,uuid,boolean,boolean,text,boolean,text,boolean,text,boolean,text,boolean) from public,anon,authenticated;
revoke all on function public.comun_sensitive_wallet_item_context(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_sensitive_assisted_list(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_sensitive_assisted_record_response(text,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_record_response(text,uuid,text,text,boolean) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_declare_sent(text,uuid,boolean) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_withdraw(text,uuid) from public,anon,authenticated;
grant execute on function public.comun_sensitive_assisted_prepare(text,uuid,boolean,boolean,text,boolean,text,boolean,text,boolean,text,boolean) to service_role;
grant execute on function public.comun_sensitive_wallet_item_context(text,uuid) to service_role;
grant execute on function public.comun_sensitive_assisted_list(text,uuid) to service_role;
grant execute on function public.comun_sensitive_assisted_record_response(text,uuid,text,text,text) to service_role;
grant execute on function public.comun_assisted_forwarding_record_response(text,uuid,text,text,boolean) to service_role;
grant execute on function public.comun_assisted_forwarding_declare_sent(text,uuid,boolean) to service_role;
grant execute on function public.comun_assisted_forwarding_withdraw(text,uuid) to service_role;

commit;
