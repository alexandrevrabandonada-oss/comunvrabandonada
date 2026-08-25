begin;

alter table private.comun_forwarding_attempts
  add column if not exists institutional_channel_id text,
  add column if not exists resolution_outcome text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.comun_forwarding_attempts'::regclass
      and conname = 'comun_forwarding_attempts_institutional_channel_id_check'
  ) then
    alter table private.comun_forwarding_attempts
      add constraint comun_forwarding_attempts_institutional_channel_id_check
      check (
        institutional_channel_id is null
        or institutional_channel_id ~ '^[a-z0-9][a-z0-9._-]{0,159}$'
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.comun_forwarding_attempts'::regclass
      and conname = 'comun_forwarding_attempts_resolution_outcome_check'
  ) then
    alter table private.comun_forwarding_attempts
      add constraint comun_forwarding_attempts_resolution_outcome_check
      check (resolution_outcome is null or resolution_outcome in ('resolved','unresolved'));
  end if;
end $$;

drop index if exists private.comun_forwarding_attempts_one_prepared_channel_idx;
create unique index comun_forwarding_attempts_one_prepared_channel_idx
  on private.comun_forwarding_attempts(
    package_id,
    coalesce(institutional_channel_id, 'legacy:' || channel)
  )
  where state='prepared';

create or replace function public.comun_assisted_forwarding_list(
  p_token_hash_hex text,p_wallet_item_id uuid
)
returns table(package_id uuid,state text,source_domain text,category text,subject text,institutional_text text,response_expectation text,attempts jsonb)
language sql stable security definer set search_path=pg_catalog,private,public as $$
  select p.id,p.state,p.source_domain,c.category,p.subject,p.institutional_text,p.response_expectation,
    coalesce((select jsonb_agg(jsonb_build_object(
      'attemptId',a.id,'sequence',a.sequence_no,'channel',a.channel,
      'institutionalChannelId',a.institutional_channel_id,'state',a.state,
      'openedAt',a.opened_at,'declaredAt',a.declared_at,'dueAt',a.due_at,
      'officialProtocolMasked',case when a.official_protocol is null then null else left(a.official_protocol,3)||'••••' end,
      'respondedAt',a.responded_at,'resolutionOutcome',a.resolution_outcome
    ) order by a.sequence_no) from private.comun_forwarding_attempts a where a.package_id=p.id),'[]'::jsonb)
  from private.comun_forwarding_packages p
  join public.comun_relata_cases c on c.id=p.relata_case_id
  join private.comun_participation_wallet_items wi
    on wi.wallet_id=p.wallet_id and wi.subject_ref=p.relata_case_id::text
    and wi.item_type='relata_report' and wi.archived_at is null
  where p.wallet_id=private.comun_assisted_wallet_id(p_token_hash_hex)
    and wi.id=p_wallet_item_id and p.withdrawn_at is null;
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
      'attemptId',a.id,'sequence',a.sequence_no,'channel',a.channel,
      'institutionalChannelId',a.institutional_channel_id,'state',a.state,
      'openedAt',a.opened_at,'declaredAt',a.declared_at,'dueAt',a.due_at,
      'officialProtocolMasked',case when a.official_protocol is null then null else left(a.official_protocol,3)||'••••' end,
      'respondedAt',a.responded_at,'resolutionOutcome',a.resolution_outcome
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

create or replace function public.comun_assisted_forwarding_open(
  p_token_hash_hex text,p_package_id uuid,p_channel text,p_institutional_channel_id text
)
returns table(attempt_id uuid,attempt_state text,channel text,institutional_channel_id text,sequence_no integer)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid;
  v_attempt private.comun_forwarding_attempts%rowtype;
  v_sequence integer;
  v_channel_id text:=nullif(lower(trim(p_institutional_channel_id)),'');
begin
  if p_channel not in ('whatsapp','email','phone','in_person','web') then return; end if;
  if v_channel_id is not null and v_channel_id !~ '^[a-z0-9][a-z0-9._-]{0,159}$' then return; end if;
  v_wallet:=private.comun_assisted_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;
  perform 1 from private.comun_forwarding_packages
    where id=p_package_id and wallet_id=v_wallet and withdrawn_at is null for update;
  if not found then return; end if;
  select a.* into v_attempt from private.comun_forwarding_attempts a
    where a.package_id=p_package_id and a.state='prepared'
      and (
        (v_channel_id is not null and a.institutional_channel_id=v_channel_id)
        or (v_channel_id is null and a.institutional_channel_id is null and a.channel=p_channel)
      );
  if not found then
    select coalesce(max(a.sequence_no),0)+1 into v_sequence
      from private.comun_forwarding_attempts a where a.package_id=p_package_id;
    insert into private.comun_forwarding_attempts(package_id,sequence_no,channel,institutional_channel_id,state)
      values(p_package_id,v_sequence,p_channel,v_channel_id,'prepared') returning * into v_attempt;
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
  return query select v_attempt.id,v_attempt.state,v_attempt.channel,v_attempt.institutional_channel_id,v_attempt.sequence_no;
end;
$$;

create or replace function public.comun_assisted_forwarding_open(
  p_token_hash_hex text,p_package_id uuid,p_channel text
)
returns table(attempt_id uuid,attempt_state text,channel text,sequence_no integer)
language sql security definer set search_path=pg_catalog,private,public as $$
  select o.attempt_id,o.attempt_state,o.channel,o.sequence_no
  from public.comun_assisted_forwarding_open(p_token_hash_hex,p_package_id,p_channel,null) o;
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
    state='responded',resolution_outcome=case when p_resolved then 'resolved' else 'unresolved' end,
    response_note=trim(p_response_note),
    official_protocol=nullif(trim(p_official_protocol),''),responded_at=now(),updated_at=now()
    where id=p_attempt_id;
  update private.comun_forwarding_packages set state='responded',updated_at=now()
    where id=v_attempt.package_id;
  update private.comun_bus_relata_intakes b set state='responded',updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and p.source_domain='bus' and b.id=p.bus_intake_id;
  update private.comun_participation_wallet_items wi set
    presentation_state=case when p_resolved then 'Resolvido' else 'Resposta não resolveu' end,
    action_required=case when p_resolved then null else 'Ver próximo passo' end,
    updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and wi.wallet_id=p.wallet_id
    and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code)
    values(v_attempt.package_id,p_attempt_id,'response_recorded',
      case when p_resolved then 'FORWARDING_RESPONSE_RESOLVED' else 'FORWARDING_RESPONSE_NOT_RESOLVED' end);
  return query select p_attempt_id,'responded'::text;
end;
$$;

create or replace function public.comun_sensitive_assisted_record_response(
  p_token_hash_hex text,p_attempt_id uuid,p_response_outcome text,
  p_response_note text,p_official_protocol text
)
returns table(attempt_id uuid,attempt_state text)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare
  v_wallet uuid; v_attempt private.comun_forwarding_attempts%rowtype;
  v_category text; v_note text:=nullif(trim(coalesce(p_response_note,'')),'');
  v_stored_note text; v_no_return boolean:=p_response_outcome='no_return';
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
  where a.id=p_attempt_id and p.wallet_id=v_wallet and p.source_domain='sensitive_service'
    and p.withdrawn_at is null and a.state in ('person_declared_sent','no_response') for update of a;
  if not found then return; end if;
  select c.category into v_category from private.comun_forwarding_packages p
    join public.comun_relata_cases c on c.id=p.relata_case_id where p.id=v_attempt.package_id;
  if v_category='child_protection' and v_note is not null then return; end if;
  v_stored_note:=case when v_category='child_protection' then p_response_outcome
    else coalesce(v_note,p_response_outcome) end;
  update private.comun_forwarding_attempts set
    state=case when v_no_return then 'no_response' else 'responded' end,
    resolution_outcome=case when p_response_outcome='situation_forwarded' then 'unresolved' else null end,
    response_note=v_stored_note,
    official_protocol=nullif(trim(coalesce(p_official_protocol,'')),''),
    responded_at=case when v_no_return then null else now() end,updated_at=now()
  where id=p_attempt_id;
  update private.comun_forwarding_packages set
    state=case when v_no_return then 'waiting_response' else 'responded' end,updated_at=now()
    where id=v_attempt.package_id;
  update private.comun_participation_wallet_items wi set
    presentation_state=case
      when v_no_return then 'Aguardando retorno'
      when p_response_outcome='situation_forwarded' then 'Resposta não resolveu'
      else 'Resposta registrada' end,
    action_required=case
      when v_no_return then 'Acompanhar retorno'
      when p_response_outcome='situation_forwarded' then 'Ver próximo passo'
      else 'Revise o resultado' end,
    updated_at=now()
  from private.comun_forwarding_packages p
  where p.id=v_attempt.package_id and wi.wallet_id=p.wallet_id
    and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code)
    values(v_attempt.package_id,p_attempt_id,'response_recorded',case
      when v_no_return then 'FORWARDING_SENSITIVE_NO_RETURN'
      when p_response_outcome='situation_forwarded' then 'FORWARDING_RESPONSE_NOT_RESOLVED'
      else 'FORWARDING_SENSITIVE_RESPONSE_RECORDED' end);
  return query select p_attempt_id,case when v_no_return then 'no_response' else 'responded' end;
end;
$$;

create or replace function public.comun_stmu_assisted_list(
  p_token_hash_hex text,p_wallet_item_id uuid
)
returns table(package_id uuid,state text,subject text,institutional_text text,response_expectation text,attempts jsonb)
language sql stable security definer set search_path=pg_catalog,private,public as $$
  select p.id,p.state,p.subject,p.institutional_text,p.response_expectation,
    coalesce((select jsonb_agg(jsonb_build_object(
      'attemptId',a.id,'sequence',a.sequence_no,'channel',a.channel,
      'institutionalChannelId',a.institutional_channel_id,'state',a.state,
      'openedAt',a.opened_at,'declaredAt',a.declared_at,'dueAt',a.due_at,
      'officialProtocolMasked',case when a.official_protocol is null then null else left(a.official_protocol,3)||'••••' end,
      'respondedAt',a.responded_at,'resolutionOutcome',a.resolution_outcome
    ) order by a.sequence_no) from private.comun_forwarding_attempts a where a.package_id=p.id),'[]'::jsonb)
  from private.comun_forwarding_packages p
  join private.comun_participation_wallet_items wi on wi.wallet_id=p.wallet_id
    and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null
  where p.wallet_id=private.comun_p5_wallet_id(p_token_hash_hex)
    and wi.id=p_wallet_item_id and p.withdrawn_at is null;
$$;

create or replace function public.comun_stmu_assisted_record_response(
  p_token_hash_hex text,p_attempt_id uuid,p_response_note text,
  p_official_protocol text,p_resolved boolean
)
returns table(attempt_id uuid,attempt_state text)
language plpgsql security definer set search_path=pg_catalog,private,public as $$
declare v_wallet uuid; v_attempt private.comun_forwarding_attempts%rowtype;
begin
  if char_length(trim(coalesce(p_response_note,''))) not between 1 and 600
    or char_length(coalesce(p_official_protocol,''))>240 then return; end if;
  v_wallet:=private.comun_p5_wallet_id(p_token_hash_hex);
  if v_wallet is null then return; end if;
  select a.* into v_attempt from private.comun_forwarding_attempts a
    join private.comun_forwarding_packages p on p.id=a.package_id
    where a.id=p_attempt_id and p.wallet_id=v_wallet
      and a.state in ('person_declared_sent','no_response') for update of a;
  if not found then return; end if;
  update private.comun_forwarding_attempts set
    state='responded',resolution_outcome=case when p_resolved then 'resolved' else 'unresolved' end,
    response_note=trim(p_response_note),official_protocol=nullif(trim(p_official_protocol),''),
    responded_at=now(),updated_at=now() where id=p_attempt_id;
  update private.comun_forwarding_packages set state='responded',updated_at=now()
    where id=v_attempt.package_id;
  update private.comun_bus_relata_intakes b set state='responded',updated_at=now()
  from private.comun_forwarding_packages p where p.id=v_attempt.package_id and b.id=p.bus_intake_id;
  update private.comun_participation_wallet_items wi set
    presentation_state=case when p_resolved then 'Resolvido' else 'Resposta não resolveu' end,
    action_required=case when p_resolved then null else 'Ver próximo passo' end,updated_at=now()
  from private.comun_forwarding_packages p where p.id=v_attempt.package_id
    and wi.wallet_id=p.wallet_id and wi.subject_ref=p.relata_case_id::text
    and wi.item_type='relata_report' and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code)
    values(v_attempt.package_id,p_attempt_id,'response_recorded',case when p_resolved
      then 'FORWARDING_RESPONSE_RESOLVED' else 'FORWARDING_RESPONSE_NOT_RESOLVED' end);
  return query select p_attempt_id,'responded'::text;
end;
$$;

revoke all on function public.comun_assisted_forwarding_open(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.comun_assisted_forwarding_open(text,uuid,text,text) to service_role;
revoke all on function public.comun_assisted_forwarding_open(text,uuid,text) from public,anon,authenticated;
grant execute on function public.comun_assisted_forwarding_open(text,uuid,text) to service_role;

commit;
