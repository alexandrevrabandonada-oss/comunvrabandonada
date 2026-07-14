create table if not exists public.comun_pauta_dossier_reviews (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.comun_pauta_dossiers(id) on delete cascade,
  review_stage text not null check (review_stage in ('factual_review', 'editorial_review')),
  reviewer_name text not null,
  reviewer_role text,
  decision text not null check (decision in ('approved', 'changes_requested', 'rejected')),
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists comun_pauta_dossier_reviews_dossier_id_idx
  on public.comun_pauta_dossier_reviews(dossier_id);

create index if not exists comun_pauta_dossier_reviews_stage_decision_idx
  on public.comun_pauta_dossier_reviews(dossier_id, review_stage, decision, created_at desc);

alter table public.comun_pauta_dossier_reviews enable row level security;

revoke all on table public.comun_pauta_dossier_reviews from anon, authenticated;
grant all on table public.comun_pauta_dossier_reviews to service_role;
