begin;

alter table public.comun_sidewalk_records
  alter column public_summary drop not null,
  add column if not exists complement_request_private text,
  add column if not exists complement_field_private text,
  add column if not exists complement_due_at timestamptz;

alter table public.comun_sidewalk_uploads
  add column if not exists confirmation_state text not null default 'idle'
    check (confirmation_state in ('idle','ready','confirming','confirmed','failed_retryable','failed_final','abandoned')),
  add column if not exists confirmation_locked_at timestamptz,
  add column if not exists confirmation_attempts integer not null default 0,
  add column if not exists failure_kind text;

update public.comun_sidewalk_records
set private_notes = public_summary,
    public_summary = null
where visibility <> 'public'
  and private_notes is null
  and public_summary is not null;

update public.comun_sidewalk_records
set public_summary = null
where visibility <> 'public'
  and public_summary is not null;

update public.comun_sidewalk_uploads
set confirmation_state = case
  when status = 'confirmed' then 'confirmed'
  when status = 'abandoned' then 'abandoned'
  when status = 'upload_failed' then 'failed_retryable'
  when status = 'uploaded' then 'ready'
  else 'idle'
end
where confirmation_state = 'idle';

create index if not exists comun_sidewalk_uploads_recovery_idx
  on public.comun_sidewalk_uploads(confirmation_state, confirmation_locked_at, expires_at)
  where confirmation_state in ('ready', 'confirming', 'failed_retryable');

create table if not exists public.comun_sidewalk_duplicate_suggestions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.comun_sidewalk_records(id),
  candidate_record_id uuid not null references public.comun_sidewalk_records(id),
  score integer not null check (score between 0 and 100),
  signals text[] not null default '{}',
  decision text not null default 'possible_duplicate'
    check (decision in ('possible_duplicate', 'related', 'merged', 'distinct')),
  decided_by_admin_id uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (record_id < candidate_record_id),
  unique(record_id, candidate_record_id)
);

alter table public.comun_sidewalk_duplicate_suggestions enable row level security;
revoke all on table public.comun_sidewalk_duplicate_suggestions from public, anon, authenticated;
grant select, insert, update on table public.comun_sidewalk_duplicate_suggestions to service_role;

do $ledger$
declare
  expected_path constant text := 'supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql';
  expected_sha text := coalesce(nullif(pg_catalog.current_setting('comun.release_sha256', true), ''), 'LOCAL_VALIDATION');
  expected_pre text := coalesce(nullif(pg_catalog.current_setting('comun.release_pre_fingerprint', true), ''), 'LOCAL_VALIDATION');
  expected_post text := coalesce(nullif(pg_catalog.current_setting('comun.release_post_fingerprint', true), ''), 'LOCAL_VALIDATION');
  existing public.comun_schema_releases%rowtype;
begin
  select * into existing from public.comun_schema_releases
  where release = '20260724233256-comun-sidewalk-operational-hardening';
  if found then
    if existing.migration_path <> expected_path or existing.migration_sha256 <> expected_sha
      or existing.pre_fingerprint <> expected_pre or existing.post_fingerprint <> expected_post
      or existing.status <> 'applied' then
      raise exception 'COMUN_SIDEWALK_OPERATIONAL_HARDENING_LEDGER_DIVERGENCE';
    end if;
  else
    insert into public.comun_schema_releases (
      release, migration_path, migration_sha256, pre_fingerprint, post_fingerprint, status, applied_by
    ) values (
      '20260724233256-comun-sidewalk-operational-hardening', expected_path, expected_sha, expected_pre, expected_post, 'applied', current_user
    );
  end if;
end
$ledger$;

commit;
