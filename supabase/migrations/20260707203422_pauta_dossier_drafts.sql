create table if not exists public.comun_pauta_dossiers (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  slug text not null unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'ready', 'archived')),
  executive_summary text,
  problem_statement text,
  affected_communities text,
  evidence_summary text,
  official_protocols_summary text,
  demands text,
  next_steps text,
  public_version text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comun_pauta_dossier_evidence (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.comun_pauta_dossiers(id) on delete cascade,
  evidence_id uuid not null references public.comun_pauta_evidence_items(id) on delete cascade,
  position integer not null default 0,
  included_note text,
  created_at timestamptz not null default now(),
  unique (dossier_id, evidence_id)
);

create index if not exists comun_pauta_dossiers_pauta_id_idx on public.comun_pauta_dossiers(pauta_id);
create index if not exists comun_pauta_dossiers_status_idx on public.comun_pauta_dossiers(status);
create index if not exists comun_pauta_dossiers_updated_at_idx on public.comun_pauta_dossiers(updated_at desc);
create index if not exists comun_pauta_dossier_evidence_dossier_id_idx on public.comun_pauta_dossier_evidence(dossier_id);
create index if not exists comun_pauta_dossier_evidence_evidence_id_idx on public.comun_pauta_dossier_evidence(evidence_id);

alter table public.comun_pauta_dossiers enable row level security;
alter table public.comun_pauta_dossier_evidence enable row level security;

revoke all on table public.comun_pauta_dossiers from anon, authenticated;
revoke all on table public.comun_pauta_dossier_evidence from anon, authenticated;
grant all on table public.comun_pauta_dossiers to service_role;
grant all on table public.comun_pauta_dossier_evidence to service_role;
