begin;

-- COMUN 48.6-B0: new Production foundation, not a promotion of the
-- local-only 48.0D map. Schema only; no backfill and no projection rows.
do $$
begin
  if to_regclass('public.comun_relata_cases') is null
     or to_regclass('private.comun_relata_reports') is null
     or to_regclass('private.comun_relata_private_locations') is null
     or to_regclass('public.comun_relata_evidence_consents') is null
     or to_regclass('public.comun_relata_public_snapshots') is null then
    raise exception using errcode='P0001', message='COMUN_48_6_B0_BLOCKED_MISSING_RELATA_ROOT';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('comun_relata_public_list','comun_relata_public_get','comun_relata_public_confirm'))
    or to_regclass('private.comun_relata_public_projection_candidates') is not null
    or to_regclass('private.comun_relata_public_projections') is not null
    or to_regclass('private.comun_relata_public_projection_events') is not null
    or to_regclass('private.comun_relata_public_confirmations') is not null
    or to_regclass('private.comun_relata_public_confirmation_events') is not null then
    raise exception using errcode='P0001', message='COMUN_48_6_B0_BLOCKED_LOCAL_PROJECTION_DRIFT';
  end if;
  if to_regclass('public.comun_relata_collective_cases') is not null
    or to_regclass('public.comun_relata_case_memberships') is not null
    or to_regclass('private.comun_relata_case_match_keys') is not null
    or to_regclass('public.comun_relata_case_match_events') is not null
    or to_regclass('private.comun_relata_public_projection_consents') is not null then
    raise exception using errcode='P0001', message='COMUN_48_6_B0_BLOCKED_COLLECTIVE_SCHEMA_DRIFT';
  end if;
end;
$$;

create table public.comun_relata_collective_cases (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'public_lighting','power_distribution','water_supply','public_transport',
    'electrical_hazard','active_fire','smoke_or_environmental_trace',
    'sidewalk_accessibility','waste_or_debris','public_health',
    'public_education','child_protection','workplace','environmental_pollution',
    'urban_flooding','stormwater_drainage','tree_hazard','other')),
  collective_urgency text not null check (collective_urgency in ('routine','attention','urgent','emergency')),
  state text not null default 'active' check (state in ('active','inactive','review_future')),
  match_rule text not null,
  match_rule_version text not null check (match_rule_version='relata-match-v1'),
  active_members_count integer not null default 0 check (active_members_count>=0),
  first_report_at timestamptz not null,
  last_report_at timestamptz not null,
  confidence_level text not null check (confidence_level in ('high','medium','low','blocked')),
  future_map_eligibility boolean not null default false,
  review_state text not null default 'not_requested' check (review_state in ('not_requested','future_review_required','corrected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comun_relata_case_memberships (
  id uuid primary key default gen_random_uuid(),
  collective_case_id uuid not null references public.comun_relata_collective_cases(id) on delete restrict,
  individual_case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  membership_role text not null default 'report' check (membership_role in ('seed','report')),
  association_method text not null check (association_method in (
    'auto_link_high_confidence','candidate_medium_confidence','new_collective_case',
    'never_auto_link','human_review_future')),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  match_rule_version text not null check (match_rule_version='relata-match-v1'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  constraint comun_relata_membership_end_check check (
    (active and ended_at is null and end_reason is null)
    or (not active and ended_at is not null and end_reason ~ '^RELATA_[A-Z0-9_]{3,80}$'))
);
create unique index comun_relata_one_active_membership_idx
  on public.comun_relata_case_memberships(individual_case_id) where active;
create index comun_relata_collective_active_members_idx
  on public.comun_relata_case_memberships(collective_case_id,created_at) where active;

create table private.comun_relata_case_match_keys (
  id bigint generated always as identity primary key,
  individual_case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  collective_case_id uuid not null references public.comun_relata_collective_cases(id) on delete restrict,
  key_hash bytea not null check (octet_length(key_hash)=32),
  match_rule_version text not null check (match_rule_version='relata-match-v1'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  unique(individual_case_id,key_hash,created_at)
);
create index comun_relata_match_key_lookup_idx
  on private.comun_relata_case_match_keys(key_hash,created_at desc) where active;

create table public.comun_relata_case_match_events (
  id bigint generated always as identity primary key,
  individual_case_id uuid not null references public.comun_relata_cases(id) on delete restrict,
  previous_collective_case_id uuid references public.comun_relata_collective_cases(id) on delete restrict,
  collective_case_id uuid not null references public.comun_relata_collective_cases(id) on delete restrict,
  decision text not null check (decision in (
    'auto_link_high_confidence','candidate_medium_confidence','new_collective_case',
    'never_auto_link','human_review_future','withdrawn_unlinked')),
  confidence_level text not null check (confidence_level in ('high','medium','low','blocked')),
  match_rule_version text not null check (match_rule_version='relata-match-v1'),
  result_code text not null check (result_code ~ '^RELATA_[A-Z0-9_]{3,80}$'),
  occurred_at timestamptz not null default now()
);

-- Explicit map consent is separate from forwarding and private grouping
-- consent. Existing evidence consent remains public-projection=false.
create table private.comun_relata_public_projection_consents (
  case_id uuid primary key references public.comun_relata_cases(id) on delete restrict,
  consent_version text not null check (consent_version='relata-public-projection-v1'),
  scope text not null check (scope='collective_projection'),
  active boolean not null default true,
  declared_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint comun_relata_public_projection_consent_state check (
    (active and withdrawn_at is null) or (not active and withdrawn_at is not null))
);

create table private.comun_relata_public_projection_candidates (
  collective_case_id uuid primary key references public.comun_relata_collective_cases(id) on delete restrict,
  cell_x bigint not null, cell_y bigint not null,
  grid_meters integer not null check (grid_meters in (300,800,1000)),
  public_latitude double precision not null check (public_latitude between -85.05112878 and 85.05112878),
  public_longitude double precision not null check (public_longitude between -180 and 180),
  uncertainty_radius_meters double precision not null check (uncertainty_radius_meters >= grid_meters),
  source_contract text not null check (source_contract='relata-public-projection-v1'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table private.comun_relata_public_projections (
  public_id uuid primary key default gen_random_uuid(),
  collective_case_id uuid not null unique references public.comun_relata_collective_cases(id) on delete restrict,
  category text not null check (category in ('public_lighting','power_distribution','smoke_or_environmental_trace')),
  community_state text not null check (community_state in ('active','inactive','review_future')),
  report_count integer not null default 0 check (report_count>=0),
  confirmation_count integer not null default 0 check (confirmation_count>=0),
  first_seen_date date not null, last_activity_date date not null,
  public_latitude double precision not null check (public_latitude between -85.05112878 and 85.05112878),
  public_longitude double precision not null check (public_longitude between -180 and 180),
  uncertainty_radius_meters double precision not null check (uncertainty_radius_meters>=0),
  policy_version text not null check (policy_version='relata-public-projection-v1'),
  eligibility_reason text not null check (eligibility_reason ~ '^[a-z0-9_]{3,80}$'),
  projection_state text not null check (projection_state in ('blocked','active','review_required','suppressed','inactive','withdrawn')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table private.comun_relata_public_projection_events (
  id bigint generated always as identity primary key,
  public_id uuid not null references private.comun_relata_public_projections(public_id) on delete restrict,
  event_type text not null check (event_type in ('created','state_changed','count_changed','suppressed','withdrawn','corrected')),
  result_code text not null check (result_code ~ '^RELATA_[A-Z0-9_]{3,80}$'),
  occurred_at timestamptz not null default now()
);
create table private.comun_relata_public_confirmations (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null references private.comun_relata_public_projections(public_id) on delete restrict,
  token_hash bytea not null check (octet_length(token_hash)=32),
  active boolean not null default true, created_at timestamptz not null default now(),
  withdrawn_at timestamptz, unique(public_id,token_hash),
  constraint comun_relata_public_confirmation_state check (
    (active and withdrawn_at is null) or (not active and withdrawn_at is not null))
);
create unique index comun_relata_public_confirmation_active_idx
  on private.comun_relata_public_confirmations(public_id,token_hash) where active;
create table private.comun_relata_public_confirmation_events (
  id bigint generated always as identity primary key,
  confirmation_id uuid not null references private.comun_relata_public_confirmations(id) on delete restrict,
  event_type text not null check (event_type in ('confirmed','undone')),
  occurred_at timestamptz not null default now()
);

create or replace function private.comun_relata_reject_public_projection_event_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog,private as $$
begin
  raise exception using errcode='42501',message='COMUN_RELATA_PUBLIC_PROJECTION_EVENT_APPEND_ONLY';
end;
$$;
create or replace function private.comun_relata_public_projection_precision_guard()
returns trigger language plpgsql security definer set search_path=pg_catalog,private as $$
begin
  if new.uncertainty_radius_meters < old.uncertainty_radius_meters then
    new.uncertainty_radius_meters := old.uncertainty_radius_meters;
  end if;
  return new;
end;
$$;
create trigger comun_relata_public_projection_precision_guard
before update on private.comun_relata_public_projections
for each row execute function private.comun_relata_public_projection_precision_guard();
create trigger comun_relata_public_projection_events_append_only
before update or delete on private.comun_relata_public_projection_events
for each row execute function private.comun_relata_reject_public_projection_event_mutation();
create trigger comun_relata_public_confirmation_events_append_only
before update or delete on private.comun_relata_public_confirmation_events
for each row execute function private.comun_relata_reject_public_projection_event_mutation();

create or replace function private.comun_relata_public_projection_set_candidate(
  p_collective_case_id uuid,p_cell_x bigint,p_cell_y bigint,p_grid_meters integer,
  p_public_latitude double precision,p_public_longitude double precision,
  p_uncertainty_radius_meters double precision)
returns void language plpgsql security invoker
set search_path=pg_catalog,private,public as $$
declare v_category text; v_expected_grid integer;
begin
  select category into v_category from public.comun_relata_collective_cases where id=p_collective_case_id;
  if not found then raise exception using errcode='P0001',message='COMUN_RELATA_COLLECTIVE_NOT_FOUND'; end if;
  v_expected_grid:=case v_category when 'public_lighting' then 300 when 'power_distribution' then 800 when 'smoke_or_environmental_trace' then 1000 else 0 end;
  if v_expected_grid=0 or p_grid_meters<>v_expected_grid then
    raise exception using errcode='P0001',message='COMUN_RELATA_PUBLIC_CATEGORY_NOT_ALLOWLISTED';
  end if;
  if p_uncertainty_radius_meters < p_grid_meters
     or p_public_latitude not between -85.05112878 and 85.05112878
     or p_public_longitude not between -180 and 180 then
    raise exception using errcode='22023',message='COMUN_RELATA_PUBLIC_SPATIAL_PRECISION_INVALID';
  end if;
  insert into private.comun_relata_public_projection_candidates(
    collective_case_id,cell_x,cell_y,grid_meters,public_latitude,public_longitude,
    uncertainty_radius_meters,source_contract)
  values(p_collective_case_id,p_cell_x,p_cell_y,p_grid_meters,p_public_latitude,p_public_longitude,
    p_uncertainty_radius_meters,'relata-public-projection-v1')
  on conflict(collective_case_id) do update set
    cell_x=excluded.cell_x,cell_y=excluded.cell_y,grid_meters=excluded.grid_meters,
    public_latitude=excluded.public_latitude,public_longitude=excluded.public_longitude,
    uncertainty_radius_meters=greatest(private.comun_relata_public_projection_candidates.uncertainty_radius_meters,excluded.uncertainty_radius_meters),
    updated_at=now();
end;
$$;

-- Future-only primitive. B0 never invokes it. It projects only after the
-- release gate future_map_eligibility is enabled and consent is explicit.
create or replace function private.comun_relata_public_projection_recompute(p_collective_case_id uuid)
returns table(result_code text,projection_state text,eligible_report_count integer)
language plpgsql security invoker set search_path=pg_catalog,private,public as $$
declare v_collective public.comun_relata_collective_cases%rowtype;
  v_candidate private.comun_relata_public_projection_candidates%rowtype;
  v_count integer; v_minimum integer;
begin
  select * into v_collective from public.comun_relata_collective_cases where id=p_collective_case_id for update;
  if not found then return query select 'RELATA_PUBLIC_COLLECTIVE_NOT_FOUND','blocked',0; return; end if;
  v_minimum:=case v_collective.category when 'public_lighting' then 1 when 'power_distribution' then 2 when 'smoke_or_environmental_trace' then 1 else 0 end;
  if v_minimum=0 then return query select 'RELATA_PUBLIC_CATEGORY_BLOCKED','blocked',0; return; end if;
  select count(*)::integer into v_count
  from public.comun_relata_case_memberships m
  join public.comun_relata_cases c on c.id=m.individual_case_id
  join private.comun_relata_public_projection_consents consent on consent.case_id=c.id
  where m.collective_case_id=p_collective_case_id and m.active and c.state<>'withdrawn' and consent.active;
  if v_count<v_minimum then
    update private.comun_relata_public_projections
      set report_count=v_count,projection_state='suppressed',updated_at=now()
      where collective_case_id=p_collective_case_id;
    insert into private.comun_relata_public_projection_events(public_id,event_type,result_code)
      select public_id,'suppressed','RELATA_PUBLIC_MINIMUM_NOT_MET'
      from private.comun_relata_public_projections where collective_case_id=p_collective_case_id;
    return query select 'RELATA_PUBLIC_MINIMUM_NOT_MET','suppressed',v_count;
    return;
  end if;
  if not v_collective.future_map_eligibility then
    return query select 'RELATA_PUBLIC_ELIGIBILITY_NOT_RELEASED','review_required',v_count;
    return;
  end if;
  select * into v_candidate from private.comun_relata_public_projection_candidates where collective_case_id=p_collective_case_id;
  if not found then return query select 'RELATA_PUBLIC_SPATIAL_CANDIDATE_MISSING','review_required',v_count; return; end if;
  insert into private.comun_relata_public_projections(
    collective_case_id,category,community_state,report_count,confirmation_count,
    first_seen_date,last_activity_date,public_latitude,public_longitude,
    uncertainty_radius_meters,policy_version,eligibility_reason,projection_state)
  values(v_collective.id,v_collective.category,v_collective.state,v_count,0,
    v_collective.first_report_at::date,v_collective.last_report_at::date,
    v_candidate.public_latitude,v_candidate.public_longitude,v_candidate.uncertainty_radius_meters,
    'relata-public-projection-v1','explicit_projection_consent','active')
  on conflict(collective_case_id) do update set community_state=excluded.community_state,
    report_count=excluded.report_count,last_activity_date=excluded.last_activity_date,
    projection_state='active',updated_at=now();
  insert into private.comun_relata_public_projection_events(public_id,event_type,result_code)
    select public_id,'count_changed','RELATA_PUBLIC_PROJECTION_RECOMPUTED'
    from private.comun_relata_public_projections where collective_case_id=p_collective_case_id;
  return query select 'RELATA_PUBLIC_PROJECTION_READY','active',v_count;
end;
$$;

create or replace function public.comun_denuncias_public_list(p_category text default null,p_limit integer default 100)
returns table(public_id uuid,category text,community_state text,report_count integer,confirmation_count integer,
  first_seen_date date,last_activity_date date,public_latitude double precision,public_longitude double precision,
  uncertainty_radius_meters double precision,policy_version text,eligibility_reason text,projection_state text,
  created_at timestamptz,updated_at timestamptz)
language sql security invoker set search_path=pg_catalog,private,public as $$
 select p.public_id,p.category,p.community_state,p.report_count,p.confirmation_count,p.first_seen_date,p.last_activity_date,
 p.public_latitude,p.public_longitude,p.uncertainty_radius_meters,p.policy_version,p.eligibility_reason,p.projection_state,p.created_at,p.updated_at
 from private.comun_relata_public_projections p where p.projection_state='active'
 and (p_category is null or p.category=p_category)
 order by p.last_activity_date desc,p.public_id limit least(greatest(coalesce(p_limit,100),1),100);
$$;
create or replace function public.comun_denuncias_public_get(p_public_id uuid)
returns table(public_id uuid,category text,community_state text,report_count integer,confirmation_count integer,
  first_seen_date date,last_activity_date date,public_latitude double precision,public_longitude double precision,
  uncertainty_radius_meters double precision,policy_version text,eligibility_reason text,projection_state text,
  created_at timestamptz,updated_at timestamptz)
language sql security invoker set search_path=pg_catalog,private,public as $$
 select p.public_id,p.category,p.community_state,p.report_count,p.confirmation_count,p.first_seen_date,p.last_activity_date,
 p.public_latitude,p.public_longitude,p.uncertainty_radius_meters,p.policy_version,p.eligibility_reason,p.projection_state,p.created_at,p.updated_at
 from private.comun_relata_public_projections p where p.public_id=p_public_id and p.projection_state='active';
$$;

alter table public.comun_relata_collective_cases enable row level security;
alter table public.comun_relata_collective_cases force row level security;
alter table public.comun_relata_case_memberships enable row level security;
alter table public.comun_relata_case_memberships force row level security;
alter table public.comun_relata_case_match_events enable row level security;
alter table public.comun_relata_case_match_events force row level security;
alter table private.comun_relata_case_match_keys enable row level security;
alter table private.comun_relata_case_match_keys force row level security;
alter table private.comun_relata_public_projection_consents enable row level security;
alter table private.comun_relata_public_projection_consents force row level security;
alter table private.comun_relata_public_projection_candidates enable row level security;
alter table private.comun_relata_public_projection_candidates force row level security;
alter table private.comun_relata_public_projections enable row level security;
alter table private.comun_relata_public_projections force row level security;
alter table private.comun_relata_public_projection_events enable row level security;
alter table private.comun_relata_public_projection_events force row level security;
alter table private.comun_relata_public_confirmations enable row level security;
alter table private.comun_relata_public_confirmations force row level security;
alter table private.comun_relata_public_confirmation_events enable row level security;
alter table private.comun_relata_public_confirmation_events force row level security;

revoke all privileges on table public.comun_relata_collective_cases from public,anon,authenticated;
revoke all privileges on table public.comun_relata_case_memberships from public,anon,authenticated;
revoke all privileges on table public.comun_relata_case_match_events from public,anon,authenticated;
revoke all privileges on table private.comun_relata_case_match_keys from public,anon,authenticated;
revoke all privileges on table private.comun_relata_public_projection_consents from public,anon,authenticated;
revoke all privileges on table private.comun_relata_public_projection_candidates from public,anon,authenticated;
revoke all privileges on table private.comun_relata_public_projections from public,anon,authenticated;
revoke all privileges on table private.comun_relata_public_projection_events from public,anon,authenticated;
revoke all privileges on table private.comun_relata_public_confirmations from public,anon,authenticated;
revoke all privileges on table private.comun_relata_public_confirmation_events from public,anon,authenticated;
grant usage on schema private to service_role;

-- Keep the release surface narrow: operational writers use only the
-- capabilities needed by each lifecycle; event ledgers never need UPDATE or
-- DELETE. Existing private-schema privileges are intentionally untouched.
grant select,insert,update on table public.comun_relata_collective_cases to service_role;
grant select,insert,update on table public.comun_relata_case_memberships to service_role;
grant select,insert on table public.comun_relata_case_match_events to service_role;
grant select,insert,update on table private.comun_relata_case_match_keys to service_role;
grant select,insert,update on table private.comun_relata_public_projection_consents to service_role;
grant select,insert,update on table private.comun_relata_public_projection_candidates to service_role;
grant select,insert,update on table private.comun_relata_public_projections to service_role;
grant select,insert on table private.comun_relata_public_projection_events to service_role;
grant select,insert,update on table private.comun_relata_public_confirmations to service_role;
grant select,insert on table private.comun_relata_public_confirmation_events to service_role;
revoke all on function private.comun_relata_public_projection_set_candidate(uuid,bigint,bigint,integer,double precision,double precision,double precision) from public,anon,authenticated;
revoke all on function private.comun_relata_public_projection_recompute(uuid) from public,anon,authenticated;
grant execute on function private.comun_relata_public_projection_set_candidate(uuid,bigint,bigint,integer,double precision,double precision,double precision) to service_role;
grant execute on function private.comun_relata_public_projection_recompute(uuid) to service_role;
revoke all on function public.comun_denuncias_public_list(text,integer),public.comun_denuncias_public_get(uuid) from public,anon,authenticated;
grant execute on function public.comun_denuncias_public_list(text,integer),public.comun_denuncias_public_get(uuid) to service_role;
grant usage,select,update on sequence
  public.comun_relata_case_match_events_id_seq,
  private.comun_relata_case_match_keys_id_seq,
  private.comun_relata_public_projection_events_id_seq,
  private.comun_relata_public_confirmation_events_id_seq
  to service_role;

comment on table public.comun_relata_collective_cases is '48.6-B0 canonical collective substrate; no public projection by itself.';
comment on table private.comun_relata_public_projection_consents is '48.6-B0 explicit public projection consent, separate from forwarding.';
comment on table private.comun_relata_public_projections is '48.6-B0 sanitized projections; empty until a future gated rollout.';
comment on table private.comun_relata_public_confirmations is '48.6-B0 prepared only; confirmation is not active.';

commit;
