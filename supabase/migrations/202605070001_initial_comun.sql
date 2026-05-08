create extension if not exists pgcrypto;

create table if not exists public.comun_communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_description text not null,
  full_description text not null,
  main_cta text not null,
  icon text null,
  accent text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comun_issues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  community_slug text not null references public.comun_communities(slug),
  title text not null,
  summary text not null,
  status text not null default 'receiving_reports',
  timeline jsonb not null default '[]'::jsonb,
  useful_materials jsonb not null default '[]'::jsonb,
  next_steps text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_issues_status_check check (status in ('receiving_reports','checking','became_post','preparing_dossier','forwarded','monitoring','archived'))
);

create table if not exists public.comun_reports (
  id uuid primary key default gen_random_uuid(),
  protocol text unique not null,
  community_slug text not null references public.comun_communities(slug),
  issue_slug text null references public.comun_issues(slug),
  title text null,
  raw_text text not null,
  public_text text null,
  period_text text null,
  approximate_location text null,
  neighborhood text null,
  involved_entity text null,
  is_anonymous boolean not null default true,
  can_publish_sanitized boolean not null default false,
  accepts_contact boolean not null default false,
  private_contact text null,
  status text not null default 'received',
  risk_level text not null default 'unknown',
  internal_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  constraint comun_reports_status_check check (status in ('received','under_review','needs_more_info','sanitized','published','linked_to_issue','archived')),
  constraint comun_reports_risk_check check (risk_level in ('unknown','low','medium','high','critical')),
  constraint comun_reports_publication_check check (status <> 'published' or (public_text is not null and can_publish_sanitized is true))
);

create table if not exists public.comun_dossiers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  issue_slug text null references public.comun_issues(slug),
  title text not null,
  executive_summary text not null,
  context_text text null,
  timeline jsonb not null default '[]'::jsonb,
  patterns jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  forwarding_log jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comun_actions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  action_type text not null,
  visitor_token text null,
  note text null,
  created_at timestamptz not null default now(),
  constraint comun_actions_type_check check (action_type in ('confirm','similar_report','follow','needs_check','useful_material','support'))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists comun_reports_updated_at on public.comun_reports;
create trigger comun_reports_updated_at before update on public.comun_reports
for each row execute function public.set_updated_at();

drop trigger if exists comun_communities_updated_at on public.comun_communities;
create trigger comun_communities_updated_at before update on public.comun_communities
for each row execute function public.set_updated_at();

drop trigger if exists comun_issues_updated_at on public.comun_issues;
create trigger comun_issues_updated_at before update on public.comun_issues
for each row execute function public.set_updated_at();

drop trigger if exists comun_dossiers_updated_at on public.comun_dossiers;
create trigger comun_dossiers_updated_at before update on public.comun_dossiers
for each row execute function public.set_updated_at();

create or replace view public.comun_public_reports as
select
  id,
  protocol,
  community_slug,
  issue_slug,
  title,
  public_text,
  period_text,
  approximate_location,
  neighborhood,
  status,
  risk_level,
  created_at,
  published_at
from public.comun_reports
where status = 'published'
  and public_text is not null
  and can_publish_sanitized is true;

alter table public.comun_communities enable row level security;
alter table public.comun_issues enable row level security;
alter table public.comun_reports enable row level security;
alter table public.comun_dossiers enable row level security;
alter table public.comun_actions enable row level security;

drop policy if exists "Public can read active communities" on public.comun_communities;
create policy "Public can read active communities"
on public.comun_communities for select
using (is_active = true);

drop policy if exists "Public can read issues" on public.comun_issues;
create policy "Public can read issues"
on public.comun_issues for select
using (true);

drop policy if exists "Visitors can insert reports" on public.comun_reports;
create policy "Visitors can insert reports"
on public.comun_reports for insert
with check (
  raw_text is not null
  and status = 'received'
  and public_text is null
  and internal_notes is null
);

drop policy if exists "Public cannot read raw reports" on public.comun_reports;
create policy "Public cannot read raw reports"
on public.comun_reports for select
using (false);

drop policy if exists "Public can read published dossiers" on public.comun_dossiers;
create policy "Public can read published dossiers"
on public.comun_dossiers for select
using (status = 'published');

drop policy if exists "Visitors can insert lightweight actions" on public.comun_actions;
create policy "Visitors can insert lightweight actions"
on public.comun_actions for insert
with check (action_type in ('confirm','similar_report','follow','needs_check','useful_material','support'));

insert into public.comun_communities (slug, name, short_description, full_description, main_cta, icon, accent)
values
  ('trabalho','Trabalho e Burnout','Relatos sobre adoecimento no trabalho, assedio, atraso de direitos, terceirizacao, pressao, jornada abusiva e risco.','Espaco para organizar relatos de trabalhadores sobre pressao psicologica, adoecimento, assedio, atraso de direitos e riscos no trabalho.','Relatar situacao de trabalho','TB','yellow'),
  ('escolas','Escolas e Educacao','Relatos de pais, estudantes e trabalhadores sobre estrutura, falta de profissionais, merenda, transporte, calor e problemas nas escolas.','Comunidade para reunir sinais das escolas, creches e equipamentos de educacao.','Relatar problema na educacao','EE','rust'),
  ('saude','Saude Publica','Relatos sobre fila, cirurgia, exames, UBS, hospitais, falta de profissionais, terceirizacao e atendimento.','Espaco para transformar experiencias dispersas com filas, exames, cirurgias, UBS, hospitais e atendimento em pautas acompanhaveis.','Relatar situacao da saude','SP','green'),
  ('meio-ambiente','Meio Ambiente e Poluicao','Relatos sobre po preto, fumaca, cheiro forte, escoria, agua, barulho, queimadas e impactos ambientais.','Comunidade para documentar percepcoes, recorrencias e impactos ambientais.','Relatar impacto ambiental','MA','concrete'),
  ('cidade','Cidade Abandonada','Relatos sobre buracos, lixo, calcadas, iluminacao, transporte, enchentes, obras paradas e abandono dos bairros.','Espaco para reunir problemas urbanos recorrentes e organizar memoria publica sobre abandono, manutencao e servicos.','Relatar problema no bairro','CA','yellow')
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  main_cta = excluded.main_cta,
  icon = excluded.icon,
  accent = excluded.accent;

insert into public.comun_issues (slug, community_slug, title, summary, status, timeline, useful_materials, next_steps)
values
  ('trabalho-burnout-volta-redonda','trabalho','Trabalho e Burnout em Volta Redonda','Espaco para reunir relatos sobre adoecimento no trabalho, pressao psicologica, assedio, jornada abusiva, terceirizacao e atraso de direitos em Volta Redonda e regiao.','receiving_reports','["Recebendo relatos"]','["Guarde registros com seguranca"]','Reunir relatos sanitizados e identificar padroes.'),
  ('falta-profissionais-escolas','escolas','Falta de profissionais nas escolas','Pauta para reunir relatos sobre falta de professores, inspetores, apoio, merenda, transporte e estrutura nas escolas.','receiving_reports','["Pauta aberta para relatos"]','["Informe bairro e periodo quando for seguro"]','Organizar recorrencias por bairro e tipo de problema.'),
  ('fila-cirurgias-exames','saude','Fila de cirurgias e exames','Relatos sobre espera, cancelamentos, falta de retorno, exames, cirurgias e consultas na rede publica.','receiving_reports','["Recebendo casos"]','["Nao envie documentos ou prontuario"]','Separar relatos por tipo de atendimento e tempo de espera.'),
  ('po-preto-fumaca-cheiro-forte','meio-ambiente','Po preto, fumaca e cheiro forte','Registro comunitario de recorrencias percebidas envolvendo po preto, fumaca, cheiro forte, barulho e impactos ambientais.','monitoring','["Monitoramento comunitario iniciado"]','["Anote data, horario aproximado e bairro"]','Cruzar relatos por periodo, bairro e tipo.'),
  ('buracos-calcadas-abandono-bairros','cidade','Buracos, calcadas e abandono dos bairros','Pauta sobre buracos, calcadas ruins, iluminacao, lixo, enchentes, transporte e obras paradas.','receiving_reports','["Pauta aberta"]','["Descreva local aproximado"]','Montar mapa-lista textual por bairro.')
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  status = excluded.status,
  timeline = excluded.timeline,
  useful_materials = excluded.useful_materials,
  next_steps = excluded.next_steps;

insert into public.comun_dossiers (slug, issue_slug, title, executive_summary, context_text, patterns, status)
values (
  'burnout-e-pressao-no-trabalho',
  'trabalho-burnout-volta-redonda',
  'Mini-dossie: burnout e pressao no trabalho',
  'Primeiro esqueleto de dossie para organizar relatos sanitizados sobre adoecimento, pressao e jornada abusiva.',
  'Este dossie comeca como estrutura de memoria coletiva. Ele so deve usar relatos sanitizados e padroes.',
  '["Pressao por metas","Medo de retalhacao","Adoecimento emocional"]',
  'draft'
)
on conflict (slug) do update set
  title = excluded.title,
  executive_summary = excluded.executive_summary,
  context_text = excluded.context_text,
  patterns = excluded.patterns;
