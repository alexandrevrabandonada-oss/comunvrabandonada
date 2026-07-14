alter table public.comun_admin_audit_log enable row level security;
alter table public.comun_admin_users enable row level security;
alter table public.comun_pauta_contributions enable row level security;
alter table public.comun_public_lookup_events enable row level security;
alter table public.comun_report_attachments enable row level security;

drop policy if exists "Public can read approved pauta contributions" on public.comun_pauta_contributions;

revoke select on table public.comun_admin_audit_log from anon;
revoke select on table public.comun_admin_audit_log from authenticated;

revoke select on table public.comun_admin_users from anon;
revoke select on table public.comun_admin_users from authenticated;

revoke all on table public.comun_pauta_contributions from anon;
revoke all on table public.comun_pauta_contributions from authenticated;

revoke select on table public.comun_public_lookup_events from anon;
revoke select on table public.comun_public_lookup_events from authenticated;

revoke select on table public.comun_report_attachments from anon;
revoke select on table public.comun_report_attachments from authenticated;

grant select, insert, update, delete on table public.comun_admin_audit_log to service_role;
grant select, insert, update, delete on table public.comun_admin_users to service_role;
grant select, insert, update, delete on table public.comun_pauta_contributions to service_role;
grant select, insert, update, delete on table public.comun_public_lookup_events to service_role;
grant select, insert, update, delete on table public.comun_report_attachments to service_role;
