alter table public.comun_official_protocols enable row level security;

revoke all on table public.comun_official_protocols from anon;
revoke all on table public.comun_official_protocols from authenticated;
grant select, insert, update, delete on table public.comun_official_protocols to service_role;
