begin;

alter table private.comun_forwarding_packages
  drop constraint comun_forwarding_packages_source_domain_check,
  drop constraint comun_forwarding_packages_source_reference_check;

alter table private.comun_forwarding_packages
  add constraint comun_forwarding_packages_source_domain_check
    check (source_domain in ('bus','essential_service','sensitive_service','civic_service')),
  add constraint comun_forwarding_packages_source_reference_check
    check (
      (source_domain='bus' and bus_intake_id is not null)
      or (source_domain in ('essential_service','sensitive_service','civic_service') and bus_intake_id is null)
    );

create or replace function public.comun_civic_wallet_item_context(
  p_token_hash_hex text,
  p_wallet_item_id uuid
)
returns table(
  category text,
  urgency text,
  immediate_danger boolean,
  smoke_active boolean,
  flood_active_risk boolean,
  tree_fall_state text
)
language sql stable security definer
set search_path=pg_catalog,private,public as $$
  select
    c.category,
    c.urgency,
    coalesce((c.routing_decision->>'immediateDanger') in ('true','sim'),false),
    coalesce((c.routing_decision->>'smokeActive') in ('true','sim'),false),
    coalesce((c.routing_decision->>'floodActiveRisk') in ('true','sim'),false),
    nullif(c.routing_decision->>'treeFallState','')
  from private.comun_participation_wallet_items wi
  join public.comun_relata_cases c on c.id=wi.subject_ref::uuid
  where wi.id=p_wallet_item_id
    and wi.wallet_id=private.comun_assisted_wallet_id(p_token_hash_hex)
    and wi.item_type='relata_report'
    and wi.archived_at is null
    and c.state<>'withdrawn'
    and c.category in (
      'waste_or_debris','smoke_or_environmental_trace',
      'environmental_pollution','stormwater_drainage',
      'urban_flooding','tree_hazard'
    )
    and c.urgency not in ('urgent','emergency')
    and coalesce((c.routing_decision->>'immediateDanger') in ('true','sim'),false)=false
    and coalesce((c.routing_decision->>'smokeActive') in ('true','sim'),false)=false
    and coalesce((c.routing_decision->>'floodActiveRisk') in ('true','sim'),false)=false
    and coalesce(c.routing_decision->>'treeFallState','')<>'falling';
$$;

create or replace function public.comun_civic_assisted_prepare(
  p_token_hash_hex text,
  p_wallet_item_id uuid,
  p_public_reference text,
  p_person_authored_summary text,
  p_preview_confirmed boolean
)
returns table(
  package_id uuid,
  state text,
  category text,
  subject text,
  institutional_text text,
  response_expectation text
)
language plpgsql security definer
set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid;
  v_case public.comun_relata_cases%rowtype;
  v_package private.comun_forwarding_packages%rowtype;
  v_reference text:=nullif(trim(coalesce(p_public_reference,'')), '');
  v_summary text:=nullif(trim(coalesce(p_person_authored_summary,'')), '');
  v_subject text;
  v_label text;
  v_body text;
begin
  if p_preview_confirmed is not true
    or char_length(coalesce(v_reference,'')) not between 3 and 160
    or char_length(coalesce(v_summary,'')) not between 8 and 1000
    or position('@' in coalesce(v_reference,''))>0
    or position('@' in coalesce(v_summary,''))>0
    or coalesce(v_reference,'') ~ '[0-9]{8,}'
    or coalesce(v_summary,'') ~ '[0-9]{8,}'
  then return; end if;

  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;

  select c.* into v_case
  from private.comun_participation_wallet_items wi
  join public.comun_relata_cases c on c.id=wi.subject_ref::uuid
  where wi.id=p_wallet_item_id
    and wi.wallet_id=v_wallet
    and wi.item_type='relata_report'
    and wi.archived_at is null
    and c.state<>'withdrawn'
    and c.category in (
      'waste_or_debris','smoke_or_environmental_trace',
      'environmental_pollution','stormwater_drainage',
      'urban_flooding','tree_hazard'
    )
    and c.urgency not in ('urgent','emergency')
    and coalesce((c.routing_decision->>'immediateDanger') in ('true','sim'),false)=false
    and coalesce((c.routing_decision->>'smokeActive') in ('true','sim'),false)=false
    and coalesce((c.routing_decision->>'floodActiveRisk') in ('true','sim'),false)=false
    and coalesce(c.routing_decision->>'treeFallState','')<>'falling';
  if not found then return; end if;

  v_label:=case v_case.category
    when 'waste_or_debris' then 'Lixo ou entulho em área pública'
    when 'smoke_or_environmental_trace' then 'Vestígio ambiental ou fumaça não ativa'
    when 'environmental_pollution' then 'Poluição ambiental'
    when 'stormwater_drainage' then 'Drenagem ou bueiro'
    when 'urban_flooding' then 'Alagamento sem risco imediato'
    when 'tree_hazard' then 'Avaliação de árvore ou galho'
    else null end;
  if v_label is null then return; end if;
  v_subject:=v_label;
  v_body:='Protocolo COMUN: '||v_case.protocol||E'\n\n'
    ||'Natureza: '||v_label||E'\n'
    ||'Referência pública aproximada: '||v_reference||E'\n'
    ||'Mensagem escrita para este encaminhamento: '||v_summary||E'\n\n'
    ||'Esta mensagem foi conferida pela pessoa. O COMUN não envia automaticamente.';

  perform pg_advisory_xact_lock(hashtextextended(v_case.id::text,4816));
  select * into v_package
  from private.comun_forwarding_packages
  where wallet_id=v_wallet and relata_case_id=v_case.id and withdrawn_at is null
  for update;
  if found then
    if v_package.source_domain<>'civic_service'
      or v_package.subject<>v_subject
      or v_package.institutional_text<>v_body
    then return; end if;
    return query select v_package.id,v_package.state,v_case.category,
      v_package.subject,v_package.institutional_text,v_package.response_expectation;
    return;
  end if;

  insert into private.comun_forwarding_packages(
    wallet_id,relata_case_id,bus_intake_id,source_domain,state,subject,
    institutional_text,response_expectation
  ) values (
    v_wallet,v_case.id,null,'civic_service','ready_for_forwarding',v_subject,
    v_body,'O canal oficial não informa prazo de resposta no catálogo do COMUN.'
  ) returning * into v_package;

  update private.comun_participation_wallet_items set
    presentation_state='Encaminhamento preparado',
    action_required='Conferir e abrir o canal oficial',updated_at=now()
  where id=p_wallet_item_id and wallet_id=v_wallet;
  insert into private.comun_forwarding_events(package_id,event_type,result_code)
    values(v_package.id,'package_prepared','FORWARDING_CIVIC_PACKAGE_PREPARED');
  return query select v_package.id,v_package.state,v_case.category,
    v_package.subject,v_package.institutional_text,v_package.response_expectation;
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
      and p.source_domain in ('bus','essential_service','civic_service')
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

revoke all on function public.comun_civic_wallet_item_context(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_civic_assisted_prepare(text,uuid,text,text,boolean) from public,anon,authenticated;
revoke all on function public.comun_assisted_forwarding_record_response(text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.comun_civic_wallet_item_context(text,uuid) to service_role;
grant execute on function public.comun_civic_assisted_prepare(text,uuid,text,text,boolean) to service_role;
grant execute on function public.comun_assisted_forwarding_record_response(text,uuid,text,text,boolean) to service_role;

commit;

