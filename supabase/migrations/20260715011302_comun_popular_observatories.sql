create table public.comun_observatories(
 id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, public_summary text not null,
 internal_objective text, pauta_id uuid references public.comun_pauta_spaces(id) on delete set null,
 project_id uuid references public.comun_hub_projects(id) on delete set null, territory_id uuid references public.comun_hub_territories(id) on delete set null,
 theme text not null, status text not null default 'draft' check(status in('draft','preparation','pilot','active','paused','completed','archived')),
 public_visibility text not null default 'private' check(public_visibility in('private','public','archived')),
 methodology_version_id uuid, responsible_internal text, starts_at timestamptz, ends_at timestamptz, created_by text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(ends_at is null or starts_at is null or ends_at>=starts_at)
);
create table public.comun_observatory_methodologies(
 id uuid primary key default gen_random_uuid(), observatory_id uuid not null references public.comun_observatories(id) on delete cascade,
 version text not null, title text not null, public_methodology text not null, internal_notes text, sampling_notes_public text, limitations_public text,
 aggregation_rules jsonb not null check(jsonb_typeof(aggregation_rules)='object' and pg_column_size(aggregation_rules)<=32768),
 status text not null default 'draft' check(status in('draft','review','approved','retired')),
 approved_by text, approved_at timestamptz, valid_from timestamptz, retired_at timestamptz, created_at timestamptz not null default now(), unique(observatory_id,version)
);
alter table public.comun_observatories add constraint comun_observatories_methodology_fk foreign key(methodology_version_id) references public.comun_observatory_methodologies(id) on delete set null;
create table public.comun_observation_form_versions(
 id uuid primary key default gen_random_uuid(), observatory_id uuid not null references public.comun_observatories(id) on delete cascade,
 version text not null, title text not null, schema_definition jsonb not null check(jsonb_typeof(schema_definition)='object' and pg_column_size(schema_definition)<=65536),
 status text not null default 'draft' check(status in('draft','review','approved','retired')), valid_from timestamptz, retired_at timestamptz,
 created_at timestamptz not null default now(), unique(observatory_id,version)
);
create table public.comun_monitored_entities(
 id uuid primary key default gen_random_uuid(), observatory_id uuid not null references public.comun_observatories(id) on delete cascade,
 territory_id uuid references public.comun_hub_territories(id) on delete set null,
 entity_type text not null check(entity_type in('transport_line','transport_stop','transport_service','public_unit','school','health_unit','recycling_point','collection_route','environmental_station','public_equipment','territory','other')),
 public_name text not null, public_code text, public_description text, status text not null default 'active' check(status in('draft','active','inactive','archived')),
 source text, verification text not null default 'unverified' check(verification in('unverified','community_checked','source_checked','officially_confirmed','disputed')),
 public_metadata jsonb not null default '{}' check(jsonb_typeof(public_metadata)='object' and pg_column_size(public_metadata)<=16384),
 private_metadata jsonb not null default '{}' check(jsonb_typeof(private_metadata)='object' and pg_column_size(private_metadata)<=16384),
 last_reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(observatory_id,entity_type,public_code)
);
create table public.comun_observations(
 id uuid primary key default gen_random_uuid(), observatory_id uuid not null references public.comun_observatories(id) on delete cascade,
 form_version_id uuid not null references public.comun_observation_form_versions(id), pauta_id uuid references public.comun_pauta_spaces(id) on delete set null,
 territory_id uuid references public.comun_hub_territories(id) on delete set null, monitored_entity_id uuid references public.comun_monitored_entities(id) on delete set null,
 occurred_at timestamptz not null, submitted_at timestamptz not null default now(), payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<=65536),
 status text not null default 'pending' check(status in('pending','under_review','accepted','partially_accepted','rejected','duplicate','archived')),
 verification_status text not null default 'unverified' check(verification_status in('unverified','internally_consistent','evidence_supported','corroborated','officially_confirmed','disputed')),
 public_visibility text not null default 'private' check(public_visibility in('private','aggregate_only','archived')),
 confidence_level text not null default 'reported' check(confidence_level in('reported','reviewed','supported','confirmed')),
 deduplication_hash text, source_type text not null default 'community_report' check(source_type in('community_report','field_team','public_source','official_source','imported_reviewed')),
 public_protocol text unique, private_contact text, submitter_hash text, internal_notes text, calculated_fields jsonb not null default '{}' check(jsonb_typeof(calculated_fields)='object' and pg_column_size(calculated_fields)<=16384),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.comun_observation_verification_events(
 id uuid primary key default gen_random_uuid(), observation_id uuid not null references public.comun_observations(id) on delete cascade,
 event_type text not null check(event_type in('review','duplicate','inconsistency','evidence','corroboration','dispute','approval','rejection')),
 decision text not null, public_note text, private_note text, evidence_id uuid references public.comun_pauta_evidence_items(id) on delete set null,
 performed_by text, created_at timestamptz not null default now()
);
create table public.comun_metric_definitions(
 id uuid primary key default gen_random_uuid(), observatory_id uuid not null references public.comun_observatories(id) on delete cascade,
 slug text not null, title text not null, description_public text not null, unit text not null,
 calculation_type text not null check(calculation_type in('count','percentage','average','median','percentile','duration','rate','distribution','categorical_breakdown','time_series')),
 aggregation_config jsonb not null check(jsonb_typeof(aggregation_config)='object' and pg_column_size(aggregation_config)<=16384),
 methodology_version_id uuid not null references public.comun_observatory_methodologies(id), minimum_sample_size integer not null default 1 check(minimum_sample_size between 1 and 100000),
 public_visibility text not null default 'private' check(public_visibility in('private','public','archived')), created_at timestamptz not null default now(), unique(observatory_id,slug)
);
create table public.comun_metric_snapshots(
 id uuid primary key default gen_random_uuid(), metric_definition_id uuid not null references public.comun_metric_definitions(id) on delete cascade,
 period_start timestamptz not null, period_end timestamptz not null, territory_id uuid references public.comun_hub_territories(id) on delete set null,
 monitored_entity_id uuid references public.comun_monitored_entities(id) on delete set null, value_numeric numeric, value_json jsonb,
 sample_size integer not null check(sample_size>=0), coverage_summary text, limitations_public text,
 methodology_version_id uuid not null references public.comun_observatory_methodologies(id), generated_at timestamptz not null default now(),
 publication_status text not null default 'internal' check(publication_status in('internal','review','approved_public','superseded','archived')),
 check(period_end>period_start), check(value_numeric is not null or value_json is not null)
);
create unique index comun_metric_snapshot_idempotent on public.comun_metric_snapshots(metric_definition_id,period_start,period_end,coalesce(territory_id,'00000000-0000-0000-0000-000000000000'),coalesce(monitored_entity_id,'00000000-0000-0000-0000-000000000000'),methodology_version_id);
create table public.comun_transport_lines(
 monitored_entity_id uuid primary key references public.comun_monitored_entities(id) on delete cascade, public_line_code text not null,
 public_line_name text not null, operator_public text, municipality text not null, active_status text not null default 'active' check(active_status in('active','temporarily_suspended','inactive','unknown')),
 source text, last_verified_at timestamptz
);
create table public.comun_transport_stops(
 monitored_entity_id uuid primary key references public.comun_monitored_entities(id) on delete cascade, public_stop_name text not null,
 public_stop_code text, territory_id uuid references public.comun_hub_territories(id) on delete set null, approximate_location text,
 latitude numeric check(latitude between -90 and 90), longitude numeric check(longitude between -180 and 180),
 accessibility_known text not null default 'unknown' check(accessibility_known in('yes','no','partial','unknown')), source text, last_verified_at timestamptz
);
create table public.comun_observatory_reports(
 id uuid primary key default gen_random_uuid(), observatory_id uuid not null references public.comun_observatories(id) on delete cascade,
 slug text unique not null, title text not null, period_start timestamptz not null, period_end timestamptz not null, methodology_version_id uuid not null references public.comun_observatory_methodologies(id),
 public_summary text not null, coverage_public text, limitations_public text, claims_public text, next_actions_public text,
 publication_status text not null default 'draft' check(publication_status in('draft','review','published','archived')), published_at timestamptz, created_at timestamptz not null default now()
);
create table public.comun_observatory_action_links(
 observatory_id uuid not null references public.comun_observatories(id) on delete cascade, action_id uuid not null references public.comun_mobilization_actions(id) on delete cascade,
 public_note text, created_at timestamptz not null default now(), primary key(observatory_id,action_id)
);
create index comun_observations_review on public.comun_observations(observatory_id,status,submitted_at);
create index comun_observations_period on public.comun_observations(observatory_id,occurred_at) where status='accepted';
create index comun_observations_dedup on public.comun_observations(deduplication_hash) where deduplication_hash is not null;
create index comun_snapshots_public on public.comun_metric_snapshots(publication_status,period_end desc);
create index comun_entities_public on public.comun_monitored_entities(observatory_id,status,entity_type);

do $$ declare t text; begin foreach t in array array['comun_observatories','comun_observatory_methodologies','comun_observation_form_versions','comun_monitored_entities','comun_observations','comun_observation_verification_events','comun_metric_definitions','comun_metric_snapshots','comun_transport_lines','comun_transport_stops','comun_observatory_reports','comun_observatory_action_links'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); execute format('grant select,insert,update,delete on public.%I to service_role',t); end loop; end $$;

insert into public.comun_observatories(slug,title,public_summary,theme,status,public_visibility,starts_at)
values('onibus-em-movimento','Ônibus em Movimento — Monitoramento Popular do Transporte','Observações comunitárias sobre espera, atraso, lotação, acessibilidade e qualidade do transporte coletivo.','transport','pilot','public',now()) on conflict(slug) do nothing;
with o as(select id from public.comun_observatories where slug='onibus-em-movimento')
insert into public.comun_observatory_methodologies(observatory_id,version,title,public_methodology,sampling_notes_public,limitations_public,aggregation_rules,status,approved_by,approved_at,valid_from)
select id,'1.0','Metodologia piloto','Observações comunitárias revisadas são agregadas por período. Atrasos são calculados a partir dos horários informados, não digitados.','Amostra por adesão, sem inferência para toda a rede.','Cobertura varia por linha, ponto, dia e horário; relatos não são dados oficiais.',
'{"tolerance_minutes":5,"minimum_sample_size":3,"unknown_schedule":"exclude_delay","skipped_service":"separate_count","duplicates":"exclude_identical","period":"monthly"}'::jsonb,'approved','Equipe COMUN',now(),now() from o on conflict(observatory_id,version) do nothing;
update public.comun_observatories o set methodology_version_id=m.id from public.comun_observatory_methodologies m where o.id=m.observatory_id and o.slug='onibus-em-movimento' and m.version='1.0';
with o as(select id from public.comun_observatories where slug='onibus-em-movimento') insert into public.comun_observation_form_versions(observatory_id,version,title,schema_definition,status,valid_from)
select id,'1.0','Observação de transporte',jsonb_build_object('consent_text','Concordo com o uso agregado e moderado desta observação.','fields',jsonb_build_array(
 jsonb_build_object('key','line','label','Linha','type','monitored_entity_reference','required',true),jsonb_build_object('key','direction','label','Sentido','type','text','required',true),
 jsonb_build_object('key','stop','label','Ponto','type','monitored_entity_reference','required',false),jsonb_build_object('key','date','label','Data','type','date','required',true),
 jsonb_build_object('key','expected_time','label','Horário previsto','type','time','required',false),jsonb_build_object('key','observed_time','label','Início da espera','type','time','required',true),
 jsonb_build_object('key','arrival_time','label','Chegada','type','time','required',false),jsonb_build_object('key','skipped_service','label','Ônibus não passou','type','boolean','required',false),
 jsonb_build_object('key','crowding','label','Lotação','type','rating_dimension','required',true,'options',jsonb_build_array('assentos_disponiveis','em_pe_com_espaco','cheio','superlotado','não_observado')),
 jsonb_build_object('key','cleanliness','label','Limpeza','type','rating_dimension','required',true,'options',jsonb_build_array('adequada','atenção','ruim','não_observado')),
 jsonb_build_object('key','accessibility','label','Acessibilidade','type','rating_dimension','required',true,'options',jsonb_build_array('disponível','indisponível','não_utilizada','desconhecida')),
 jsonb_build_object('key','conservation','label','Conservação','type','rating_dimension','required',true,'options',jsonb_build_array('adequada','atenção','ruim','risco_aparente','não_observado')),
 jsonb_build_object('key','climate','label','Climatização','type','rating_dimension','required',true,'options',jsonb_build_array('funcionando','insuficiente','desligada','inexistente','não_observado')),
 jsonb_build_object('key','passenger_information','label','Informação ao passageiro','type','rating_dimension','required',true,'options',jsonb_build_array('adequada','insuficiente','ausente','não_observado')),
 jsonb_build_object('key','note','label','Observação','type','textarea','required',false),jsonb_build_object('key','optional_evidence','label','Evidência opcional','type','optional_evidence','required',false)
)),'approved',now() from o on conflict(observatory_id,version) do nothing;
with x as(select o.id oid,m.id mid from public.comun_observatories o join public.comun_observatory_methodologies m on m.observatory_id=o.id where o.slug='onibus-em-movimento' and m.version='1.0'), defs(slug,title,unit,kind,config) as(values
('total-observacoes','Total de observações','observações','count','{"field":"*"}'::jsonb),('atraso-mediano','Atraso mediano','min','median','{"field":"delay_minutes"}'::jsonb),('atraso-medio','Atraso médio','min','average','{"field":"delay_minutes"}'::jsonb),('atraso-p90','P90 do atraso','min','percentile','{"field":"delay_minutes","percentile":90}'::jsonb),('dentro-tolerancia','Dentro da tolerância','%','percentage','{"field":"delay_minutes","operator":"lte_tolerance"}'::jsonb),('acima-dez-minutos','Acima de 10 minutos','%','percentage','{"field":"delay_minutes","operator":"gt","value":10}'::jsonb),('servico-nao-passou','Serviço não passou','relatos','count','{"field":"skipped_service","equals":true}'::jsonb),('lotacao','Distribuição de lotação','categorias','distribution','{"field":"crowding"}'::jsonb),('acessibilidade','Acessibilidade disponível','categorias','categorical_breakdown','{"field":"accessibility"}'::jsonb),('conservacao','Conservação','categorias','categorical_breakdown','{"field":"conservation"}'::jsonb),('limpeza','Limpeza','categorias','categorical_breakdown','{"field":"cleanliness"}'::jsonb),('climatizacao','Climatização','categorias','categorical_breakdown','{"field":"climate"}'::jsonb)) insert into public.comun_metric_definitions(observatory_id,slug,title,description_public,unit,calculation_type,aggregation_config,methodology_version_id,minimum_sample_size,public_visibility) select x.oid,d.slug,d.title,'Indicador comunitário sujeito à cobertura e à metodologia publicada.',d.unit,d.kind,d.config,x.mid,3,'public' from x cross join defs d on conflict(observatory_id,slug) do nothing;
