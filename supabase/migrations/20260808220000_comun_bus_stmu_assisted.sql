begin;

create table private.comun_bus_relata_intakes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references private.comun_relata_reports(id) on delete restrict,
  case_id uuid not null unique references public.comun_relata_cases(id) on delete restrict,
  issue_type text not null check (issue_type in ('delay_or_not_passed','overcrowding','accessibility','vehicle_condition','stop_or_shelter','conduct_or_service','timetable_information','other')),
  line_label text check (line_label is null or char_length(line_label) <= 80),
  direction text check (direction is null or char_length(direction) <= 80),
  vehicle_order text check (vehicle_order is null or char_length(vehicle_order) <= 80),
  observed_at timestamptz not null,
  wait_minutes integer check (wait_minutes is null or wait_minutes between 0 and 720),
  state text not null default 'stored_private' check (state in ('stored_private','ready_for_forwarding','forwarding_prepared','person_declared_sent','waiting_response','responded','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table private.comun_forwarding_packages (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  relata_case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  bus_intake_id uuid not null references private.comun_bus_relata_intakes(id) on delete restrict,
  state text not null default 'ready_for_forwarding' check (state in ('ready_for_forwarding','forwarding_prepared','person_declared_sent','waiting_response','responded','withdrawn')),
  subject text not null check (char_length(subject) between 8 and 240),
  institutional_text text not null check (char_length(institutional_text) between 8 and 4000),
  response_expectation text not null default '72 horas é uma referência de acompanhamento do COMUN, não prazo legal nem garantia de resposta.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (wallet_id, relata_case_id)
);

create table private.comun_forwarding_attempts (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  sequence_no integer not null check (sequence_no between 1 and 100),
  channel text not null check (channel in ('whatsapp','email','phone','in_person')),
  state text not null check (state in ('prepared','person_declared_sent','no_response','responded','abandoned')),
  latency_bucket text check (latency_bucket is null or latency_bucket in ('less_than_1_hour','1_to_6_hours','6_to_24_hours','1_to_3_days','4_to_7_days','more_than_7_days')),
  escalation_reason text check (escalation_reason is null or char_length(escalation_reason) <= 120),
  official_protocol text check (official_protocol is null or char_length(official_protocol) between 1 and 240),
  response_note text check (response_note is null or char_length(response_note) between 1 and 600),
  opened_at timestamptz not null default now(),
  declared_at timestamptz,
  due_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (package_id, sequence_no)
);

create unique index comun_forwarding_attempts_one_prepared_channel_idx
  on private.comun_forwarding_attempts(package_id, channel)
  where state = 'prepared';

create table private.comun_forwarding_events (
  id bigint generated always as identity primary key,
  package_id uuid not null references private.comun_forwarding_packages(id) on delete restrict,
  attempt_id uuid references private.comun_forwarding_attempts(id) on delete restrict,
  event_type text not null,
  result_code text not null check (result_code ~ '^FORWARDING_[A-Z0-9_]{3,80}$'),
  created_at timestamptz not null default now()
);

create or replace function private.comun_forwarding_events_append_only()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  raise exception using errcode='42501', message='COMUN_FORWARDING_EVENTS_APPEND_ONLY';
end;
$$;
create trigger comun_forwarding_events_append_only
  before update or delete on private.comun_forwarding_events
  for each row execute function private.comun_forwarding_events_append_only();

alter table private.comun_bus_relata_intakes enable row level security;
alter table private.comun_bus_relata_intakes force row level security;
alter table private.comun_forwarding_packages enable row level security;
alter table private.comun_forwarding_packages force row level security;
alter table private.comun_forwarding_attempts enable row level security;
alter table private.comun_forwarding_attempts force row level security;
alter table private.comun_forwarding_events enable row level security;
alter table private.comun_forwarding_events force row level security;
revoke all on table private.comun_bus_relata_intakes from public, anon, authenticated;
revoke all on table private.comun_forwarding_packages from public, anon, authenticated;
revoke all on table private.comun_forwarding_attempts from public, anon, authenticated;
revoke all on table private.comun_forwarding_events from public, anon, authenticated;
grant select, insert, update on table private.comun_bus_relata_intakes, private.comun_forwarding_packages, private.comun_forwarding_attempts to service_role;
grant select, insert on table private.comun_forwarding_events to service_role;
grant usage, select on sequence private.comun_forwarding_events_id_seq to service_role;

create or replace function public.comun_bus_intake_create(
  p_protocol text, p_receipt_secret text, p_issue_type text,
  p_line_label text, p_direction text, p_vehicle_order text,
  p_observed_at timestamptz, p_wait_minutes integer
)
returns table(intake_id uuid, case_id uuid, intake_state text)
language plpgsql security definer set search_path = pg_catalog, private, public as $$
declare v_context record; v_intake private.comun_bus_relata_intakes%rowtype;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.category <> 'public_transport' or v_context.case_state='withdrawn'
    or p_issue_type not in ('delay_or_not_passed','overcrowding','accessibility','vehicle_condition','stop_or_shelter','conduct_or_service','timetable_information','other')
    or p_observed_at is null or p_observed_at > now()+interval '5 minutes'
    or char_length(coalesce(p_line_label,''))>80 or char_length(coalesce(p_direction,''))>80
    or char_length(coalesce(p_vehicle_order,''))>80 or coalesce(p_wait_minutes,0) not between 0 and 720 then return; end if;
  insert into private.comun_bus_relata_intakes as current(report_id,case_id,issue_type,line_label,direction,vehicle_order,observed_at,wait_minutes,state)
  values(v_context.report_id,v_context.case_id,p_issue_type,nullif(trim(p_line_label),''),nullif(trim(p_direction),''),nullif(trim(p_vehicle_order),''),p_observed_at,p_wait_minutes,'ready_for_forwarding')
  on conflict(report_id) do update set updated_at=current.updated_at returning * into v_intake;
  update private.comun_participation_wallet_items set
    title_template='Relato de ônibus', presentation_state='Pronto para encaminhar', action_required='Preparar encaminhamento STMU',
    metadata=metadata||jsonb_strip_nulls(jsonb_build_object('relatedDomain','bus','issueType',v_intake.issue_type,'line',v_intake.line_label,'direction',v_intake.direction,'observedAt',v_intake.observed_at)), updated_at=now()
  where item_type='relata_report' and subject_ref=v_context.case_id::text and archived_at is null;
  return query select v_intake.id,v_intake.case_id,v_intake.state;
end; $$;

create or replace function public.comun_bus_intake_withdraw(p_protocol text,p_receipt_secret text)
returns boolean language plpgsql security definer set search_path = pg_catalog, private, public as $$
declare v_context record;
begin
  select * into v_context from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
  if not found or v_context.category<>'public_transport' then return false; end if;
  update private.comun_bus_relata_intakes set state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now()),updated_at=now() where report_id=v_context.report_id;
  return found;
end; $$;

create or replace function private.comun_p5_wallet_id(p_token_hash_hex text)
returns uuid language sql stable security definer set search_path = pg_catalog as $$
  select id from private.comun_participation_wallets
  where p_token_hash_hex ~ '^[0-9a-f]{64}$' and token_hash=decode(p_token_hash_hex,'hex') and status='active' limit 1;
$$;
revoke all on function private.comun_p5_wallet_id(text) from public,anon,authenticated;

create or replace function public.comun_stmu_assisted_prepare(p_token_hash_hex text,p_wallet_item_id uuid)
returns table(package_id uuid,state text,subject text,institutional_text text,response_expectation text)
language plpgsql security definer set search_path = pg_catalog, private, public as $$
declare v_wallet uuid; v_case public.comun_relata_cases%rowtype; v_report private.comun_relata_reports%rowtype; v_bus private.comun_bus_relata_intakes%rowtype; v_package private.comun_forwarding_packages%rowtype; v_body text;
begin
  v_wallet:=private.comun_p5_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  select c.* into v_case from private.comun_participation_wallet_items wi join public.comun_relata_cases c on c.id=wi.subject_ref::uuid
    where wi.id=p_wallet_item_id and wi.wallet_id=v_wallet and wi.item_type='relata_report' and wi.category='public_transport' and wi.archived_at is null and c.state<>'withdrawn';
  if not found then return; end if;
  select report.* into v_report from private.comun_relata_reports as report
    where report.id=v_case.report_id and report.withdrawn_at is null; if not found then return; end if;
  select bus.* into v_bus from private.comun_bus_relata_intakes as bus
    where bus.case_id=v_case.id and bus.state<>'withdrawn'; if not found then return; end if;
  v_body:='Olá. Gostaria de registrar uma reclamação sobre o transporte coletivo.'||E'\n\nLinha: '||coalesce(v_bus.line_label,'não informada')||E'\nSentido: '||coalesce(v_bus.direction,'não informado')||E'\nData e horário: '||to_char(v_bus.observed_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')||E'\nNúmero de ordem do veículo: '||coalesce(v_bus.vehicle_order,'não observado')||E'\nOcorrência: '||v_bus.issue_type||E'\nDescrição: '||v_report.original_text||E'\n\nSolicito, por favor, o registro da reclamação e o número de protocolo.';
  insert into private.comun_forwarding_packages as current(wallet_id,relata_case_id,bus_intake_id,state,subject,institutional_text)
  values(v_wallet,v_case.id,v_bus.id,'ready_for_forwarding','Reclamação sobre transporte coletivo',v_body)
  on conflict(wallet_id,relata_case_id) do update set updated_at=now(),withdrawn_at=null returning * into v_package;
  update private.comun_bus_relata_intakes as bus
    set state='forwarding_prepared',updated_at=now()
    where bus.id=v_bus.id and bus.state='ready_for_forwarding';
  update private.comun_participation_wallet_items set presentation_state='Encaminhamento preparado',action_required='Conferir e enviar manualmente',updated_at=now() where id=p_wallet_item_id and wallet_id=v_wallet;
  insert into private.comun_forwarding_events(package_id,event_type,result_code) values(v_package.id,'package_prepared','FORWARDING_PACKAGE_PREPARED');
  return query select v_package.id,v_package.state,v_package.subject,v_package.institutional_text,v_package.response_expectation;
end; $$;

create or replace function public.comun_stmu_assisted_list(p_token_hash_hex text,p_wallet_item_id uuid)
returns table(package_id uuid,state text,subject text,institutional_text text,response_expectation text,attempts jsonb)
language sql stable security definer set search_path = pg_catalog, private, public as $$
  select p.id,p.state,p.subject,p.institutional_text,p.response_expectation,
    coalesce((select jsonb_agg(jsonb_build_object('attemptId',a.id,'sequence',a.sequence_no,'channel',a.channel,'state',a.state,'openedAt',a.opened_at,'declaredAt',a.declared_at,'dueAt',a.due_at,'officialProtocolMasked',case when a.official_protocol is null then null else left(a.official_protocol,3)||'••••' end,'respondedAt',a.responded_at) order by a.sequence_no) from private.comun_forwarding_attempts a where a.package_id=p.id),'[]'::jsonb)
  from private.comun_forwarding_packages p join private.comun_participation_wallet_items wi on wi.wallet_id=p.wallet_id and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null
  where p.wallet_id=private.comun_p5_wallet_id(p_token_hash_hex) and wi.id=p_wallet_item_id and p.withdrawn_at is null;
$$;

create or replace function public.comun_stmu_assisted_open(p_token_hash_hex text,p_package_id uuid,p_channel text)
returns table(attempt_id uuid,attempt_state text,channel_url text)
language plpgsql security definer set search_path = pg_catalog, private, public as $$
declare v_wallet uuid; v_attempt private.comun_forwarding_attempts%rowtype; v_sequence integer; v_url text;
begin
  if p_channel not in ('whatsapp','email','phone','in_person') then return; end if;
  v_wallet:=private.comun_p5_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  perform 1 from private.comun_forwarding_packages where id=p_package_id and wallet_id=v_wallet and withdrawn_at is null for update; if not found then return; end if;
  select * into v_attempt from private.comun_forwarding_attempts where package_id=p_package_id and channel=p_channel and state='prepared';
  if not found then
    select coalesce(max(sequence_no),0)+1 into v_sequence from private.comun_forwarding_attempts where package_id=p_package_id;
    insert into private.comun_forwarding_attempts(package_id,sequence_no,channel,state) values(p_package_id,v_sequence,p_channel,'prepared') returning * into v_attempt;
    insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code) values(p_package_id,v_attempt.id,'channel_opened','FORWARDING_CHANNEL_OPENED_BY_PERSON');
  end if;
  update private.comun_forwarding_packages set state='forwarding_prepared',updated_at=now() where id=p_package_id;
  v_url:=case p_channel when 'whatsapp' then 'https://wa.me/5524992958558' when 'email' then 'mailto:stmu@voltaredonda.rj.gov.br' when 'phone' then 'tel:+552435113728' else null end;
  return query select v_attempt.id,v_attempt.state,v_url;
end; $$;

create or replace function public.comun_stmu_assisted_declare_sent(p_token_hash_hex text,p_attempt_id uuid,p_sent boolean)
returns table(attempt_id uuid,attempt_state text,due_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, private, public as $$
declare v_wallet uuid; v_attempt private.comun_forwarding_attempts%rowtype; v_state text; v_due timestamptz;
begin
  v_wallet:=private.comun_p5_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  select a.* into v_attempt from private.comun_forwarding_attempts a join private.comun_forwarding_packages p on p.id=a.package_id where a.id=p_attempt_id and p.wallet_id=v_wallet and p.withdrawn_at is null for update of a; if not found or v_attempt.state<>'prepared' then return; end if;
  v_state:=case when p_sent then 'person_declared_sent' else 'abandoned' end; v_due:=case when p_sent then now()+interval '72 hours' else null end;
  update private.comun_forwarding_attempts set state=v_state,declared_at=now(),due_at=v_due,updated_at=now() where id=p_attempt_id;
  update private.comun_forwarding_packages set state=case when p_sent then 'waiting_response' else 'ready_for_forwarding' end,updated_at=now() where id=v_attempt.package_id;
  update private.comun_bus_relata_intakes b set state=case when p_sent then 'waiting_response' else 'forwarding_prepared' end,updated_at=now() from private.comun_forwarding_packages p where p.id=v_attempt.package_id and b.id=p.bus_intake_id;
  update private.comun_participation_wallet_items wi set presentation_state=case when p_sent then 'Aguardando retorno' else 'Encaminhamento preparado' end,action_required=case when p_sent then 'Acompanhar resposta' else 'Conferir e enviar manualmente' end,updated_at=now() from private.comun_forwarding_packages p where p.id=v_attempt.package_id and wi.wallet_id=p.wallet_id and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code) values(v_attempt.package_id,p_attempt_id,case when p_sent then 'person_declared_sent' else 'not_sent' end,case when p_sent then 'FORWARDING_PERSON_DECLARED_SENT' else 'FORWARDING_PERSON_DID_NOT_SEND' end);
  return query select p_attempt_id,v_state,v_due;
end; $$;

create or replace function public.comun_stmu_assisted_record_response(p_token_hash_hex text,p_attempt_id uuid,p_response_note text,p_official_protocol text,p_resolved boolean)
returns table(attempt_id uuid,attempt_state text)
language plpgsql security definer set search_path = pg_catalog, private, public as $$
declare v_wallet uuid; v_attempt private.comun_forwarding_attempts%rowtype;
begin
  if char_length(trim(coalesce(p_response_note,''))) not between 1 and 600 or char_length(coalesce(p_official_protocol,''))>240 then return; end if;
  v_wallet:=private.comun_p5_wallet_id(p_token_hash_hex); if v_wallet is null then return; end if;
  select a.* into v_attempt from private.comun_forwarding_attempts a join private.comun_forwarding_packages p on p.id=a.package_id where a.id=p_attempt_id and p.wallet_id=v_wallet and a.state in ('person_declared_sent','no_response') for update of a; if not found then return; end if;
  update private.comun_forwarding_attempts set state='responded',response_note=trim(p_response_note),official_protocol=nullif(trim(p_official_protocol),''),responded_at=now(),updated_at=now() where id=p_attempt_id;
  update private.comun_forwarding_packages set state='responded',updated_at=now() where id=v_attempt.package_id;
  update private.comun_bus_relata_intakes b set state='responded',updated_at=now() from private.comun_forwarding_packages p where p.id=v_attempt.package_id and b.id=p.bus_intake_id;
  update private.comun_participation_wallet_items wi set presentation_state='Resposta registrada',action_required=null,updated_at=now() from private.comun_forwarding_packages p where p.id=v_attempt.package_id and wi.wallet_id=p.wallet_id and wi.subject_ref=p.relata_case_id::text and wi.item_type='relata_report' and wi.archived_at is null;
  insert into private.comun_forwarding_events(package_id,attempt_id,event_type,result_code) values(v_attempt.package_id,p_attempt_id,'response_recorded',case when p_resolved then 'FORWARDING_RESPONSE_RESOLVED' else 'FORWARDING_RESPONSE_NOT_RESOLVED' end);
  return query select p_attempt_id,'responded'::text;
end; $$;

revoke all on function public.comun_bus_intake_create(text,text,text,text,text,text,timestamptz,integer) from public,anon,authenticated;
revoke all on function public.comun_bus_intake_withdraw(text,text) from public,anon,authenticated;
revoke all on function public.comun_stmu_assisted_prepare(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_stmu_assisted_list(text,uuid) from public,anon,authenticated;
revoke all on function public.comun_stmu_assisted_open(text,uuid,text) from public,anon,authenticated;
revoke all on function public.comun_stmu_assisted_declare_sent(text,uuid,boolean) from public,anon,authenticated;
revoke all on function public.comun_stmu_assisted_record_response(text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.comun_bus_intake_create(text,text,text,text,text,text,timestamptz,integer) to service_role;
grant execute on function public.comun_bus_intake_withdraw(text,text) to service_role;
grant execute on function public.comun_stmu_assisted_prepare(text,uuid) to service_role;
grant execute on function public.comun_stmu_assisted_list(text,uuid) to service_role;
grant execute on function public.comun_stmu_assisted_open(text,uuid,text) to service_role;
grant execute on function public.comun_stmu_assisted_declare_sent(text,uuid,boolean) to service_role;
grant execute on function public.comun_stmu_assisted_record_response(text,uuid,text,text,boolean) to service_role;

commit;
