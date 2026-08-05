-- TIJOLO 48.0E. Fundação local-only do COMUN Ônibus.
-- Não promove release, não publica transporte e não envia para canais externos.

create schema if not exists private;

alter table public.comun_relata_cases
  drop constraint if exists comun_relata_case_category;
alter table public.comun_relata_cases
  add constraint comun_relata_case_category check (
    category in ('public_lighting','power_distribution','electrical_hazard','active_fire','smoke_or_environmental_trace','public_transport','other')
  );

create table private.comun_bus_authorities (
  id uuid primary key default gen_random_uuid(),
  public_name text not null,
  sphere text not null check (sphere in ('municipal','state','federal','private','unknown')),
  territory text not null,
  source_reference text,
  verification_state text not null default 'unknown' check (verification_state in ('unknown','source_verified','operationally_checked')),
  created_at timestamptz not null default now()
);

create table private.comun_bus_operators (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid references private.comun_bus_authorities(id) on delete restrict,
  public_name text not null,
  source_reference text,
  verification_state text not null default 'unknown' check (verification_state in ('unknown','source_verified','operationally_checked')),
  created_at timestamptz not null default now()
);

create table private.comun_bus_lines (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  public_name text not null,
  authority_id uuid references private.comun_bus_authorities(id) on delete restrict,
  operator_id uuid references private.comun_bus_operators(id) on delete restrict,
  state text not null default 'draft' check (state in ('draft','active','suspended','retired')),
  valid_from date,
  valid_until date,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table private.comun_bus_route_patterns (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references private.comun_bus_lines(id) on delete restrict,
  pattern_code text not null,
  description text not null,
  source_reference text,
  valid_from date,
  valid_until date,
  unique(line_id, pattern_code),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table private.comun_bus_directions (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references private.comun_bus_lines(id) on delete restrict,
  public_name text not null,
  destination text not null,
  route_pattern_id uuid references private.comun_bus_route_patterns(id) on delete restrict,
  state text not null default 'active' check (state in ('draft','active','retired')),
  valid_from date,
  valid_until date,
  unique(line_id, public_name),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table private.comun_bus_stops (
  id uuid primary key default gen_random_uuid(),
  public_code text unique,
  public_name text not null,
  approximate_location text,
  latitude numeric check (latitude between -90 and 90),
  longitude numeric check (longitude between -180 and 180),
  state text not null default 'draft' check (state in ('draft','active','retired')),
  source_reference text,
  verification_state text not null default 'unknown' check (verification_state in ('unknown','source_verified','operationally_checked')),
  valid_from date,
  valid_until date,
  check (valid_until is null or valid_from is null or valid_until >= valid_from),
  check (latitude is null or longitude is not null)
);

create table private.comun_bus_service_calendars (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  day_type text not null check (day_type in ('weekday','saturday','sunday','holiday','special')),
  holidays jsonb not null default '[]'::jsonb check (jsonb_typeof(holidays) = 'array'),
  valid_from date,
  valid_until date,
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table private.comun_bus_timetable_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  reference text not null,
  source_kind text not null check (source_kind in ('official_document','validated_csv','validated_json','gtfs_subset','synthetic_fixture')),
  consulted_at timestamptz,
  normalized_sha256 text check (normalized_sha256 is null or normalized_sha256 ~ '^[a-f0-9]{64}$'),
  responsible_reference text,
  created_at timestamptz not null default now()
);

create table private.comun_bus_timetable_versions (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references private.comun_bus_lines(id) on delete restrict,
  direction_id uuid not null references private.comun_bus_directions(id) on delete restrict,
  source_id uuid not null references private.comun_bus_timetable_sources(id) on delete restrict,
  version_label text not null,
  valid_from date not null,
  valid_until date,
  state text not null default 'draft' check (state in ('draft','source_verified','conflicting_sources','operationally_unchecked','active','superseded','invalidated')),
  normalized_sha256 text not null check (normalized_sha256 ~ '^[a-f0-9]{64}$'),
  import_method text not null check (import_method in ('manual','validated_csv','validated_json','gtfs_subset')),
  verified_by text,
  conflict_note text,
  supersedes_version_id uuid references private.comun_bus_timetable_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);

create unique index comun_bus_one_active_timetable
  on private.comun_bus_timetable_versions(line_id,direction_id)
  where state = 'active';

create table private.comun_bus_timetable_entries (
  id uuid primary key default gen_random_uuid(),
  timetable_version_id uuid not null references private.comun_bus_timetable_versions(id) on delete restrict,
  stop_id uuid not null references private.comun_bus_stops(id) on delete restrict,
  service_calendar_id uuid not null references private.comun_bus_service_calendars(id) on delete restrict,
  sequence_number integer not null check (sequence_number >= 0),
  departure_time time not null,
  service_day_offset smallint not null default 0 check (service_day_offset between -1 and 1),
  unique(timetable_version_id,stop_id,service_calendar_id,sequence_number,departure_time)
);

create table private.comun_bus_scheduled_journeys (
  id uuid primary key default gen_random_uuid(),
  timetable_version_id uuid not null references private.comun_bus_timetable_versions(id) on delete restrict,
  service_calendar_id uuid not null references private.comun_bus_service_calendars(id) on delete restrict,
  service_date date not null,
  scheduled_time time not null,
  service_day_offset smallint not null default 0 check (service_day_offset between -1 and 1),
  direction_id uuid not null references private.comun_bus_directions(id) on delete restrict,
  stop_id uuid not null references private.comun_bus_stops(id) on delete restrict,
  destination text not null,
  unique(timetable_version_id,service_date,scheduled_time,direction_id,stop_id)
);

create table private.comun_bus_waiting_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash bytea not null check (octet_length(session_token_hash) = 32),
  line_id uuid not null references private.comun_bus_lines(id) on delete restrict,
  direction_id uuid not null references private.comun_bus_directions(id) on delete restrict,
  stop_id uuid not null references private.comun_bus_stops(id) on delete restrict,
  timetable_version_id uuid references private.comun_bus_timetable_versions(id) on delete restrict,
  scheduled_journey_id uuid references private.comun_bus_scheduled_journeys(id) on delete restrict,
  service_date date not null,
  scheduled_time time,
  state text not null default 'started' check (state in ('started','bus_arrived','passed_without_stopping','user_cancelled','observation_ended','not_observed_during_session')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  server_timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'started' and ended_at is null) or (state <> 'started' and ended_at is not null))
);

create unique index comun_bus_active_session_token on private.comun_bus_waiting_sessions(session_token_hash) where state = 'started';
create index comun_bus_waiting_line_date on private.comun_bus_waiting_sessions(line_id,service_date,started_at desc);

create table private.comun_bus_waiting_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references private.comun_bus_waiting_sessions(id) on delete restrict,
  event_type text not null check (event_type in ('started','bus_arrived','passed_without_stopping','user_cancelled','observation_ended','not_observed_during_session')),
  observed_at timestamptz,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 8192),
  created_at timestamptz not null default now()
);

create table private.comun_bus_observed_arrivals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references private.comun_bus_waiting_sessions(id) on delete restrict,
  observed_at timestamptz,
  official_time time,
  difference_minutes integer,
  calculation_state text not null default 'not_calculable' check (calculation_state in ('early','on_time_window','late','not_calculable')),
  calculation_rule_version text not null default 'bus-delay-v1',
  optional_vehicle_order text,
  created_at timestamptz not null default now()
);

create table private.comun_bus_vehicle_observations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references private.comun_bus_waiting_sessions(id) on delete restrict,
  crowding text not null check (crowding in ('seats_available','standing','very_full','boarding_infeasible','not_observed')),
  vehicle_condition text not null check (vehicle_condition in ('apparently_normal','cleanliness','door','lighting','ventilation','noise_or_apparent_failure','other_private','not_observed')),
  vehicle_order_private text,
  private_note text,
  created_at timestamptz not null default now()
);

create table private.comun_bus_accessibility_observations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references private.comun_bus_waiting_sessions(id) on delete restrict,
  outcome text not null check (outcome in ('lift_worked','lift_failed','vehicle_without_identified_resource','accessible_boarding','could_not_verify')),
  private_note text,
  created_at timestamptz not null default now()
);

create table private.comun_bus_transport_problems (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references private.comun_bus_waiting_sessions(id) on delete restrict,
  problem_kind text not null check (problem_kind in ('observed_delay','not_observed_during_session','passed_without_stopping','overcrowding','accessibility_failure','vehicle_condition','route_or_timetable_information','staff_conduct_private')),
  description_private text,
  relato_protocol text,
  created_at timestamptz not null default now()
);

create table private.comun_bus_complaint_drafts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references private.comun_bus_waiting_sessions(id) on delete restrict,
  report_protocol text,
  preview jsonb not null check (jsonb_typeof(preview) = 'object' and pg_column_size(preview) <= 8192),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (sent_at is null)
);

create table private.comun_bus_channel_candidates (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  channel_type text not null check (channel_type in ('whatsapp','phone','web')),
  channel_value text,
  description text not null,
  source_origin text not null,
  official_source_reference text,
  verification_state text not null default 'candidate' check (verification_state in ('candidate','official_source_found','operationally_checked','protocol_behavior_confirmed','assisted_opening_allowed','temporarily_unavailable','retired')),
  sending_enabled boolean not null default false,
  deep_link_enabled boolean not null default false,
  protocol_behavior text not null default 'unknown',
  created_at timestamptz not null default now()
);

create table private.comun_bus_observatory_snapshots (
  id uuid primary key default gen_random_uuid(),
  line_id uuid references private.comun_bus_lines(id) on delete restrict,
  direction_id uuid references private.comun_bus_directions(id) on delete restrict,
  stop_id uuid references private.comun_bus_stops(id) on delete restrict,
  day_type text check (day_type in ('weekday','saturday','sunday','holiday','special')),
  period_start date not null,
  period_end date not null,
  sample_size integer not null check (sample_size >= 0),
  metrics jsonb not null check (jsonb_typeof(metrics) = 'object' and pg_column_size(metrics) <= 32768),
  timetable_version_id uuid references private.comun_bus_timetable_versions(id) on delete restrict,
  methodology_version text not null default 'bus-observatory-v1',
  visibility text not null default 'local_only' check (visibility = 'local_only'),
  created_at timestamptz not null default now(),
  check(period_end > period_start)
);

create or replace function private.comun_bus_reject_append_only()
returns trigger language plpgsql security definer set search_path = 'pg_catalog'
as $$ begin raise exception using errcode = '42501', message = 'COMUN_BUS_APPEND_ONLY'; end; $$;

create trigger comun_bus_waiting_events_append_only before update or delete on private.comun_bus_waiting_events for each row execute function private.comun_bus_reject_append_only();

do $$
declare t text;
begin
  foreach t in array array[
    'comun_bus_authorities','comun_bus_operators','comun_bus_lines','comun_bus_route_patterns','comun_bus_directions','comun_bus_stops','comun_bus_service_calendars','comun_bus_timetable_sources','comun_bus_timetable_versions','comun_bus_timetable_entries','comun_bus_scheduled_journeys','comun_bus_waiting_sessions','comun_bus_waiting_events','comun_bus_observed_arrivals','comun_bus_vehicle_observations','comun_bus_accessibility_observations','comun_bus_transport_problems','comun_bus_complaint_drafts','comun_bus_channel_candidates','comun_bus_observatory_snapshots'
  ] loop
    execute format('alter table private.%I enable row level security', t);
    execute format('alter table private.%I force row level security', t);
    execute format('revoke all on table private.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on table private.%I to service_role', t);
  end loop;
end $$;

-- Explicit contract lines are kept in the migration for static auditors and reviewers.
alter table private.comun_bus_authorities enable row level security;
alter table private.comun_bus_operators enable row level security;
alter table private.comun_bus_lines enable row level security;
alter table private.comun_bus_route_patterns enable row level security;
alter table private.comun_bus_directions enable row level security;
alter table private.comun_bus_stops enable row level security;
alter table private.comun_bus_service_calendars enable row level security;
alter table private.comun_bus_timetable_sources enable row level security;
alter table private.comun_bus_timetable_versions enable row level security;
alter table private.comun_bus_timetable_entries enable row level security;
alter table private.comun_bus_scheduled_journeys enable row level security;
alter table private.comun_bus_waiting_sessions enable row level security;
alter table private.comun_bus_waiting_events enable row level security;
alter table private.comun_bus_observed_arrivals enable row level security;
alter table private.comun_bus_vehicle_observations enable row level security;
alter table private.comun_bus_accessibility_observations enable row level security;
alter table private.comun_bus_transport_problems enable row level security;
alter table private.comun_bus_complaint_drafts enable row level security;
alter table private.comun_bus_channel_candidates enable row level security;
alter table private.comun_bus_observatory_snapshots enable row level security;
revoke all on table private.comun_bus_authorities from public, anon, authenticated;
revoke all on table private.comun_bus_operators from public, anon, authenticated;
revoke all on table private.comun_bus_lines from public, anon, authenticated;
revoke all on table private.comun_bus_route_patterns from public, anon, authenticated;
revoke all on table private.comun_bus_directions from public, anon, authenticated;
revoke all on table private.comun_bus_stops from public, anon, authenticated;
revoke all on table private.comun_bus_service_calendars from public, anon, authenticated;
revoke all on table private.comun_bus_timetable_sources from public, anon, authenticated;
revoke all on table private.comun_bus_timetable_versions from public, anon, authenticated;
revoke all on table private.comun_bus_timetable_entries from public, anon, authenticated;
revoke all on table private.comun_bus_scheduled_journeys from public, anon, authenticated;
revoke all on table private.comun_bus_waiting_sessions from public, anon, authenticated;
revoke all on table private.comun_bus_waiting_events from public, anon, authenticated;
revoke all on table private.comun_bus_observed_arrivals from public, anon, authenticated;
revoke all on table private.comun_bus_vehicle_observations from public, anon, authenticated;
revoke all on table private.comun_bus_accessibility_observations from public, anon, authenticated;
revoke all on table private.comun_bus_transport_problems from public, anon, authenticated;
revoke all on table private.comun_bus_complaint_drafts from public, anon, authenticated;
revoke all on table private.comun_bus_channel_candidates from public, anon, authenticated;
revoke all on table private.comun_bus_observatory_snapshots from public, anon, authenticated;

revoke all on function private.comun_bus_reject_append_only() from public, anon, authenticated;
grant execute on function private.comun_bus_reject_append_only() to service_role;

insert into private.comun_bus_channel_candidates(label,channel_type,channel_value,description,source_origin)
values('WhatsApp de Ônibus — STMU','whatsapp','(24) 99295-8558','Selecionar opção de reclamações e fornecer os dados da ocorrência.','informado pelo responsável do produto');

-- Fixtures sintéticas locais, sem pontos ou linhas reais.
with authority as (
  insert into private.comun_bus_authorities(public_name,sphere,territory,source_reference,verification_state)
  values('Autoridade sintética de transporte','unknown','fixture-local','fixture://comun-bus-48-0e','source_verified') returning id
), line as (
  insert into private.comun_bus_lines(public_code,public_name,authority_id,state,source_reference)
  select 'FIX-01','Linha Fixture 01',id,'active','fixture://comun-bus-48-0e' from authority returning id
), pattern as (
  insert into private.comun_bus_route_patterns(line_id,pattern_code,description,source_reference)
  select id,'FIX-P1','Itinerário sintético de teste','fixture://comun-bus-48-0e' from line returning id,line_id
), direction as (
  insert into private.comun_bus_directions(line_id,public_name,destination,route_pattern_id,state)
  select line_id,'Centro Fixture','Terminal Fixture',id,'active' from pattern returning id,line_id
), stop as (
  insert into private.comun_bus_stops(public_code,public_name,approximate_location,state,source_reference,verification_state)
  values('FIX-STOP-01','Ponto Fixture Central','local sintético, sem coordenada real','active','fixture://comun-bus-48-0e','source_verified') returning id
), calendar as (
  insert into private.comun_bus_service_calendars(code,label,day_type,valid_from)
  values('FIX-WEEKDAY','Fixture dia útil','weekday','2026-01-01') returning id
), source as (
  insert into private.comun_bus_timetable_sources(label,reference,source_kind,consulted_at,normalized_sha256,responsible_reference)
  values('Fonte sintética local','fixture://comun-bus-48-0e','synthetic_fixture',now(),repeat('0',64),'fixture') returning id
), timetable as (
  insert into private.comun_bus_timetable_versions(line_id,direction_id,source_id,version_label,valid_from,state,normalized_sha256,import_method,verified_by)
  select line.id,direction.id,source.id,'fixture-v1','2026-01-01','active',repeat('0',64),'validated_json','fixture' from line,direction,source returning id
)
insert into private.comun_bus_timetable_entries(timetable_version_id,stop_id,service_calendar_id,sequence_number,departure_time)
select timetable.id,stop.id,calendar.id,0,'10:00'::time from timetable,stop,calendar;

create or replace function public.comun_bus_list_lines()
returns jsonb language sql stable security definer set search_path = 'pg_catalog'
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'publicCode',l.public_code,'publicName',l.public_name,'state',l.state) order by l.public_code),'[]'::jsonb)
  from private.comun_bus_lines l where l.state = 'active';
$$;

create or replace function public.comun_bus_list_stops()
returns jsonb language sql stable security definer set search_path = 'pg_catalog'
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'publicCode',s.public_code,'publicName',s.public_name,'approximateLocation',s.approximate_location) order by s.public_name),'[]'::jsonb)
  from private.comun_bus_stops s where s.state = 'active';
$$;

create or replace function public.comun_bus_get_timetable(p_line_id uuid)
returns jsonb language sql stable security definer set search_path = 'pg_catalog'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId',v.line_id,'versionId',v.id,'versionLabel',v.version_label,'validFrom',v.valid_from,
    'directionId',v.direction_id,'direction',d.public_name,'destination',d.destination,
    'stopId',e.stop_id,'stop',s.public_name,'dayType',c.day_type,'departureTime',e.departure_time,'serviceDayOffset',e.service_day_offset,
    'sourceState',v.state,'sourceReference',src.reference
  ) order by d.public_name,e.departure_time),'[]'::jsonb)
  from private.comun_bus_timetable_versions v
  join private.comun_bus_directions d on d.id=v.direction_id
  join private.comun_bus_timetable_entries e on e.timetable_version_id=v.id
  join private.comun_bus_stops s on s.id=e.stop_id
  join private.comun_bus_service_calendars c on c.id=e.service_calendar_id
  join private.comun_bus_timetable_sources src on src.id=v.source_id
  where v.line_id=p_line_id and v.state='active';
$$;

create or replace function public.comun_bus_start_waiting(
  p_token_hash text, p_line_id uuid, p_direction_id uuid, p_stop_id uuid,
  p_timetable_version_id uuid, p_service_date date, p_scheduled_time time
)
returns jsonb language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_session private.comun_bus_waiting_sessions%rowtype;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception using errcode='22023',message='COMUN_BUS_INVALID_SESSION_PROOF'; end if;
  select * into v_session from private.comun_bus_waiting_sessions where session_token_hash=decode(p_token_hash,'hex') and state='started' limit 1;
  if found then
    return jsonb_build_object('id',v_session.id,'state',v_session.state,'startedAt',v_session.started_at,'serviceDate',v_session.service_date,'scheduledTime',v_session.scheduled_time,'lineId',v_session.line_id,'directionId',v_session.direction_id,'stopId',v_session.stop_id,'timetableVersionId',v_session.timetable_version_id);
  end if;
  if not exists(select 1 from private.comun_bus_lines where id=p_line_id and state='active')
    or not exists(select 1 from private.comun_bus_directions where id=p_direction_id and line_id=p_line_id and state='active')
    or not exists(select 1 from private.comun_bus_stops where id=p_stop_id and state='active') then
    raise exception using errcode='22023',message='COMUN_BUS_REFERENCE_INVALID';
  end if;
  insert into private.comun_bus_waiting_sessions(session_token_hash,line_id,direction_id,stop_id,timetable_version_id,service_date,scheduled_time)
  values(decode(p_token_hash,'hex'),p_line_id,p_direction_id,p_stop_id,p_timetable_version_id,p_service_date,p_scheduled_time)
  returning * into v_session;
  insert into private.comun_bus_waiting_events(session_id,event_type,payload) values(v_session.id,'started','{}'::jsonb);
  return jsonb_build_object('id',v_session.id,'state',v_session.state,'startedAt',v_session.started_at,'serviceDate',v_session.service_date,'scheduledTime',v_session.scheduled_time,'lineId',v_session.line_id,'directionId',v_session.direction_id,'stopId',v_session.stop_id,'timetableVersionId',v_session.timetable_version_id);
exception when unique_violation then
  select * into v_session from private.comun_bus_waiting_sessions where session_token_hash=decode(p_token_hash,'hex') and state='started' limit 1;
  return jsonb_build_object('id',v_session.id,'state',v_session.state,'startedAt',v_session.started_at,'serviceDate',v_session.service_date,'scheduledTime',v_session.scheduled_time,'lineId',v_session.line_id,'directionId',v_session.direction_id,'stopId',v_session.stop_id,'timetableVersionId',v_session.timetable_version_id);
end;
$$;

create or replace function public.comun_bus_current_waiting(p_token_hash text)
returns jsonb language sql stable security definer set search_path = 'pg_catalog'
as $$
  select coalesce((select jsonb_build_object('id',s.id,'state',s.state,'startedAt',s.started_at,'endedAt',s.ended_at,'serviceDate',s.service_date,'scheduledTime',s.scheduled_time,'lineId',s.line_id,'directionId',s.direction_id,'stopId',s.stop_id,'timetableVersionId',s.timetable_version_id)
  from private.comun_bus_waiting_sessions s where p_token_hash ~ '^[a-f0-9]{64}$' and s.session_token_hash=decode(p_token_hash,'hex') and s.state='started' limit 1),'null'::jsonb);
$$;

create or replace function public.comun_bus_record_event(
  p_token_hash text, p_session_id uuid, p_event_type text, p_observed_at timestamptz, p_payload jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_session private.comun_bus_waiting_sessions%rowtype; v_delta integer; v_state text;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_event_type not in ('bus_arrived','passed_without_stopping','user_cancelled','observation_ended','not_observed_during_session') then raise exception using errcode='22023',message='COMUN_BUS_EVENT_INVALID'; end if;
  select * into v_session from private.comun_bus_waiting_sessions where id=p_session_id and session_token_hash=decode(p_token_hash,'hex') for update;
  if not found or v_session.state <> 'started' then raise exception using errcode='42501',message='COMUN_BUS_SESSION_UNAVAILABLE'; end if;
  v_state := case p_event_type when 'bus_arrived' then 'bus_arrived' when 'passed_without_stopping' then 'passed_without_stopping' when 'user_cancelled' then 'user_cancelled' when 'observation_ended' then 'observation_ended' else 'not_observed_during_session' end;
  insert into private.comun_bus_waiting_events(session_id,event_type,observed_at,payload) values(p_session_id,p_event_type,p_observed_at,coalesce(p_payload,'{}'::jsonb));
  update private.comun_bus_waiting_sessions set state=v_state,ended_at=now(),updated_at=now() where id=p_session_id returning * into v_session;
  if p_event_type='bus_arrived' then
    if p_observed_at is not null and v_session.scheduled_time is not null then
      v_delta := round(extract(epoch from (p_observed_at - (p_observed_at::date + v_session.scheduled_time))) / 60);
      if v_delta > 720 then v_delta := v_delta - 1440; elsif v_delta < -720 then v_delta := v_delta + 1440; end if;
    end if;
    insert into private.comun_bus_observed_arrivals(session_id,observed_at,official_time,difference_minutes,calculation_state)
    values(p_session_id,p_observed_at,v_session.scheduled_time,v_delta,case when v_delta is null then 'not_calculable' when v_delta < -5 then 'early' when v_delta <= 5 then 'on_time_window' else 'late' end);
  end if;
  return jsonb_build_object('id',v_session.id,'state',v_session.state,'startedAt',v_session.started_at,'endedAt',v_session.ended_at,'serviceDate',v_session.service_date,'scheduledTime',v_session.scheduled_time,'lineId',v_session.line_id,'directionId',v_session.direction_id,'stopId',v_session.stop_id,'differenceMinutes',v_delta);
end;
$$;

create or replace function public.comun_bus_link_relata(
  p_token_hash text, p_session_id uuid, p_protocol text, p_preview jsonb, p_problem_kind text, p_description text
)
returns jsonb language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_session private.comun_bus_waiting_sessions%rowtype; v_id uuid;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_protocol !~ '^COMUN-RELATA-[A-F0-9]{16}$' or p_problem_kind not in ('observed_delay','not_observed_during_session','passed_without_stopping','overcrowding','accessibility_failure','vehicle_condition','route_or_timetable_information','staff_conduct_private') then raise exception using errcode='22023',message='COMUN_BUS_RELATA_LINK_INVALID'; end if;
  select * into v_session from private.comun_bus_waiting_sessions where id=p_session_id and session_token_hash=decode(p_token_hash,'hex');
  if not found then raise exception using errcode='42501',message='COMUN_BUS_SESSION_UNAVAILABLE'; end if;
  insert into private.comun_bus_transport_problems(session_id,problem_kind,description_private,relato_protocol) values(p_session_id,p_problem_kind,left(p_description,600),p_protocol) returning id into v_id;
  insert into private.comun_bus_complaint_drafts(session_id,report_protocol,preview) values(p_session_id,p_protocol,coalesce(p_preview,'{}'::jsonb));
  update public.comun_relata_cases set category='public_transport',routing_decision=jsonb_build_object('category','public_transport','source','comun-bus-local-48-0e','problemKind',p_problem_kind) where protocol=p_protocol and protocol_kind='comun' and is_official=false;
  return jsonb_build_object('linked',true,'problemId',v_id,'protocol',p_protocol,'noOfficialSend',true,'sentToStmu',false);
end;
$$;

create or replace function public.comun_bus_get_observatory()
returns jsonb language sql stable security definer set search_path = 'pg_catalog'
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'lineId',s.line_id,'directionId',s.direction_id,'stopId',s.stop_id,'dayType',s.day_type,'periodStart',s.period_start,'periodEnd',s.period_end,'sampleSize',s.sample_size,'metrics',s.metrics,'methodologyVersion',s.methodology_version) order by s.period_end desc),'[]'::jsonb)
  from private.comun_bus_observatory_snapshots s where s.visibility='local_only';
$$;

create or replace function public.comun_bus_get_channel_candidate()
returns jsonb language sql stable security definer set search_path = 'pg_catalog'
as $$
  select coalesce((select jsonb_build_object('label',c.label,'channelType',c.channel_type,'channelValue',c.channel_value,'description',c.description,'verificationState',c.verification_state,'sendingEnabled',false,'deepLinkEnabled',false,'protocolBehavior',c.protocol_behavior) from private.comun_bus_channel_candidates c where c.verification_state='candidate' limit 1),'null'::jsonb);
$$;

do $$ declare f text; begin
  foreach f in array array['comun_bus_list_lines()','comun_bus_list_stops()','comun_bus_get_timetable(uuid)','comun_bus_start_waiting(text,uuid,uuid,uuid,uuid,date,time)','comun_bus_current_waiting(text)','comun_bus_record_event(text,uuid,text,timestamptz,jsonb)','comun_bus_link_relata(text,uuid,text,jsonb,text,text)','comun_bus_get_observatory()','comun_bus_get_channel_candidate()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated',f);
    execute format('grant execute on function public.%s to service_role',f);
  end loop;
end $$;
