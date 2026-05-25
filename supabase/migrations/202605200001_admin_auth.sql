create table if not exists public.comun_admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  email text unique not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_admin_users_role_check check (role in ('admin','editor','viewer'))
);

create table if not exists public.comun_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid null references public.comun_admin_users(id),
  admin_email text null,
  action text not null,
  target_type text null,
  target_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists comun_admin_users_updated_at on public.comun_admin_users;
create trigger comun_admin_users_updated_at before update on public.comun_admin_users
for each row execute function public.set_updated_at();

alter table public.comun_admin_users enable row level security;
alter table public.comun_admin_audit_log enable row level security;

drop policy if exists "Public cannot read admin users" on public.comun_admin_users;
create policy "Public cannot read admin users"
on public.comun_admin_users for select
using (false);

drop policy if exists "Public cannot read admin audit log" on public.comun_admin_audit_log;
create policy "Public cannot read admin audit log"
on public.comun_admin_audit_log for select
using (false);

create index if not exists comun_admin_audit_log_created_at_idx
on public.comun_admin_audit_log (created_at desc);
