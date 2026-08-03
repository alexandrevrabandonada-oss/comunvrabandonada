-- COMUN 48.0D: additive, local-only sanitized projection. Never promote remotely.
-- The 48.0B public snapshot remains locked by its CHECK(false) and trigger.
create table if not exists private.comun_relata_public_projection_candidates (
  collective_case_id uuid primary key references public.comun_relata_collective_cases(id) on delete restrict,
  cell_x bigint not null,
  cell_y bigint not null,
  grid_meters integer not null check (grid_meters in (300,800,1000)),
  public_latitude double precision not null check (public_latitude between -85.05112878 and 85.05112878),
  public_longitude double precision not null check (public_longitude between -180 and 180),
  uncertainty_radius_meters double precision not null check (uncertainty_radius_meters >= 0),
  source_contract text not null check (source_contract = 'relata-public-projection-v1'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.comun_relata_public_projections (
  public_id uuid primary key default gen_random_uuid(),
  collective_case_id uuid not null unique references public.comun_relata_collective_cases(id) on delete restrict,
  category text not null check (category in ('public_lighting','power_distribution','smoke_or_environmental_trace')),
  community_state text not null check (community_state in ('active','inactive','review_future')),
  report_count integer not null default 0 check (report_count >= 0),
  confirmation_count integer not null default 0 check (confirmation_count >= 0),
  first_seen_date date not null,
  last_activity_date date not null,
  public_latitude double precision not null check (public_latitude between -85.05112878 and 85.05112878),
  public_longitude double precision not null check (public_longitude between -180 and 180),
  uncertainty_radius_meters double precision not null check (uncertainty_radius_meters >= 0),
  policy_version text not null check (policy_version = 'relata-public-projection-v1'),
  eligibility_reason text not null check (eligibility_reason ~ '^[a-z0-9_]{3,80}$'),
  projection_state text not null check (projection_state in ('blocked','eligible_auto_local','review_required','visible_local_preview','suppressed','inactive','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.comun_relata_public_projection_events (
  id bigint generated always as identity primary key,
  public_id uuid not null references private.comun_relata_public_projections(public_id) on delete restrict,
  event_type text not null check (event_type in ('created','state_changed','count_changed','suppressed','withdrawn','corrected')),
  result_code text not null check (result_code ~ '^RELATA_[A-Z0-9_]{3,80}$'),
  occurred_at timestamptz not null default now()
);

create table if not exists private.comun_relata_public_confirmations (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null references private.comun_relata_public_projections(public_id) on delete restrict,
  token_hash bytea not null check (octet_length(token_hash) = 32),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (public_id, token_hash)
);
create unique index if not exists comun_relata_public_confirmation_active_idx
  on private.comun_relata_public_confirmations(public_id, token_hash) where active;

create table if not exists private.comun_relata_public_confirmation_events (
  id bigint generated always as identity primary key,
  confirmation_id uuid not null references private.comun_relata_public_confirmations(id) on delete restrict,
  event_type text not null check (event_type in ('confirmed','undone')),
  occurred_at timestamptz not null default now()
);

create or replace function private.comun_relata_public_precision_guard()
returns trigger language plpgsql security definer set search_path='pg_catalog'
as $$
begin
  if tg_table_name = 'comun_relata_public_projections' and tg_op = 'UPDATE'
    and new.uncertainty_radius_meters < old.uncertainty_radius_meters then
    new.uncertainty_radius_meters := old.uncertainty_radius_meters;
  end if;
  return new;
end;
$$;
drop trigger if exists comun_relata_public_precision_guard on private.comun_relata_public_projections;
create trigger comun_relata_public_precision_guard
before update on private.comun_relata_public_projections
for each row execute function private.comun_relata_public_precision_guard();

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

revoke all on table private.comun_relata_public_projection_candidates,
  private.comun_relata_public_projections,
  private.comun_relata_public_projection_events,
  private.comun_relata_public_confirmations,
  private.comun_relata_public_confirmation_events from public, anon, authenticated;
grant select, insert, update, delete on table private.comun_relata_public_projection_candidates,
  private.comun_relata_public_projections,
  private.comun_relata_public_projection_events,
  private.comun_relata_public_confirmations,
  private.comun_relata_public_confirmation_events to service_role;
grant usage, select on all sequences in schema private to service_role;

comment on table private.comun_relata_public_projections is 'Sanitized local preview only; no protocol, report, text, attachment, exact coordinate or official status.';
comment on table private.comun_relata_public_confirmations is 'First-party hashed confirmation token; never a report, account or contact.';

create or replace function public.comun_relata_public_list(
  p_category text default null,
  p_projection_state text default 'visible_local_preview',
  p_limit integer default 100
)
returns table (
  public_id uuid, category text, community_state text, report_count integer,
  confirmation_count integer, first_seen_date date, last_activity_date date,
  public_latitude double precision, public_longitude double precision,
  uncertainty_radius_meters double precision, policy_version text,
  eligibility_reason text, projection_state text, created_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer set search_path='pg_catalog'
as $$
begin
  if p_category is not null and p_category not in ('public_lighting','power_distribution','smoke_or_environmental_trace') then
    raise exception using errcode='22023',message='RELATA_PUBLIC_CATEGORY_INVALID';
  end if;
  if p_projection_state not in ('visible_local_preview','eligible_auto_local','review_required','suppressed','inactive') then
    raise exception using errcode='22023',message='RELATA_PUBLIC_STATE_INVALID';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception using errcode='22023',message='RELATA_PUBLIC_LIMIT_INVALID';
  end if;
  return query select p.public_id,p.category,p.community_state,p.report_count,p.confirmation_count,
    p.first_seen_date,p.last_activity_date,p.public_latitude,p.public_longitude,
    p.uncertainty_radius_meters,p.policy_version,p.eligibility_reason,p.projection_state,p.created_at,p.updated_at
  from private.comun_relata_public_projections p
  where (p_category is null or p.category=p_category) and p.projection_state=p_projection_state
  order by p.last_activity_date desc,p.public_id
  limit p_limit;
end;
$$;

create or replace function public.comun_relata_public_get(p_public_id uuid)
returns table (
  public_id uuid, category text, community_state text, report_count integer,
  confirmation_count integer, first_seen_date date, last_activity_date date,
  public_latitude double precision, public_longitude double precision,
  uncertainty_radius_meters double precision, policy_version text,
  eligibility_reason text, projection_state text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path='pg_catalog'
as $$
  select p.public_id,p.category,p.community_state,p.report_count,p.confirmation_count,
    p.first_seen_date,p.last_activity_date,p.public_latitude,p.public_longitude,
    p.uncertainty_radius_meters,p.policy_version,p.eligibility_reason,p.projection_state,p.created_at,p.updated_at
  from private.comun_relata_public_projections p
  where p.public_id=p_public_id and p.projection_state in ('visible_local_preview','eligible_auto_local','review_required');
$$;

create or replace function public.comun_relata_public_confirm(
  p_public_id uuid,p_token_hash bytea,p_undo boolean default false
)
returns table (active boolean, confirmation_count integer)
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_id uuid; v_active boolean;
begin
  if p_token_hash is null or octet_length(p_token_hash) <> 32 then raise exception using errcode='22023',message='RELATA_PUBLIC_TOKEN_INVALID'; end if;
  if not exists(select 1 from private.comun_relata_public_projections where public_id=p_public_id and projection_state in ('visible_local_preview','eligible_auto_local','review_required')) then return; end if;
  select id,active into v_id,v_active from private.comun_relata_public_confirmations where public_id=p_public_id and token_hash=p_token_hash for update;
  if p_undo then
    if v_id is not null and v_active then
      update private.comun_relata_public_confirmations set active=false,withdrawn_at=now() where id=v_id;
      insert into private.comun_relata_public_confirmation_events(confirmation_id,event_type) values(v_id,'undone');
    end if;
  elsif v_id is null then
    insert into private.comun_relata_public_confirmations(public_id,token_hash) values(p_public_id,p_token_hash) returning id into v_id;
    insert into private.comun_relata_public_confirmation_events(confirmation_id,event_type) values(v_id,'confirmed');
  elsif not v_active then
    update private.comun_relata_public_confirmations set active=true,withdrawn_at=null where id=v_id;
    insert into private.comun_relata_public_confirmation_events(confirmation_id,event_type) values(v_id,'confirmed');
  end if;
  return query select coalesce((select active from private.comun_relata_public_confirmations where id=v_id),false),
    (select count(*)::integer from private.comun_relata_public_confirmations c where c.public_id=p_public_id and c.active);
end;
$$;

revoke all on function public.comun_relata_public_list(text,text,integer), public.comun_relata_public_get(uuid), public.comun_relata_public_confirm(uuid,bytea,boolean) from public,anon,authenticated;
grant execute on function public.comun_relata_public_list(text,text,integer), public.comun_relata_public_get(uuid), public.comun_relata_public_confirm(uuid,bytea,boolean) to service_role;
