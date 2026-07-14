create table public.comun_archive_processing_jobs (
 id uuid primary key default gen_random_uuid(), job_type text not null check(job_type in ('historical_photo_derivatives')),
 archive_item_id uuid references public.comun_archive_items(id) on delete set null,
 archive_asset_id uuid not null references public.comun_archive_assets(id) on delete restrict,
 status text not null default 'queued' check(status in ('queued','processing','retry_scheduled','completed','failed','dead_letter','cancel_requested','cancelled')),
 priority integer not null default 100, idempotency_key text not null unique,
 attempt_count integer not null default 0, max_attempts integer not null default 4,
 available_at timestamptz not null default now(), locked_at timestamptz, locked_by text, started_at timestamptz,
 completed_at timestamptz, failed_at timestamptz, last_error_code text, last_error_summary text,
 result_summary jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.comun_archive_processing_attempts (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.comun_archive_processing_jobs(id) on delete cascade,
 attempt_number integer not null, status text not null, worker_id text, started_at timestamptz not null default now(), finished_at timestamptz,
 duration_ms integer, error_code text, error_summary text, metrics jsonb, created_at timestamptz not null default now(), unique(job_id,attempt_number)
);
create table public.comun_archive_processing_events (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.comun_archive_processing_jobs(id) on delete cascade,
 event_type text not null, sanitized_metadata jsonb, created_at timestamptz not null default now()
);
create index comun_archive_jobs_claim_idx on public.comun_archive_processing_jobs(status,available_at,priority,created_at);
create index comun_archive_attempts_job_idx on public.comun_archive_processing_attempts(job_id,attempt_number);
alter table public.comun_archive_processing_jobs enable row level security;
alter table public.comun_archive_processing_attempts enable row level security;
alter table public.comun_archive_processing_events enable row level security;
revoke all on public.comun_archive_processing_jobs, public.comun_archive_processing_attempts, public.comun_archive_processing_events from anon,authenticated;
grant select,insert,update,delete on public.comun_archive_processing_jobs, public.comun_archive_processing_attempts, public.comun_archive_processing_events to service_role;

create or replace function public.claim_next_archive_processing_job(p_worker_id text)
returns setof public.comun_archive_processing_jobs language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 select id into v_id from public.comun_archive_processing_jobs
 where status in ('queued','retry_scheduled') and available_at<=now()
 order by priority asc, created_at asc for update skip locked limit 1;
 if v_id is null then return; end if;
 update public.comun_archive_processing_jobs set status='processing', locked_at=now(), locked_by=left(p_worker_id,100), started_at=coalesce(started_at,now()), attempt_count=attempt_count+1, updated_at=now() where id=v_id;
 return query select * from public.comun_archive_processing_jobs where id=v_id;
end $$;
revoke all on function public.claim_next_archive_processing_job(text) from public,anon,authenticated;
grant execute on function public.claim_next_archive_processing_job(text) to service_role;
