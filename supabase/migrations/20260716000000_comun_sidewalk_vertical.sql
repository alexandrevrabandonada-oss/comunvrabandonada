-- Sprint 32.1 — Vertical completa do Mapa Popular das Calçadas
-- Migration aditiva local. Nenhuma alteração remota.

-- 1. Extensões de enums -------------------------------------------------------

alter table public.comun_territorial_layers drop constraint if exists comun_territorial_layers_slug_check;
-- slug é text sem check; apenas inserimos nova camada

alter table public.comun_territorial_contributions drop constraint if exists comun_territorial_contributions_contribution_type_check;
alter table public.comun_territorial_contributions add constraint comun_territorial_contributions_contribution_type_check check(contribution_type in('new_point','correct_point','material_acceptance','point_full','organization','need_update','property','document','social_use','history','sidewalk_observation','sidewalk_photo'));

alter table public.comun_monitored_entities drop constraint if exists comun_monitored_entities_entity_type_check;
alter table public.comun_monitored_entities add constraint comun_monitored_entities_entity_type_check check(entity_type in('transport_line','transport_stop','transport_service','public_unit','school','health_unit','recycling_point','collection_route','environmental_station','public_equipment','territory','sidewalk_segment','other'));

alter table public.comun_member_inbox drop constraint if exists comun_member_inbox_notification_type_check;
alter table public.comun_member_inbox add constraint comun_member_inbox_notification_type_check check(notification_type in('action_required','contribution_update','information_requested','task_assigned','task_due','round_opened','round_closing','synthesis_published','campaign_assignment','campaign_update','official_response','result_registered','artwork_update','radio_update','consent_action_required','rights_action_required','sidewalk_report_received','sidewalk_report_verified','sidewalk_report_published','sidewalk_circle_opened','sidewalk_task_assigned','sidewalk_protocol_sent','sidewalk_response_received','sidewalk_result_recorded'));

alter table public.comun_circle_synthesis_links drop constraint if exists comun_circle_synthesis_links_target_type_check;
alter table public.comun_circle_synthesis_links add constraint comun_circle_synthesis_links_target_type_check check(target_type in('action','task','proposal','evidence','official_protocol','update','snapshot'));

alter table public.comun_archive_artwork_relations drop constraint if exists comun_archive_artwork_relations_target_type_check;
alter table public.comun_archive_artwork_relations add constraint comun_archive_artwork_relations_target_type_check check(target_type in('archive_item','pauta','project','territory','action','result','report','event','dossier','document','historical_photo','musical_artist','oral_history','sidewalk_record'));

-- 2. Camada do mapa -----------------------------------------------------------

insert into public.comun_territorial_layers(slug,title,description,icon,display_order,legend)
values('sidewalk_accessibility','Calçadas e acessibilidade','Trechos e pontos de calçada revisados pela comunidade.','wheelchair',65,'Situação de acessibilidade aproximada')
on conflict(slug) do nothing;

-- 3. Colunas de vínculo em tabelas existentes ---------------------------------

alter table public.comun_circle_syntheses add column if not exists snapshot_id uuid references public.comun_metric_snapshots(id) on delete set null;
alter table public.comun_mobilization_actions add column if not exists sidewalk_record_id uuid references public.comun_hub_territories(id) on delete set null;
alter table public.comun_hub_results add column if not exists sidewalk_record_id uuid references public.comun_hub_territories(id) on delete set null;
alter table public.comun_official_protocols add column if not exists sidewalk_record_id uuid references public.comun_hub_territories(id) on delete set null;
alter table public.comun_radio_programs add column if not exists sidewalk_record_id uuid references public.comun_hub_territories(id) on delete set null;
alter table public.comun_radio_episodes add column if not exists sidewalk_record_id uuid references public.comun_hub_territories(id) on delete set null;
alter table public.comun_observations add column if not exists sidewalk_record_id uuid references public.comun_hub_territories(id) on delete set null;

-- 4. Tabela de registros territoriais de calçada ------------------------------

create table public.comun_sidewalk_records(
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  territory_id uuid references public.comun_hub_territories(id) on delete set null,
  slug text not null unique,
  name text not null,
  geometry_geojson jsonb not null check(
    jsonb_typeof(geometry_geojson)='object'
    and geometry_geojson->>'type' in ('Point','LineString')
    and geometry_geojson ? 'coordinates'
    and (not geometry_geojson ? 'properties' or geometry_geojson->'properties'='{}'::jsonb)
  ),
  categories text[] not null default '{}',
  impact_level text not null check(impact_level in('low','medium','high','critical')),
  affected_groups text[] not null default '{}',
  status text not null default 'pending' check(status in('pending','under_review','verified','published','rejected','withdrawn','archived')),
  verification_status text not null default 'unverified' check(verification_status in('unverified','community_report','source_checked','verified','disputed','outdated')),
  visibility text not null default 'internal' check(visibility in('public','internal','archived')),
  public_summary text not null,
  private_notes text,
  methodology_version_id uuid references public.comun_observatory_methodologies(id) on delete set null,
  source_contribution_id uuid references public.comun_territorial_contributions(id) on delete set null,
  source_observation_id uuid references public.comun_observations(id) on delete set null,
  public_location_level text not null default 'approximate' check(public_location_level in('exact','approximate','neighborhood','hidden')),
  approximate_location text,
  resolved_at timestamptz,
  resolved_result_id uuid references public.comun_hub_results(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comun_sidewalk_records_public_idx on public.comun_sidewalk_records(pauta_id,status,visibility,impact_level);
create index comun_sidewalk_records_territory_idx on public.comun_sidewalk_records(territory_id,status);

-- 5. Fotos de registro de calçada ---------------------------------------------

create table public.comun_sidewalk_record_photos(
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  archive_item_id uuid references public.comun_archive_items(id) on delete set null,
  original_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  derivative_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  review_status text not null default 'pending' check(review_status in('pending','approved','approved_without_image','replacement_requested','restricted','rejected')),
  review_notes_private text,
  checklist jsonb not null default '{}'::jsonb check(jsonb_typeof(checklist)='object'),
  is_public boolean not null default false,
  public_alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comun_sidewalk_record_photos_record_idx on public.comun_sidewalk_record_photos(record_id,review_status,is_public);

-- 6. Vínculos genéricos do registro de calçada --------------------------------

create table public.comun_sidewalk_record_links(
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  target_type text not null check(target_type in('action','task','protocol','result','artwork','radio_episode','memory')),
  target_id uuid not null,
  public_note text,
  created_at timestamptz not null default now(),
  unique(record_id,target_type,target_id)
);

create index comun_sidewalk_record_links_target_idx on public.comun_sidewalk_record_links(target_type,target_id);

-- 7. Memória do ciclo ---------------------------------------------------------

create table public.comun_sidewalk_cycle_memories(
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  record_id uuid references public.comun_sidewalk_records(id) on delete set null,
  slug text not null unique,
  title text not null,
  public_summary text not null,
  methodology_snapshot text,
  snapshot_id uuid references public.comun_metric_snapshots(id) on delete set null,
  circle_id uuid references public.comun_construction_circles(id) on delete set null,
  synthesis_id uuid references public.comun_circle_syntheses(id) on delete set null,
  action_id uuid references public.comun_mobilization_actions(id) on delete set null,
  protocol_id uuid references public.comun_official_protocols(id) on delete set null,
  result_id uuid references public.comun_hub_results(id) on delete set null,
  artwork_item_id uuid references public.comun_archive_items(id) on delete set null,
  radio_episode_item_id uuid references public.comun_archive_items(id) on delete set null,
  status text not null default 'draft' check(status in('draft','review','published','archived')),
  visibility text not null default 'internal' check(visibility in('public','internal','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comun_sidewalk_cycle_memories_pauta_idx on public.comun_sidewalk_cycle_memories(pauta_id,status,visibility);

-- 8. Priorização explícita ----------------------------------------------------

create table public.comun_sidewalk_priorities(
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  synthesis_id uuid references public.comun_circle_syntheses(id) on delete set null,
  record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  decision_public text not null,
  criteria_public text[] not null default '{}',
  evidence_summary_public text,
  disagreements_public text[] not null default '{}',
  limitations_public text,
  decided_by text,
  decided_at timestamptz,
  status text not null default 'draft' check(status in('draft','review','approved','rejected','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comun_sidewalk_priorities_pauta_idx on public.comun_sidewalk_priorities(pauta_id,status);

-- 9. Correção e retirada ------------------------------------------------------

create table public.comun_sidewalk_record_corrections(
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  correction_type text not null check(correction_type in('category','context','photo_replacement','location_hidden','contest','other')),
  request_note_public text,
  previous_value jsonb,
  new_value jsonb,
  review_status text not null default 'pending' check(review_status in('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.comun_sidewalk_record_withdrawals(
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  request_note_private text,
  review_status text not null default 'pending' check(review_status in('pending','approved','rejected')),
  reviewed_by text,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create index comun_sidewalk_record_corrections_record_idx on public.comun_sidewalk_record_corrections(record_id,review_status);
create index comun_sidewalk_record_withdrawals_record_idx on public.comun_sidewalk_record_withdrawals(record_id,review_status);

-- 10. RLS e grants ------------------------------------------------------------

do $$ declare t text; begin
  foreach t in array array[
    'comun_sidewalk_records','comun_sidewalk_record_photos','comun_sidewalk_record_links','comun_sidewalk_cycle_memories','comun_sidewalk_priorities','comun_sidewalk_record_corrections','comun_sidewalk_record_withdrawals'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;

-- 11. Triggers ----------------------------------------------------------------

create trigger comun_sidewalk_records_updated_at before update on public.comun_sidewalk_records for each row execute function public.set_updated_at();
create trigger comun_sidewalk_record_photos_updated_at before update on public.comun_sidewalk_record_photos for each row execute function public.set_updated_at();
create trigger comun_sidewalk_cycle_memories_updated_at before update on public.comun_sidewalk_cycle_memories for each row execute function public.set_updated_at();
create trigger comun_sidewalk_priorities_updated_at before update on public.comun_sidewalk_priorities for each row execute function public.set_updated_at();

-- 12. Seed mínimo de formulário e métricas de calçada -------------------------

insert into public.comun_observatories(slug,title,public_summary,theme,status,public_visibility,starts_at)
values('calcadas-em-circulacao','Calçadas em Circulação — Mapa Popular das Calçadas','Observações comunitárias sobre acessibilidade, barreiras e condição das calçadas no território acompanhado.','sidewalk_accessibility','pilot','public',now())
on conflict(slug) do nothing;

with o as(select id from public.comun_observatories where slug='calcadas-em-circulacao')
insert into public.comun_observatory_methodologies(observatory_id,version,title,public_methodology,sampling_notes_public,limitations_public,aggregation_rules,status,approved_by,approved_at,valid_from)
select id,'1.0','Metodologia piloto de calçadas','Observações comunitárias revisadas são agregadas por categoria e impacto. Coordenadas são aproximadas ou ocultadas conforme configuração do contribuinte.','Amostra por adesão; cobertura varia por trecho e dia.','Os dados representam contribuições recebidas e verificadas pelo projeto e não constituem levantamento completo do território.',
'{"minimum_sample_size":1,"period":"monthly","duplicates":"exclude_identical","unknown_impact":"exclude_high_impact"}'::jsonb,'approved','Equipe COMUN',now(),now() from o
on conflict(observatory_id,version) do nothing;

update public.comun_observatories o set methodology_version_id=m.id from public.comun_observatory_methodologies m where o.id=m.observatory_id and o.slug='calcadas-em-circulacao' and m.version='1.0';

with o as(select id from public.comun_observatories where slug='calcadas-em-circulacao')
insert into public.comun_observation_form_versions(observatory_id,version,title,schema_definition,status,valid_from)
select id,'1.0','Observação de calçada',jsonb_build_object(
  'consent_text','Concordo com o uso agregado e moderado desta observação de calçada.',
  'fields',jsonb_build_array(
    jsonb_build_object('key','category','label','Categoria','type','select','required',true,'options',jsonb_build_array('buraco','calcada_irregular','ausencia_rampa','rampa_inadequada','piso_liso','obstaculo','passeio_interrompido','sinalizacao_ausente','vegetacao','outro')),
    jsonb_build_object('key','impact_level','label','Impacto','type','select','required',true,'options',jsonb_build_array('low','medium','high','critical')),
    jsonb_build_object('key','affected_groups','label','Grupos afetados','type','multiselect','required',true,'options',jsonb_build_array('wheelchair_users','visually_impaired','elderly','children','pregnant','strollers','temporary_mobility','general_public')),
    jsonb_build_object('key','location_precision','label','Precisão da localização','type','select','required',true,'options',jsonb_build_array('exact','approximate','hidden')),
    jsonb_build_object('key','observed_at','label','Data da observação','type','date','required',true),
    jsonb_build_object('key','note','label','Descrição pública','type','textarea','required',false),
    jsonb_build_object('key','optional_evidence','label','Evidência opcional','type','optional_evidence','required',false)
  )
),'approved',now() from o on conflict(observatory_id,version) do nothing;

with x as(
  select o.id oid,m.id mid from public.comun_observatories o
  join public.comun_observatory_methodologies m on m.observatory_id=o.id
  where o.slug='calcadas-em-circulacao' and m.version='1.0'
), defs(slug,title,unit,kind,config) as(values
  ('total-publicado','Total publicado','registros','count','{"field":"*"}'::jsonb),
  ('total-verificado','Total verificado','registros','count','{"field":"verification_status","equals":"verified"}'::jsonb),
  ('impacto-alto','Registros de impacto alto','registros','count','{"field":"impact_level","equals":"high"}'::jsonb),
  ('barreiras-acessibilidade','Barreiras de acessibilidade','registros','count','{"field":"category","in":["ausencia_rampa","rampa_inadequada","piso_liso","obstaculo","passeio_interrompido"]}'::jsonb),
  ('territorios-cobertos','Territórios com contribuição','territórios','count','{"field":"territory_id","distinct":true}'::jsonb),
  ('resolvidos','Registros resolvidos','registros','count','{"field":"status","equals":"resolved_placeholder"}'::jsonb)
)
insert into public.comun_metric_definitions(observatory_id,slug,title,description_public,unit,calculation_type,aggregation_config,methodology_version_id,minimum_sample_size,public_visibility)
select x.oid,d.slug,d.title,'Indicador comunitário sujeito à cobertura e à metodologia publicada.',d.unit,d.kind,d.config,x.mid,1,'public' from x cross join defs d
on conflict(observatory_id,slug) do nothing;
