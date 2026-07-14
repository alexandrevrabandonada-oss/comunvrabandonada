alter table public.comun_pauta_contributions enable row level security;

revoke all on table public.comun_pauta_contributions from anon;
revoke all on table public.comun_pauta_contributions from authenticated;
grant select, insert, update, delete on table public.comun_pauta_contributions to service_role;
