create table if not exists public.comun_pauta_synthesis_versions (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  previous_public_synthesis text null,
  new_public_synthesis text null,
  previous_next_step text null,
  new_next_step text null,
  editor_note text null,
  created_at timestamptz not null default now()
);

create table if not exists public.comun_pauta_evidence_items (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  source_type text not null,
  source_id uuid null,
  title text not null,
  summary text null,
  evidence_type text not null default 'general',
  sensitivity text not null default 'public_safe',
  status text not null default 'candidate',
  public_note text null,
  internal_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_pauta_evidence_source_type_check check (source_type in ('contribution', 'report', 'official_protocol', 'manual', 'external_reference')),
  constraint comun_pauta_evidence_type_check check (evidence_type in ('relato', 'foto_segura', 'protocolo', 'resposta_oficial', 'dado_agregado', 'documento', 'testemunho', 'outro')),
  constraint comun_pauta_evidence_sensitivity_check check (sensitivity in ('public_safe', 'needs_review', 'private_only')),
  constraint comun_pauta_evidence_status_check check (status in ('candidate', 'approved', 'rejected', 'archived'))
);

alter table public.comun_pauta_spaces
  add column if not exists editorial_checklist text[] not null default '{}';

create index if not exists comun_pauta_synthesis_versions_pauta_idx
  on public.comun_pauta_synthesis_versions (pauta_id, created_at desc);

create index if not exists comun_pauta_evidence_items_public_idx
  on public.comun_pauta_evidence_items (pauta_id, status, sensitivity, created_at desc);

alter table public.comun_pauta_synthesis_versions enable row level security;
alter table public.comun_pauta_evidence_items enable row level security;

drop policy if exists "Public can read public safe approved pauta evidence" on public.comun_pauta_evidence_items;
create policy "Public can read public safe approved pauta evidence"
  on public.comun_pauta_evidence_items
  for select
  to anon, authenticated
  using (
    status = 'approved'
    and sensitivity = 'public_safe'
    and exists (
      select 1
      from public.comun_pauta_spaces spaces
      where spaces.id = pauta_id
        and spaces.visibility = 'public'
        and spaces.status <> 'archived'
    )
  );

grant select on public.comun_pauta_evidence_items to anon, authenticated;
