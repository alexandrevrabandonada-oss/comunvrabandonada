alter table public.comun_report_attachments
  drop constraint if exists comun_report_attachments_private_default_check;

alter table public.comun_report_attachments
  add column if not exists review_status text not null default 'pending',
  add column if not exists public_storage_bucket text null,
  add column if not exists public_storage_path text null,
  add column if not exists public_mime_type text null,
  add column if not exists public_size_bytes integer null,
  add column if not exists needs_redaction boolean not null default false,
  add column if not exists redaction_notes text null,
  add column if not exists reviewed_by uuid null references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists public_approved_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comun_report_attachments_review_status_check'
  ) then
    alter table public.comun_report_attachments
      add constraint comun_report_attachments_review_status_check
      check (review_status in ('pending','approved_private','needs_redaction','public_ready','rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'comun_report_attachments_public_ready_check'
  ) then
    alter table public.comun_report_attachments
      add constraint comun_report_attachments_public_ready_check
      check (
        public_approved is false
        or (
          review_status = 'public_ready'
          and public_storage_bucket is not null
          and public_storage_path is not null
          and public_approved_at is not null
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'comun_report_attachments_public_bucket_check'
  ) then
    alter table public.comun_report_attachments
      add constraint comun_report_attachments_public_bucket_check
      check (public_storage_bucket is null or public_storage_bucket = 'comun-public-safe-attachments');
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comun-public-safe-attachments',
  'comun-public-safe-attachments',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create index if not exists comun_report_attachments_review_status_idx
on public.comun_report_attachments (review_status, created_at desc);

create index if not exists comun_report_attachments_public_safe_idx
on public.comun_report_attachments (report_id, public_approved, review_status)
where public_approved is true and review_status = 'public_ready';
