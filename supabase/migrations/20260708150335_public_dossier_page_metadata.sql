alter table public.comun_pauta_dossier_publication_snapshots
  add column if not exists public_change_note text,
  add column if not exists public_version_label text not null default 'Versao revisada',
  add column if not exists public_updated_at timestamptz;

create index if not exists comun_pauta_dossier_publication_snapshots_public_updated_idx
  on public.comun_pauta_dossier_publication_snapshots(public_updated_at desc)
  where snapshot_status in ('published', 'rollback') and unpublished_at is null;
