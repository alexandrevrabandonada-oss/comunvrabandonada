alter table public.comun_pauta_synthesis_versions enable row level security;

revoke all on table public.comun_pauta_synthesis_versions from anon;
revoke all on table public.comun_pauta_synthesis_versions from authenticated;

grant select, insert, update, delete on table public.comun_pauta_synthesis_versions to service_role;
