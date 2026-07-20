create table public.comun_observation_campaigns(
 id uuid primary key default gen_random_uuid(),
 observatory_id uuid not null references public.comun_observatories(id) on delete cascade,
 pauta_id uuid references public.comun_pauta_spaces(id) on delete set null,
 project_id uuid references public.comun_hub_projects(id) on delete set null,
 territory_id uuid references public.comun_hub_territories(id) on delete set null,
 title text not null, slug text unique not null, public_summary text not null, internal_objective text,
 status text not null default 'draft' check(status in('draft','planning','ready','in_field','review','completed','archived')),
 starts_at timestamptz, ends_at timestamptz,
 methodology_version_id uuid not null references public.comun_observatory_methodologies(id),
 form_version_id uuid not null references public.comun_observation_form_versions(id),
 minimum_total_sample integer not null default 1 check(minimum_total_sample between 1 and 100000),
 target_total_sample integer not null default 1 check(target_total_sample between 1 and 100000),
 publication_mode text not null default 'internal_only' check(publication_mode in('internal_only','aggregate_after_review','report_after_approval')),
 coordinator_private text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(target_total_sample>=minimum_total_sample), check(ends_at is null or starts_at is null or ends_at>=starts_at)
);
create table public.comun_observation_sampling_plans(
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.comun_observation_campaigns(id) on delete cascade,
 title text not null, public_explanation text not null, internal_notes text,
 sampling_type text not null check(sampling_type in('systematic','stratified','convenience_controlled','event_based','mixed')),
 target_sample integer not null check(target_sample>0), minimum_sample integer not null check(minimum_sample>0 and minimum_sample<=target_sample),
 inclusion_criteria jsonb not null default '[]' check(jsonb_typeof(inclusion_criteria)='array'), exclusion_criteria jsonb not null default '[]' check(jsonb_typeof(exclusion_criteria)='array'),
 limitations_public text not null, status text not null default 'draft' check(status in('draft','approved','active','closed','archived')),
 approved_by text, approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.comun_observation_sampling_slots(
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.comun_observation_campaigns(id) on delete cascade,
 sampling_plan_id uuid references public.comun_observation_sampling_plans(id) on delete set null,
 monitored_entity_id uuid references public.comun_monitored_entities(id) on delete set null, territory_id uuid references public.comun_hub_territories(id) on delete set null,
 label text not null, private_instructions text, target_at timestamptz not null, starts_at timestamptz, ends_at timestamptz,
 target_observations integer not null default 1 check(target_observations>0), minimum_observations integer not null default 1 check(minimum_observations>0 and minimum_observations<=target_observations),
 status text not null default 'planned' check(status in('planned','confirmed','in_progress','completed','missed','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(ends_at is null or starts_at is null or ends_at>=starts_at)
);
create table public.comun_observation_campaign_assignments(
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.comun_observation_campaigns(id) on delete cascade,
 sampling_slot_id uuid references public.comun_observation_sampling_slots(id) on delete cascade, participant_private text not null,
 role text not null check(role in('coordinator','observer','reviewer','support')), status text not null default 'invited' check(status in('invited','confirmed','declined','completed','cancelled')),
 availability text, private_notes text, confirmed_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.comun_observations add column campaign_id uuid references public.comun_observation_campaigns(id) on delete set null;
alter table public.comun_observations add column sampling_slot_id uuid references public.comun_observation_sampling_slots(id) on delete set null;
create table public.comun_observation_quality_reviews(
 id uuid primary key default gen_random_uuid(), observation_id uuid not null references public.comun_observations(id) on delete cascade,
 campaign_id uuid references public.comun_observation_campaigns(id) on delete set null,
 completeness text not null check(completeness in('complete','partial','insufficient')),
 consistency text not null check(consistency in('consistent','flagged','inconsistent')),
 schedule_source text check(schedule_source in('official_table','official_app','stop_sign','company_information','community_information','unknown')),
 duplication text not null default 'none' check(duplication in('none','possible','confirmed_duplicate','corroborating')),
 evidence text not null default 'none' check(evidence in('none','claimed','reviewed','supported')),
 final_decision text not null default 'pending' check(final_decision in('pending','accepted','partially_accepted','rejected','duplicate')),
 public_note text, private_note text, reviewer_private text, reviewed_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.comun_observation_campaign_field_diaries(
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.comun_observation_campaigns(id) on delete cascade,
 sampling_slot_id uuid references public.comun_observation_sampling_slots(id) on delete set null, author_private text not null, note_private text not null,
 occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.comun_observation_campaign_reports(
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.comun_observation_campaigns(id) on delete cascade,
 slug text unique not null, title text not null, public_summary text not null, coverage_public text not null, limitations_public text not null,
 methodology_public text, claims_public text, next_actions_public text,
 publication_status text not null default 'draft' check(publication_status in('draft','review','published','archived')),
 published_at timestamptz, approved_by text, approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.comun_observation_campaign_evidence_links(
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.comun_observation_campaigns(id) on delete cascade,
 metric_snapshot_id uuid references public.comun_metric_snapshots(id) on delete set null,
 evidence_id uuid not null references public.comun_pauta_evidence_items(id) on delete cascade, created_at timestamptz not null default now(), unique(campaign_id,evidence_id)
);
create index comun_campaigns_observatory_status on public.comun_observation_campaigns(observatory_id,status,starts_at);
create index comun_sampling_slots_campaign_status on public.comun_observation_sampling_slots(campaign_id,status,target_at);
create index comun_campaign_observations_review on public.comun_observations(campaign_id,status,occurred_at) where campaign_id is not null;
create index comun_campaign_reports_public on public.comun_observation_campaign_reports(campaign_id,publication_status,published_at desc);

do $$ declare t text; begin foreach t in array array['comun_observation_campaigns','comun_observation_sampling_plans','comun_observation_sampling_slots','comun_observation_campaign_assignments','comun_observation_quality_reviews','comun_observation_campaign_field_diaries','comun_observation_campaign_reports','comun_observation_campaign_evidence_links'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); execute format('grant select,insert,update,delete on public.%I to service_role',t); end loop; end $$;
