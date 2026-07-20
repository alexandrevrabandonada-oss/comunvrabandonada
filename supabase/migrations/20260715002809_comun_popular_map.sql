alter table public.comun_hub_territories drop constraint if exists comun_hub_territories_territory_type_check;
alter table public.comun_hub_territories
  add column neighborhood text,
  add column public_approximate_address text,
  add column private_location text,
  add column latitude double precision check(latitude is null or latitude between -90 and 90),
  add column longitude double precision check(longitude is null or longitude between -180 and 180),
  add column geometry_type text not null default 'point' check(geometry_type in ('point','line','polygon','multipolygon')),
  add column geometry_geojson jsonb,
  add column location_precision text not null default 'approximate' check(location_precision in ('exact','approximate','neighborhood','hidden')),
  add column visibility text not null default 'internal' check(visibility in ('public','internal','archived')),
  add column verification_status text not null default 'unverified' check(verification_status in ('unverified','community_report','source_checked','verified','disputed','outdated')),
  add column source_summary_public text,
  add column source_url_public text,
  add column project_id uuid references public.comun_hub_projects(id) on delete set null,
  add column pauta_id uuid references public.comun_pauta_spaces(id) on delete set null,
  add column responsible_internal text,
  add column last_reviewed_at timestamptz,
  add constraint comun_hub_territories_geometry_safe check (
    geometry_geojson is null or (
      octet_length(geometry_geojson::text) <= 100000
      and jsonb_typeof(geometry_geojson) = 'object'
      and geometry_geojson->>'type' in ('Point','LineString','Polygon','MultiPolygon')
      and geometry_geojson ? 'coordinates'
      and (not geometry_geojson ? 'properties' or geometry_geojson->'properties' = '{}'::jsonb)
    )
  );
alter table public.comun_hub_territories add constraint comun_hub_territories_territory_type_check check(territory_type in ('municipality','neighborhood','community','region','public_facility','factory','school','health_unit','river','environmental_area','recycling_point','cooperative','solidarity_collective','warehouse','collection_route','territorial_property','building','public_equipment','action_location','community_project','other'));

create table public.comun_territorial_layers(
 id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, description text,
 icon text not null, display_order integer not null default 0, visibility text not null default 'public' check(visibility in ('public','internal','archived')),
 legend text, filter_config jsonb not null default '{}'::jsonb check(jsonb_typeof(filter_config)='object'), is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.comun_territory_layers(territory_id uuid references public.comun_hub_territories(id) on delete cascade, layer_id uuid references public.comun_territorial_layers(id) on delete cascade, primary key(territory_id,layer_id));

create table public.comun_recycling_materials(
 id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, category text not null,
 public_guidance text, is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.comun_recycling_points(
 territory_id uuid primary key references public.comun_hub_territories(id) on delete cascade,
 point_type text not null check(point_type in ('pev','ecopoint','cooperative','mobile_collection','scheduled_collection','temporary_point','partner_business','other')),
 operator_public text, cooperative_territory_id uuid references public.comun_hub_territories(id) on delete set null,
 status text not null default 'unconfirmed' check(status in ('active','temporarily_unavailable','full','maintenance','unconfirmed','closed')),
 opening_hours_public text, instructions_public text, accessibility_public text, public_contact_authorized text,
 last_verified_at timestamptz, accepts_direct_delivery boolean, has_collection boolean,
 public_notes text, internal_notes text, updated_at timestamptz not null default now()
);
create table public.comun_recycling_point_materials(
 territory_id uuid references public.comun_recycling_points(territory_id) on delete cascade,
 material_id uuid references public.comun_recycling_materials(id) on delete cascade,
 acceptance_status text not null check(acceptance_status in ('accepted','not_accepted','restricted','unverified')),
 limit_public text, preparation_public text, public_note text, verified_at timestamptz,
 primary key(territory_id,material_id)
);

create table public.comun_territorial_organizations(
 territory_id uuid primary key references public.comun_hub_territories(id) on delete cascade,
 public_name text not null, organization_type text not null check(organization_type in ('cooperative','association','collective','informal_group','solidarity_enterprise','network','other')),
 status text not null default 'unverified' check(status in ('active','forming','paused','unverified','closed')),
 service_territory_public text, presentation_public text, services_public text[], capacity_public_approximate text,
 available_structure_public text, needs_public text, partnerships_public text, public_contact_authorized text, private_contact text,
 verification_status text not null default 'unverified', last_verified_at timestamptz, internal_notes text, updated_at timestamptz not null default now()
);
create table public.comun_territorial_organization_materials(territory_id uuid references public.comun_territorial_organizations(territory_id) on delete cascade, material_id uuid references public.comun_recycling_materials(id) on delete cascade, public_note text, primary key(territory_id,material_id));

create table public.comun_collection_routes(
 territory_id uuid primary key references public.comun_hub_territories(id) on delete cascade,
 organization_territory_id uuid references public.comun_territorial_organizations(territory_id) on delete set null,
 days_public text, neighborhoods_public text[], status text not null default 'unconfirmed' check(status in ('active','limited','paused','unconfirmed','closed')),
 periodicity_public text, coverage_public text, schedule_disclaimer text not null default 'Horários e cobertura são aproximados e dependem de confirmação.', updated_at timestamptz not null default now()
);
create table public.comun_collection_route_materials(territory_id uuid references public.comun_collection_routes(territory_id) on delete cascade, material_id uuid references public.comun_recycling_materials(id) on delete cascade, primary key(territory_id,material_id));

create table public.comun_territorial_needs(
 id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, public_summary text not null,
 need_type text not null check(need_type in ('equipment','vehicle','space','input','training','technical_support','partnership','volunteering','donation','hiring','infrastructure','communication','other')),
 status text not null default 'identified' check(status in ('identified','verifying','open','partially_met','met','cancelled','archived')),
 territory_id uuid references public.comun_hub_territories(id) on delete set null, organization_territory_id uuid references public.comun_territorial_organizations(territory_id) on delete set null,
 project_id uuid references public.comun_hub_projects(id) on delete set null, pauta_id uuid references public.comun_pauta_spaces(id) on delete set null,
 action_id uuid references public.comun_mobilization_actions(id) on delete set null, task_id uuid references public.comun_pauta_tasks(id) on delete set null,
 responsible_internal text, due_at timestamptz, visibility text not null default 'internal' check(visibility in ('public','internal','archived')),
 internal_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.comun_territorial_need_interests(
 id uuid primary key default gen_random_uuid(), need_id uuid not null references public.comun_territorial_needs(id) on delete cascade,
 public_alias text, contact_private text not null, offer_private text, consent_to_contact boolean not null default false,
 status text not null default 'pending' check(status in ('pending','contacted','accepted','rejected','archived')), created_at timestamptz not null default now()
);

create table public.comun_territorial_properties(
 territory_id uuid primary key references public.comun_hub_territories(id) on delete cascade,
 property_type text not null check(property_type in ('land','building','warehouse','right_of_way','environmental_area','industrial_area','residential_property','deactivated_equipment','other')),
 current_use_public text, apparent_occupation_public text, condition_public text, public_impact text, public_registry_status_summary text,
 history_public text, risk_level text not null default 'attention' check(risk_level in ('normal','attention','high','critical')),
 editorial_review_status text not null default 'pending' check(editorial_review_status in ('pending','reviewed','changes_required')),
 legal_review_status text not null default 'not_required' check(legal_review_status in ('not_required','pending','approved','changes_required')),
 internal_notes text, updated_at timestamptz not null default now()
);
create table public.comun_territorial_sources(
 id uuid primary key default gen_random_uuid(), territory_id uuid not null references public.comun_hub_territories(id) on delete cascade,
 title text not null, source_type text not null, source_url_public text, source_date date, public_excerpt_summary text not null,
 document_archive_item_id uuid references public.comun_archive_items(id) on delete set null,
 confidence_level text not null check(confidence_level in ('low','medium','high','official')),
 review_status text not null default 'pending' check(review_status in ('pending','reviewed','rejected','outdated')),
 public_note text, internal_note text, created_at timestamptz not null default now()
);
create table public.comun_territorial_ownership_assertions(
 id uuid primary key default gen_random_uuid(), territory_id uuid not null references public.comun_territorial_properties(territory_id) on delete cascade,
 assertion_type text not null check(assertion_type in ('confirmed_by_official_document','attributed_to_company_in_public_source','possession_or_domain_disputed','unverified_community_report','outdated_information','unknown')),
 attributed_party_public text, source_id uuid not null references public.comun_territorial_sources(id) on delete restrict,
 public_wording text not null, confidence_level text not null check(confidence_level in ('low','medium','high','official')),
 review_status text not null default 'pending' check(review_status in ('pending','editorial_approved','legal_review','approved','rejected','outdated')),
 public_note text, internal_note text, created_at timestamptz not null default now()
);
create table public.comun_territorial_social_use_proposals(
 id uuid primary key default gen_random_uuid(), territory_id uuid not null references public.comun_territorial_properties(territory_id) on delete cascade,
 slug text not null unique, title text not null, use_type text not null check(use_type in ('housing','park','cultural_equipment','cooperative','garden','school','health','sports','environmental_recovery','mobility','public_passage','mixed_use','other')),
 public_summary text not null, status text not null default 'community_proposal' check(status in ('community_proposal','under_discussion','submitted','partially_adopted','adopted','rejected','archived')),
 pauta_id uuid references public.comun_pauta_spaces(id) on delete set null, project_id uuid references public.comun_hub_projects(id) on delete set null,
 action_id uuid references public.comun_mobilization_actions(id) on delete set null, visibility text not null default 'internal' check(visibility in ('public','internal','archived')),
 internal_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_territorial_contributions(
 id uuid primary key default gen_random_uuid(), contribution_type text not null check(contribution_type in ('new_point','correct_point','material_acceptance','point_full','organization','need_update','property','document','social_use','history')),
 territory_id uuid references public.comun_hub_territories(id) on delete set null, public_summary text not null, approximate_location text,
 contact_private text, attachment_private_reference text, raw_details_private text,
 status text not null default 'pending' check(status in ('pending','triage','approved','rejected','archived')),
 submitter_hash text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.comun_pauta_evidence_items add column territory_id uuid references public.comun_hub_territories(id) on delete set null;
alter table public.comun_pauta_tasks add column territory_id uuid references public.comun_hub_territories(id) on delete set null;
alter table public.comun_hub_results add column territory_id uuid references public.comun_hub_territories(id) on delete set null;

create index comun_territories_public_map_idx on public.comun_hub_territories(visibility,status,verification_status,territory_type);
create index comun_territories_coordinates_idx on public.comun_hub_territories(latitude,longitude) where latitude is not null and longitude is not null;
create index comun_territorial_needs_open_idx on public.comun_territorial_needs(status,visibility,territory_id);
create index comun_territorial_contributions_pending_idx on public.comun_territorial_contributions(status,created_at);

alter table public.comun_territorial_layers enable row level security; alter table public.comun_territory_layers enable row level security;
alter table public.comun_recycling_materials enable row level security; alter table public.comun_recycling_points enable row level security; alter table public.comun_recycling_point_materials enable row level security;
alter table public.comun_territorial_organizations enable row level security; alter table public.comun_territorial_organization_materials enable row level security;
alter table public.comun_collection_routes enable row level security; alter table public.comun_collection_route_materials enable row level security;
alter table public.comun_territorial_needs enable row level security; alter table public.comun_territorial_need_interests enable row level security;
alter table public.comun_territorial_properties enable row level security; alter table public.comun_territorial_sources enable row level security; alter table public.comun_territorial_ownership_assertions enable row level security; alter table public.comun_territorial_social_use_proposals enable row level security;
alter table public.comun_territorial_contributions enable row level security;

revoke all on public.comun_territorial_layers,public.comun_territory_layers,public.comun_recycling_materials,public.comun_recycling_points,public.comun_recycling_point_materials,public.comun_territorial_organizations,public.comun_territorial_organization_materials,public.comun_collection_routes,public.comun_collection_route_materials,public.comun_territorial_needs,public.comun_territorial_need_interests,public.comun_territorial_properties,public.comun_territorial_sources,public.comun_territorial_ownership_assertions,public.comun_territorial_social_use_proposals,public.comun_territorial_contributions from anon,authenticated;
grant select,insert,update,delete on public.comun_territorial_layers,public.comun_territory_layers,public.comun_recycling_materials,public.comun_recycling_points,public.comun_recycling_point_materials,public.comun_territorial_organizations,public.comun_territorial_organization_materials,public.comun_collection_routes,public.comun_collection_route_materials,public.comun_territorial_needs,public.comun_territorial_need_interests,public.comun_territorial_properties,public.comun_territorial_sources,public.comun_territorial_ownership_assertions,public.comun_territorial_social_use_proposals,public.comun_territorial_contributions to service_role;

insert into public.comun_territorial_layers(slug,title,description,icon,display_order,legend) values
('recycling','Reciclagem','Pontos, materiais e cobertura confirmada.','recycle',10,'Situação e verificação do ponto'),
('cooperatives','Cooperativas','Cooperativas e organizações de economia solidária.','users',20,'Organização sem ranking'),
('solidarity-economy','Economia solidária','Redes, coletivos e necessidades.','hand-heart',30,'Apoio e oportunidade'),
('taken-territory','Território Tomado','Áreas de interesse público com fonte e linguagem cautelosa.','landmark',40,'Atribuição exige fonte'),
('environment','Meio ambiente','Áreas e problemas ambientais.','leaf',50,'Condição territorial'),
('mobility','Mobilidade','Rotas, cobertura e passagem.','route',60,'Cobertura aproximada'),
('public-equipment','Equipamentos públicos','Equipamentos e serviços públicos.','building',70,'Situação do equipamento'),
('actions','Ações','Locais de ações públicas confirmadas.','megaphone',80,'Ações e participação') on conflict(slug) do nothing;
insert into public.comun_recycling_materials(slug,name,category) values
('paper','Papel','paper'),('cardboard','Papelão','paper'),('plastic','Plástico','plastic'),('glass','Vidro','glass'),('metal','Metal','metal'),('oil','Óleo','oil'),('electronics','Eletrônico','electronics'),('cells','Pilhas','hazardous'),('batteries','Baterias','hazardous'),('lamps','Lâmpadas','hazardous'),('textile','Tecido','textile'),('wood','Madeira','wood'),('rubble','Entulho','construction'),('organic','Orgânico','organic'),('other','Outros','other') on conflict(slug) do nothing;
