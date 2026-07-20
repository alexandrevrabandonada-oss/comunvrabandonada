alter table public.comun_admin_profiles add column if not exists operational_role text;
alter table public.comun_admin_profiles add constraint comun_admin_profiles_operational_role_check check (operational_role is null or operational_role in ('operations_admin','privacy_reviewer','rights_reviewer','archive_curator','coordinator','facilitator','contribution_reviewer','image_reviewer','protocol_operator','result_editor','radio_editor','art_editor'));
create index if not exists comun_admin_profiles_operational_role_idx on public.comun_admin_profiles(operational_role) where active;
