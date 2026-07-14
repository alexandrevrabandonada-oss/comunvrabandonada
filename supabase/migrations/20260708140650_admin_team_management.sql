alter table public.comun_admin_profiles
  add column if not exists operational_note text;

grant all on table public.comun_admin_profiles to service_role;
