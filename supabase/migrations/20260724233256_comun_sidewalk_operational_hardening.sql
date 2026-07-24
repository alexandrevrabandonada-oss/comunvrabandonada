-- Tijolo 43 — tornar o ciclo de calçadas recuperável e manter texto bruto privado.
-- Forward-only; esta migration é validada somente no Supabase local neste lote.

alter table public.comun_sidewalk_records
  alter column public_summary drop not null,
  add column if not exists complement_request_private text,
  add column if not exists complement_field_private text,
  add column if not exists complement_due_at timestamptz;

alter table public.comun_sidewalk_uploads
  add column if not exists confirmation_locked_at timestamptz,
  add column if not exists confirmation_attempts integer not null default 0,
  add column if not exists failure_kind text;

alter table public.comun_sidewalk_uploads
  drop constraint if exists comun_sidewalk_uploads_status_check;
alter table public.comun_sidewalk_uploads
  add constraint comun_sidewalk_uploads_status_check check (
    status in (
      'awaiting_upload', 'uploaded', 'confirming', 'confirmed',
      'failed_retryable', 'failed_final', 'abandoned'
    )
  );

create index if not exists comun_sidewalk_uploads_recovery_idx
  on public.comun_sidewalk_uploads(status, confirmation_locked_at, expires_at)
  where status in ('uploaded', 'confirming', 'failed_retryable');

create table if not exists public.comun_sidewalk_duplicate_suggestions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  candidate_record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  signals text[] not null default '{}',
  decision text not null default 'possible_duplicate'
    check (decision in ('possible_duplicate', 'related', 'merged', 'distinct')),
  decided_by_private text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (record_id <> candidate_record_id),
  unique(record_id, candidate_record_id)
);

alter table public.comun_sidewalk_duplicate_suggestions enable row level security;
revoke all on table public.comun_sidewalk_duplicate_suggestions from public, anon, authenticated;
grant select, insert, update, delete on table public.comun_sidewalk_duplicate_suggestions to service_role;

comment on column public.comun_sidewalk_records.private_notes is
  'Texto original privado da contribuição; nunca projetar para mapa, busca, cache ou API pública.';
comment on column public.comun_sidewalk_records.public_summary is
  'Resumo sanitizado produzido por revisão humana; obrigatório antes de publicação pública.';
comment on table public.comun_sidewalk_duplicate_suggestions is
  'Sugestões assistidas de duplicidade. Nenhuma relação funde registros automaticamente.';
