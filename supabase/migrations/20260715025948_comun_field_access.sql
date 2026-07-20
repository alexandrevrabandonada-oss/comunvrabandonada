create table public.comun_observation_campaign_access_grants(
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.comun_observation_campaigns(id) on delete cascade,
 sampling_slot_id uuid references public.comun_observation_sampling_slots(id) on delete cascade,
 assignment_id uuid references public.comun_observation_campaign_assignments(id) on delete set null,
 role text not null check(role in('field_observer','field_support','field_coordinator')),
 access_code_hash text not null unique, code_suffix text not null, status text not null default 'active' check(status in('active','used','expired','revoked','archived')),
 valid_from timestamptz, expires_at timestamptz not null, max_exchanges integer not null default 1 check(max_exchanges between 1 and 20), exchange_count integer not null default 0 check(exchange_count>=0),
 last_exchanged_at timestamptz, revoked_at timestamptz, created_by text, created_at timestamptz not null default now()
);
create table public.comun_observation_campaign_field_sessions(
 id uuid primary key default gen_random_uuid(), grant_id uuid not null references public.comun_observation_campaign_access_grants(id) on delete cascade,
 campaign_id uuid not null references public.comun_observation_campaigns(id) on delete cascade, sampling_slot_id uuid references public.comun_observation_sampling_slots(id) on delete set null,
 session_hash text not null unique, expires_at timestamptz not null, revoked_at timestamptz, onboarding_confirmed_at timestamptz, shift_started_at timestamptz, shift_completed_at timestamptz,
 observation_count integer not null default 0 check(observation_count>=0), created_at timestamptz not null default now(), last_seen_at timestamptz not null default now()
);
alter table public.comun_observations add column field_session_id uuid references public.comun_observation_campaign_field_sessions(id) on delete set null;
create table public.comun_observation_field_corrections(
 id uuid primary key default gen_random_uuid(), observation_id uuid not null references public.comun_observations(id) on delete cascade,
 field_session_id uuid not null references public.comun_observation_campaign_field_sessions(id) on delete cascade,
 previous_payload jsonb not null, corrected_at timestamptz not null default now()
);
create index comun_field_grants_campaign_status on public.comun_observation_campaign_access_grants(campaign_id,status,expires_at);
create index comun_field_sessions_grant_active on public.comun_observation_campaign_field_sessions(grant_id,expires_at) where revoked_at is null;
create index comun_field_observations_session on public.comun_observations(field_session_id,created_at) where field_session_id is not null;
do $$ declare t text; begin foreach t in array array['comun_observation_campaign_access_grants','comun_observation_campaign_field_sessions','comun_observation_field_corrections'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); execute format('grant select,insert,update,delete on public.%I to service_role',t); end loop; end $$;
