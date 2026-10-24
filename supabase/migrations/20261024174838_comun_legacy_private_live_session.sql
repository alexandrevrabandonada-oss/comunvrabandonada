-- M7.D: repository migration; remote application requires separate authorization.
-- Reject banned/deleted users, revoked sessions and inactive profiles independently of JWT expiry.
-- Add a restrictive session barrier; retain every existing owner/capacity policy.
begin;
create schema comun_auth_private;
revoke all on schema comun_auth_private from public, anon, authenticated, service_role;
grant usage on schema comun_auth_private to authenticated;

create function comun_auth_private.current_session_active() returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from auth.users u where u.id=auth.uid()
   and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))
 and exists(select 1 from auth.sessions s where s.user_id=auth.uid()
   and s.id=nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')::uuid)
 and exists(select 1 from public.comun_member_profiles p
   where p.user_id=auth.uid() and p.status='active');
$$;
revoke all on function comun_auth_private.current_session_active()
 from public, anon, authenticated, service_role;
grant execute on function comun_auth_private.current_session_active() to authenticated;

create policy "Live Auth session required" on public.comun_community_memberships
 as restrictive for all to authenticated
 using ((select comun_auth_private.current_session_active()))
 with check ((select comun_auth_private.current_session_active()));
create policy "Live Auth session required" on public.comun_community_role_assignments
 as restrictive for all to authenticated
 using ((select comun_auth_private.current_session_active()))
 with check ((select comun_auth_private.current_session_active()));
create policy "Live Auth session required" on public.comun_collective_action_participations
 as restrictive for all to authenticated
 using ((select comun_auth_private.current_session_active()))
 with check ((select comun_auth_private.current_session_active()));
create policy "Live Auth session required" on public.comun_collective_action_task_assignments
 as restrictive for all to authenticated
 using ((select comun_auth_private.current_session_active()))
 with check ((select comun_auth_private.current_session_active()));
commit;
