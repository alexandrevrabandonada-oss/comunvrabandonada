alter table public.comun_pauta_dossiers
  add column if not exists review_status text not null default 'draft',
  add column if not exists reviewed_by_editor_at timestamptz,
  add column if not exists approved_for_publication_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists unpublished_at timestamptz,
  add column if not exists public_slug text unique,
  add column if not exists public_title text,
  add column if not exists public_body text,
  add column if not exists public_summary text,
  add column if not exists publication_notes text;

alter table public.comun_pauta_dossiers
  drop constraint if exists comun_pauta_dossiers_review_status_check;

alter table public.comun_pauta_dossiers
  add constraint comun_pauta_dossiers_review_status_check
  check (review_status in ('draft', 'editorial_review', 'changes_requested', 'approved', 'published', 'unpublished', 'archived'));

create index if not exists comun_pauta_dossiers_review_status_idx on public.comun_pauta_dossiers(review_status);
create index if not exists comun_pauta_dossiers_public_slug_idx on public.comun_pauta_dossiers(public_slug) where public_slug is not null;
create index if not exists comun_pauta_dossiers_published_idx
  on public.comun_pauta_dossiers(published_at desc)
  where review_status = 'published' and published_at is not null and unpublished_at is null;

revoke all on table public.comun_pauta_dossiers from anon, authenticated;
grant all on table public.comun_pauta_dossiers to service_role;
