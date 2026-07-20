-- Sprint 37 — miniapp local do Mapa Real das Calçadas.
-- Mudança aditiva. Nenhum dado real é incluído.

insert into public.comun_pauta_spaces
  (slug,title,summary,category,community,status,visibility,public_synthesis,next_step,public_status,problem_public,demand_public,participation_public)
values
  ('calcadas-em-circulacao','Calçadas em Circulação — Mapa Popular das Calçadas','Processo coletivo para registrar, verificar e encaminhar barreiras de acessibilidade.','sidewalk_accessibility','cidade','organizing','public','Piloto local sem registros reais. A síntese será construída apenas com contribuições revisadas.','Abrir o miniapp, compreender a metodologia e preparar o gate humano.','investigating','Barreiras em calçadas dificultam a circulação segura.','Documentar e construir prioridades auditáveis sem inferir cobertura completa.','Explore o mapa ou envie um registro para revisão.')
on conflict (slug) do nothing;

insert into public.comun_pauta_modules
  (pauta_id,module_type,title_override,public_description,position,status,visibility,config,created_by)
select id,'map','Mapa das Calçadas','A ferramenta cartográfica da pauta possui rota própria e mantém aqui o vínculo com o processo coletivo.',10,'active','public','{"layerIds":["sidewalk_accessibility"]}'::jsonb,'migration:sprint-37'
from public.comun_pauta_spaces where slug='calcadas-em-circulacao'
on conflict (pauta_id,module_type) do update set status='active',visibility='public',config=excluded.config,updated_at=now();

alter table public.comun_sidewalk_records
  add column if not exists municipality text,
  add column if not exists neighborhood text,
  add column if not exists private_geometry_geojson jsonb,
  add column if not exists public_geometry_geojson jsonb,
  add column if not exists location_source text not null default 'manual'
    check (location_source in ('manual','device','neighborhood','editorial')),
  add column if not exists location_precision text not null default 'approximate'
    check (location_precision in ('exact','approximate','neighborhood','hidden')),
  add column if not exists condition text not null default 'regular'
    check (condition in ('good','regular','bad','terrible')),
  add column if not exists forwarding_status text not null default 'no_action'
    check (forwarding_status in ('no_action','priority','forwarded','waiting_response','in_progress','resolved','reopened')),
  add column if not exists last_observed_at timestamptz not null default now();

alter table public.comun_sidewalk_records alter column geometry_geojson drop not null;

alter table public.comun_sidewalk_records
  add constraint comun_sidewalk_private_geometry_check check (
    private_geometry_geojson is null or (
      jsonb_typeof(private_geometry_geojson) = 'object'
      and private_geometry_geojson->>'type' in ('Point','LineString')
      and private_geometry_geojson ? 'coordinates'
    )
  ),
  add constraint comun_sidewalk_public_geometry_check check (
    public_geometry_geojson is null or (
      jsonb_typeof(public_geometry_geojson) = 'object'
      and public_geometry_geojson->>'type' in ('Point','LineString')
      and public_geometry_geojson ? 'coordinates'
    )
  );

update public.comun_sidewalk_records
set public_geometry_geojson = geometry_geojson,
    location_precision = public_location_level
where public_geometry_geojson is null and visibility = 'public';

create index if not exists comun_sidewalk_records_filter_idx
  on public.comun_sidewalk_records(pauta_id, condition, forwarding_status, last_observed_at desc)
  where visibility = 'public' and status in ('verified','published');

create table if not exists public.comun_sidewalk_observations (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  observation_type text not null check (observation_type in ('same','worse','resolved','different')),
  note_private text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  created_at timestamptz not null default now()
);

create index if not exists comun_sidewalk_observations_record_idx
  on public.comun_sidewalk_observations(record_id, created_at desc);
alter table public.comun_sidewalk_observations enable row level security;
revoke all on public.comun_sidewalk_observations from anon, authenticated;
grant select, insert, update, delete on public.comun_sidewalk_observations to service_role;

create table if not exists public.comun_sidewalk_municipal_configs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  center_longitude double precision not null,
  center_latitude double precision not null,
  default_zoom numeric(4,2) not null default 12,
  bounds_geojson jsonb,
  neighborhoods text[] not null default '{}',
  responsible_community_slug text,
  methodology_public text not null,
  coverage_status text not null default 'pilot' check (coverage_status in ('pilot','partial','active','paused','closed')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comun_sidewalk_municipal_configs enable row level security;
revoke all on public.comun_sidewalk_municipal_configs from anon, authenticated;
grant select, insert, update, delete on public.comun_sidewalk_municipal_configs to service_role;

insert into public.comun_sidewalk_municipal_configs
  (slug,name,center_longitude,center_latitude,default_zoom,neighborhoods,responsible_community_slug,methodology_public,coverage_status,is_active)
values
  ('volta-redonda','Volta Redonda',-44.1042,-22.5202,12,'{}','cidade','Contribuições comunitárias revisadas, com localização pública sanitizada e cobertura por adesão.','pilot',true)
on conflict (slug) do nothing;

comment on column public.comun_sidewalk_records.private_geometry_geojson is 'Geometria original privada; nunca selecionar em consultas públicas.';
comment on column public.comun_sidewalk_records.public_geometry_geojson is 'Geometria sanitizada aprovada para exibição pública.';
