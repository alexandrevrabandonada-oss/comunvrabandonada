create table public.comun_hub_territories (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  territory_type text not null check(territory_type in ('municipality','neighborhood','community','region','public_facility','factory','school','health_unit','river','environmental_area')),
  municipality text, public_summary text, internal_notes text, status text not null default 'active' check(status in ('active','monitoring','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_hub_projects (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, objective_public text not null,
  description_public text, status text not null default 'active' check(status in ('planning','active','paused','completed','archived')),
  responsible_public text, responsible_internal text, participation_public text, internal_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.comun_pauta_spaces
  add column public_status text not null default 'received' check(public_status in ('received','triage','investigating','collecting_evidence','building_proposal','ready_for_action','active_mobilization','awaiting_response','monitoring','partial_win','resolved','no_progress','archived')),
  add column internal_status text not null default 'triage',
  add column priority text not null default 'normal' check(priority in ('low','normal','high','critical')),
  add column urgency text not null default 'normal' check(urgency in ('low','normal','high','immediate')),
  add column risk_level text not null default 'normal' check(risk_level in ('normal','attention','high','critical')),
  add column responsible_internal text,
  add column responsible_public text,
  add column territory_id uuid references public.comun_hub_territories(id) on delete set null,
  add column affected_people_public text,
  add column problem_public text,
  add column demand_public text,
  add column proposals_public text,
  add column participation_public text,
  add column last_operational_update_at timestamptz not null default now();

create table public.comun_hub_pauta_reports (
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  report_id uuid not null references public.comun_reports(id) on delete cascade,
  linked_by text, created_at timestamptz not null default now(), primary key(pauta_id,report_id)
);
create table public.comun_hub_pauta_projects (
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  project_id uuid not null references public.comun_hub_projects(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(pauta_id,project_id)
);

create table public.comun_mobilization_actions (
  id uuid primary key default gen_random_uuid(), pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  project_id uuid references public.comun_hub_projects(id) on delete set null, territory_id uuid references public.comun_hub_territories(id) on delete set null,
  slug text not null unique, title text not null, action_type text not null check(action_type in ('investigation','information_request','protocol','institutional_complaint','meeting','hearing','leafleting','collective_work','demonstration','petition','communication_campaign','territorial_visit','training','inspection','digital_pressure','content_production','community_support','legal_followup','other')),
  objective_public text not null, objective_internal text, status text not null default 'proposal' check(status in ('proposal','planning','confirmed','in_progress','completed','cancelled','postponed','blocked')),
  responsible_public text, responsible_internal text, team_private text, place_public text, location_private text,
  starts_at timestamptz, ends_at timestamptz, participation_public text, guidance_public text,
  materials_public text, risks_private text, expected_result_public text, observed_result_public text,
  public_record text, visibility text not null default 'internal' check(visibility in ('public','internal','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.comun_pauta_tasks drop constraint comun_pauta_tasks_status_check;
alter table public.comun_pauta_tasks
  add column action_id uuid references public.comun_mobilization_actions(id) on delete set null,
  add column project_id uuid references public.comun_hub_projects(id) on delete set null,
  add column required_skill text,
  add column priority text not null default 'normal' check(priority in ('low','normal','high','critical')),
  add column visibility text not null default 'public' check(visibility in ('public','internal','archived')),
  add column accepts_volunteers boolean not null default false,
  add column participant_limit integer check(participant_limit is null or participant_limit > 0),
  add column result_public text;
alter table public.comun_pauta_tasks add constraint comun_pauta_tasks_status_check check(status in ('open','assigned','in_progress','blocked','done','cancelled','archived'));

create table public.comun_hub_communication_materials (
  id uuid primary key default gen_random_uuid(), pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  action_id uuid references public.comun_mobilization_actions(id) on delete set null,
  material_type text not null check(material_type in ('post','carousel','reels','video','whatsapp_text','press_note','leaflet','poster','presentation','technical_document','newsletter')),
  title text not null, objective text, audience text, channel text, status text not null default 'draft' check(status in ('idea','draft','review','approved','scheduled','published','archived')),
  responsible_internal text, planned_at timestamptz, version text, link_public text, asset_id uuid references public.comun_archive_assets(id) on delete set null,
  observed_result text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_hub_results (
  id uuid primary key default gen_random_uuid(), pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  action_id uuid references public.comun_mobilization_actions(id) on delete set null,
  slug text not null unique, title text not null, result_type text not null check(result_type in ('achievement','official_response','partial_change','promise','work_started','policy_changed','problem_solved','no_response','setback','learning')),
  public_summary text not null, what_was_done_public text, remaining_public text, verification_status text not null default 'pending' check(verification_status in ('pending','verified','disputed','superseded')),
  visibility text not null default 'internal' check(visibility in ('public','internal','archived')), occurred_at timestamptz not null,
  evidence_summary_public text, private_notes text, created_by text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_pauta_timeline_events (
  id uuid primary key default gen_random_uuid(), pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  event_type text not null check(event_type in ('report_received','evidence_added','protocol_sent','official_response','investigation_update','action_announced','action_completed','publication_released','meeting_held','proposal_presented','partial_result','final_result','correction','other')),
  title text not null, public_summary text, private_notes text, occurred_at timestamptz not null,
  source_reference text, evidence_id uuid references public.comun_pauta_evidence_items(id) on delete set null,
  action_id uuid references public.comun_mobilization_actions(id) on delete set null,
  protocol_id uuid references public.comun_official_protocols(id) on delete set null,
  result_id uuid references public.comun_hub_results(id) on delete set null,
  visibility text not null default 'internal' check(visibility in ('public','internal','archived')),
  created_by text, created_at timestamptz not null default now()
);

create table public.comun_hub_archive_links (
  id uuid primary key default gen_random_uuid(), pauta_id uuid references public.comun_pauta_spaces(id) on delete cascade,
  action_id uuid references public.comun_mobilization_actions(id) on delete cascade,
  result_id uuid references public.comun_hub_results(id) on delete cascade,
  project_id uuid references public.comun_hub_projects(id) on delete cascade,
  territory_id uuid references public.comun_hub_territories(id) on delete cascade,
  archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  relation_type text not null check(relation_type in ('pauta_documented_by','pauta_historical_context','action_documented_by','result_preserved_in','project_related_archive','territory_related_archive')),
  public_note text, internal_note text, created_at timestamptz not null default now(),
  check(num_nonnulls(pauta_id,action_id,result_id,project_id,territory_id)=1)
);

create table public.comun_hub_participation_interests (
  id uuid primary key default gen_random_uuid(), territory_id uuid references public.comun_hub_territories(id) on delete set null,
  themes text[] not null default '{}', availability_private text, collaboration_types text[] not null default '{}', contact_private text not null,
  public_alias text, consent_to_contact boolean not null default false, status text not null default 'pending' check(status in ('pending','contacted','active','archived','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index comun_hub_actions_public_idx on public.comun_mobilization_actions(visibility,status,starts_at);
create index comun_hub_results_public_idx on public.comun_hub_results(visibility,occurred_at desc);
create index comun_hub_timeline_public_idx on public.comun_pauta_timeline_events(pauta_id,visibility,occurred_at desc);
create index comun_hub_tasks_operational_idx on public.comun_pauta_tasks(status,due_at,priority);
create index comun_hub_materials_calendar_idx on public.comun_hub_communication_materials(status,planned_at);

alter table public.comun_hub_territories enable row level security;
alter table public.comun_hub_projects enable row level security;
alter table public.comun_hub_pauta_reports enable row level security;
alter table public.comun_hub_pauta_projects enable row level security;
alter table public.comun_mobilization_actions enable row level security;
alter table public.comun_hub_communication_materials enable row level security;
alter table public.comun_hub_results enable row level security;
alter table public.comun_pauta_timeline_events enable row level security;
alter table public.comun_hub_archive_links enable row level security;
alter table public.comun_hub_participation_interests enable row level security;

revoke all on public.comun_hub_territories,public.comun_hub_projects,public.comun_hub_pauta_reports,public.comun_hub_pauta_projects,public.comun_mobilization_actions,public.comun_hub_communication_materials,public.comun_hub_results,public.comun_pauta_timeline_events,public.comun_hub_archive_links,public.comun_hub_participation_interests from anon,authenticated;
grant select,insert,update,delete on public.comun_hub_territories,public.comun_hub_projects,public.comun_hub_pauta_reports,public.comun_hub_pauta_projects,public.comun_mobilization_actions,public.comun_hub_communication_materials,public.comun_hub_results,public.comun_pauta_timeline_events,public.comun_hub_archive_links,public.comun_hub_participation_interests to service_role;

insert into public.comun_hub_territories(slug,name,territory_type,municipality,public_summary) values
('volta-redonda','Volta Redonda','municipality','Volta Redonda','Município acompanhado pelo COMUN.') on conflict(slug) do nothing;
insert into public.comun_hub_projects(slug,name,objective_public,status,participation_public) values
('vr-abandonada','VR Abandonada','Organizar denúncia, investigação, comunicação e ação popular em Volta Redonda.','active','Envie relatos, evidências ou participe de ações concretas.'),
('semear','SEMEAR','Articular iniciativas populares de cuidado, formação e transformação territorial.','planning','Acompanhe as pautas e tarefas abertas.'),
('respira-fundo-vr','Respira Fundo VR','Documentar e enfrentar impactos ambientais e de saúde no território.','planning','Contribua com relatos e registros seguros.'),
('trem-popular','Trem Popular','Organizar memória, propostas e mobilização por transporte ferroviário popular.','planning','Ajude em pesquisa, comunicação e mobilização.')
on conflict(slug) do nothing;
