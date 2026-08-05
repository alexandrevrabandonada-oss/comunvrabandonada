begin;

-- 48.1B-R2: bundle aditivo de Production. Nenhuma publicação ou RPC de cliente
-- é criada nesta etapa; a ativação depende de um dry-run e gates separados.
create schema if not exists private;

create table if not exists private.comun_production_wallets (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  status text not null default 'active' check (status in ('active','rotated','revoked')),
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);

create table if not exists private.comun_production_wallet_items (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references private.comun_production_wallets(id) on delete restrict,
  item_type text not null check (item_type in ('relata_report','official_protocol','sidewalk_record','bus_observation')),
  subject_ref text not null,
  subject_hash bytea not null,
  presentation_state text not null default 'Guardado',
  action_required text,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wallet_id, item_type, subject_hash)
);

create table if not exists private.comun_production_wallet_events (
  id bigint generated always as identity primary key,
  wallet_id uuid not null references private.comun_production_wallets(id) on delete restrict,
  item_id uuid references private.comun_production_wallet_items(id) on delete restrict,
  event_type text not null,
  result_code text not null,
  created_at timestamptz not null default now()
);

create table if not exists private.comun_production_wallet_recovery (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references private.comun_production_wallets(id) on delete restrict,
  recovery_hash bytea not null unique,
  active boolean not null default true,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists private.comun_production_relata_reports (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  receipt_hash bytea not null unique,
  status text not null default 'captured_private',
  category text,
  description_private text,
  owner_wallet_id uuid references private.comun_production_wallets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table if not exists private.comun_production_relata_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references private.comun_production_relata_reports(id) on delete restrict,
  kind text not null check (kind in ('photo','location')),
  state text not null default 'private',
  object_key text,
  checksum_sha256 bytea,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table if not exists private.comun_production_relata_locations (
  report_id uuid primary key references private.comun_production_relata_reports(id) on delete restrict,
  ciphertext bytea not null,
  nonce bytea not null,
  auth_tag bytea not null,
  key_version text not null,
  captured_at timestamptz not null,
  withdrawn_at timestamptz
);

create index if not exists comun_production_wallet_items_order_idx
  on private.comun_production_wallet_items(wallet_id, archived_at, updated_at desc);
create index if not exists comun_production_relata_evidence_report_idx
  on private.comun_production_relata_evidence(report_id, state, created_at);

alter table private.comun_production_wallets enable row level security;
alter table private.comun_production_wallets force row level security;
alter table private.comun_production_wallet_items enable row level security;
alter table private.comun_production_wallet_items force row level security;
alter table private.comun_production_wallet_events enable row level security;
alter table private.comun_production_wallet_events force row level security;
alter table private.comun_production_wallet_recovery enable row level security;
alter table private.comun_production_wallet_recovery force row level security;
alter table private.comun_production_relata_reports enable row level security;
alter table private.comun_production_relata_reports force row level security;
alter table private.comun_production_relata_evidence enable row level security;
alter table private.comun_production_relata_evidence force row level security;
alter table private.comun_production_relata_locations enable row level security;
alter table private.comun_production_relata_locations force row level security;

revoke all on table
  private.comun_production_wallets,
  private.comun_production_wallet_items,
  private.comun_production_wallet_events,
  private.comun_production_wallet_recovery,
  private.comun_production_relata_reports,
  private.comun_production_relata_evidence,
  private.comun_production_relata_locations
from public, anon, authenticated;

grant all on table
  private.comun_production_wallets,
  private.comun_production_wallet_items,
  private.comun_production_wallet_events,
  private.comun_production_wallet_recovery,
  private.comun_production_relata_reports,
  private.comun_production_relata_evidence,
  private.comun_production_relata_locations
to service_role;

comment on schema private is
  'COMUN 48.1B-R2: capacidades privadas; sem CRUD direto ou projeção pública.';

commit;
