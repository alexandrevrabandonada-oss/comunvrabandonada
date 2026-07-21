-- Sprint 39.1 — autorização curta e confirmação em duas fases para originais privados.
create table if not exists public.comun_sidewalk_uploads (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null references auth.users(id) on delete cascade,
  object_key text not null unique,
  original_filename text not null,
  declared_mime_type text not null check (declared_mime_type in ('image/jpeg','image/png','image/webp')),
  declared_size_bytes bigint not null check (declared_size_bytes between 12 and 31457280),
  submission_payload jsonb not null default '{}'::jsonb,
  status text not null default 'awaiting_upload'
    check (status in ('draft','awaiting_upload','uploaded','confirmed','upload_failed','abandoned')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  uploaded_at timestamptz,
  confirmed_at timestamptz,
  failure_code text,
  record_id uuid references public.comun_sidewalk_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comun_sidewalk_uploads_owner_idx
  on public.comun_sidewalk_uploads(member_user_id, created_at desc);
create index if not exists comun_sidewalk_uploads_cleanup_idx
  on public.comun_sidewalk_uploads(status, expires_at)
  where status in ('draft','awaiting_upload','uploaded','upload_failed');

alter table public.comun_sidewalk_uploads enable row level security;
grant all on table public.comun_sidewalk_uploads to service_role;
grant select on table public.comun_sidewalk_uploads to authenticated;
create policy "member_reads_own_sidewalk_uploads"
  on public.comun_sidewalk_uploads for select to authenticated
  using ((select auth.uid()) = member_user_id);

-- Escritas são feitas pelo backend. A URL assinada autoriza somente um objeto
-- específico no bucket privado; nenhuma política de leitura pública é criada.
comment on table public.comun_sidewalk_uploads is
  'Autorizações efêmeras de upload direto. Payload e object_key são privados.';
comment on column public.comun_sidewalk_uploads.submission_payload is
  'Metadados privados necessários à confirmação; nunca projetar publicamente.';
