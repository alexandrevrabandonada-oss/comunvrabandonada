create table if not exists public.comun_admin_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  email text unique not null,
  role text not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_admin_profiles_role_check check (role in ('admin', 'editor', 'factual_reviewer', 'editorial_reviewer', 'publisher', 'viewer'))
);

insert into public.comun_admin_profiles (auth_user_id, display_name, email, role, active)
select
  user_id,
  split_part(email, '@', 1),
  email,
  case
    when role = 'admin' then 'admin'
    when role = 'editor' then 'editor'
    else 'viewer'
  end,
  is_active
from public.comun_admin_users
on conflict (email) do update set
  auth_user_id = excluded.auth_user_id,
  display_name = excluded.display_name,
  role = excluded.role,
  active = excluded.active,
  updated_at = now();

alter table public.comun_pauta_dossier_reviews
  add column if not exists reviewer_user_id uuid references public.comun_admin_profiles(id);

alter table public.comun_pauta_dossiers
  add column if not exists factual_reviewer_assigned_user_id uuid references public.comun_admin_profiles(id),
  add column if not exists editorial_reviewer_assigned_user_id uuid references public.comun_admin_profiles(id);

alter table public.comun_admin_notifications
  add column if not exists assigned_to_user_id uuid references public.comun_admin_profiles(id);

create index if not exists comun_admin_profiles_auth_user_id_idx on public.comun_admin_profiles(auth_user_id) where auth_user_id is not null;
create index if not exists comun_admin_profiles_email_idx on public.comun_admin_profiles(email);
create index if not exists comun_admin_profiles_role_active_idx on public.comun_admin_profiles(role, active);
create index if not exists comun_pauta_dossier_reviews_reviewer_user_idx on public.comun_pauta_dossier_reviews(reviewer_user_id) where reviewer_user_id is not null;
create index if not exists comun_pauta_dossiers_factual_assigned_user_idx on public.comun_pauta_dossiers(factual_reviewer_assigned_user_id) where factual_reviewer_assigned_user_id is not null;
create index if not exists comun_pauta_dossiers_editorial_assigned_user_idx on public.comun_pauta_dossiers(editorial_reviewer_assigned_user_id) where editorial_reviewer_assigned_user_id is not null;
create index if not exists comun_admin_notifications_assigned_to_user_idx on public.comun_admin_notifications(assigned_to_user_id) where assigned_to_user_id is not null;

drop trigger if exists comun_admin_profiles_updated_at on public.comun_admin_profiles;
create trigger comun_admin_profiles_updated_at before update on public.comun_admin_profiles
for each row execute function public.set_updated_at();

alter table public.comun_admin_profiles enable row level security;

revoke all on table public.comun_admin_profiles from anon, authenticated;
grant all on table public.comun_admin_profiles to service_role;
grant all on table public.comun_pauta_dossier_reviews to service_role;
grant all on table public.comun_pauta_dossiers to service_role;
grant all on table public.comun_admin_notifications to service_role;
