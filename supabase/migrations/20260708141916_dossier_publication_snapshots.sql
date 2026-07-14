alter table public.comun_pauta_dossiers
  add column if not exists final_publication_checklist jsonb not null default '{}'::jsonb,
  add column if not exists final_publication_notes text;

create table if not exists public.comun_pauta_dossier_publication_snapshots (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.comun_pauta_dossiers(id) on delete cascade,
  public_title text not null,
  public_summary text not null,
  public_body text not null,
  public_slug text not null,
  published_by_user_id uuid references public.comun_admin_profiles(id) on delete set null,
  published_by_name_snapshot text,
  published_at timestamptz not null default now(),
  unpublished_at timestamptz,
  unpublished_by_user_id uuid references public.comun_admin_profiles(id) on delete set null,
  unpublish_reason text,
  snapshot_status text not null default 'published',
  created_at timestamptz not null default now(),
  constraint comun_pauta_dossier_publication_snapshots_status_check
    check (snapshot_status in ('published', 'superseded', 'unpublished', 'rollback')),
  constraint comun_pauta_dossier_publication_snapshots_unpublish_reason_check
    check (unpublished_at is null or nullif(trim(coalesce(unpublish_reason, '')), '') is not null)
);

alter table public.comun_pauta_dossier_publication_snapshots enable row level security;

revoke all on public.comun_pauta_dossier_publication_snapshots from anon, authenticated;
grant all on public.comun_pauta_dossier_publication_snapshots to service_role;

create index if not exists comun_pauta_dossier_publication_snapshots_dossier_idx
  on public.comun_pauta_dossier_publication_snapshots(dossier_id, created_at desc);

create index if not exists comun_pauta_dossier_publication_snapshots_public_idx
  on public.comun_pauta_dossier_publication_snapshots(public_slug, published_at desc)
  where snapshot_status in ('published', 'rollback') and unpublished_at is null;

create unique index if not exists comun_pauta_dossier_publication_snapshots_active_slug_uniq
  on public.comun_pauta_dossier_publication_snapshots(public_slug)
  where snapshot_status in ('published', 'rollback') and unpublished_at is null;
