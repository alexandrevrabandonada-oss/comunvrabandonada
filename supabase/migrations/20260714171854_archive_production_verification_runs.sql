create table public.comun_system_verification_runs (
  id uuid primary key default gen_random_uuid(),
  verification_type text not null,
  status text not null check (status in ('running','passed','failed','cleanup_required','cancelled')),
  started_at timestamptz not null default now(), finished_at timestamptz,
  initiated_by text, result_summary jsonb, sanitized_error text,
  created_at timestamptz not null default now()
);
create unique index comun_one_archive_verification_running
  on public.comun_system_verification_runs (verification_type)
  where status = 'running';
alter table public.comun_system_verification_runs enable row level security;
revoke all on public.comun_system_verification_runs from anon, authenticated;
grant select, insert, update, delete on public.comun_system_verification_runs to service_role;
