-- Test fixture only. Never apply to a COMUN instance or shared database.
-- Minimal relational surface for real GoTrue/PostgREST authorization tests;
-- canonical policies/triggers are loaded verbatim by the harness separately.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login password :'rest_password' noinherit;
grant anon, authenticated, service_role to authenticator;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
 nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table public.comun_communities (
 id uuid primary key, slug text unique not null, name text not null,
 short_description text, is_active boolean not null default true
);
create table public.comun_community_memberships (
 id uuid primary key, community_id uuid not null references public.comun_communities,
 member_user_id uuid not null, state text not null,
 unique(community_id, member_user_id)
);
create table public.comun_community_role_assignments (
 id uuid primary key, membership_id uuid not null references public.comun_community_memberships,
 role text not null, scope text not null, starts_at timestamptz not null,
 revoked_at timestamptz
);
create table public.comun_collective_actions (
 id uuid primary key, community_id uuid references public.comun_communities,
 slug text unique not null, title text not null, visibility text not null,
 status text not null, published_at timestamptz
);
create table public.comun_collective_action_participations (
 id uuid primary key default gen_random_uuid(), action_id uuid not null references public.comun_collective_actions,
 member_user_id uuid not null, status text not null,
 unique(action_id, member_user_id)
);
create table public.comun_collective_action_tasks (
 id uuid primary key, action_id uuid not null references public.comun_collective_actions,
 title text not null, description text, state text not null, desired_count integer not null default 1,
 due_at timestamptz
);
create table public.comun_collective_action_task_assignments (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.comun_collective_action_tasks,
 member_user_id uuid not null, status text not null,
 created_at timestamptz not null default now(), released_at timestamptz,
 unique(task_id, member_user_id),
 check ((status = 'released') = (released_at is not null)),
 check (status in ('active','released'))
);
create table public.comun_member_profiles (
 user_id uuid primary key, display_name text, status text not null,
 profile_visibility text not null default 'private', onboarding_completed_at timestamptz
);
alter table public.comun_member_profiles enable row level security;
grant select on public.comun_communities, public.comun_collective_actions, public.comun_collective_action_tasks to anon, authenticated;
grant select, insert, update on public.comun_collective_action_participations, public.comun_collective_action_task_assignments to authenticated;
grant select on public.comun_community_memberships, public.comun_community_role_assignments to authenticated;
grant all on all tables in schema public to service_role;
alter table public.comun_communities enable row level security;
create policy fixture_public_community on public.comun_communities for select to anon,authenticated using (is_active);
alter table public.comun_community_memberships enable row level security;
create policy fixture_own_membership on public.comun_community_memberships for select to authenticated using (member_user_id = (select auth.uid()));
alter table public.comun_community_role_assignments enable row level security;
create policy fixture_own_role on public.comun_community_role_assignments for select to authenticated using (exists(select 1 from public.comun_community_memberships m where m.id=membership_id and m.member_user_id=(select auth.uid())));
alter table public.comun_collective_actions enable row level security;
alter table public.comun_collective_action_tasks enable row level security;
alter table public.comun_collective_action_participations enable row level security;
alter table public.comun_collective_action_task_assignments enable row level security;
