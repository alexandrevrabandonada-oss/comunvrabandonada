create table if not exists public.comun_public_dossier_features (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.comun_pauta_dossier_publication_snapshots(id) on delete cascade,
  slot text not null default 'featured',
  public_label text,
  public_note text,
  priority integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comun_public_dossier_features_snapshot_idx
  on public.comun_public_dossier_features(snapshot_id);

create index if not exists comun_public_dossier_features_active_slot_idx
  on public.comun_public_dossier_features(active, slot, priority, updated_at desc);

alter table public.comun_public_dossier_features enable row level security;

revoke all on table public.comun_public_dossier_features from anon;
revoke all on table public.comun_public_dossier_features from authenticated;
grant select, insert, update, delete on table public.comun_public_dossier_features to service_role;
