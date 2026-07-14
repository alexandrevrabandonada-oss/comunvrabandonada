alter table public.comun_pauta_dossiers
  add column if not exists factual_reviewer_assigned text,
  add column if not exists editorial_reviewer_assigned text,
  add column if not exists review_priority text not null default 'normal',
  add column if not exists review_due_at timestamptz,
  add column if not exists review_notes_internal text;

alter table public.comun_pauta_dossiers
  drop constraint if exists comun_pauta_dossiers_review_priority_check;

alter table public.comun_pauta_dossiers
  add constraint comun_pauta_dossiers_review_priority_check
  check (review_priority in ('low', 'normal', 'high', 'urgent'));

create index if not exists comun_pauta_dossiers_review_priority_idx on public.comun_pauta_dossiers(review_priority);
create index if not exists comun_pauta_dossiers_review_due_at_idx on public.comun_pauta_dossiers(review_due_at) where review_due_at is not null;
create index if not exists comun_pauta_dossiers_factual_assigned_idx on public.comun_pauta_dossiers(factual_reviewer_assigned) where factual_reviewer_assigned is not null;
create index if not exists comun_pauta_dossiers_editorial_assigned_idx on public.comun_pauta_dossiers(editorial_reviewer_assigned) where editorial_reviewer_assigned is not null;

revoke all on table public.comun_pauta_dossiers from anon, authenticated;
grant all on table public.comun_pauta_dossiers to service_role;
