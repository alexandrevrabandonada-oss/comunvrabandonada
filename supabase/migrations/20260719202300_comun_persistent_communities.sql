alter table public.comun_member_inbox drop constraint comun_member_inbox_notification_type_check;
alter table public.comun_member_inbox add constraint comun_member_inbox_notification_type_check check(notification_type in(
  'action_required','contribution_update','information_requested','task_assigned','task_due','round_opened','round_closing','synthesis_published','campaign_assignment','campaign_update','official_response','result_registered','artwork_update','radio_update','consent_action_required','rights_action_required','sidewalk_report_received','sidewalk_report_verified','sidewalk_report_published','sidewalk_circle_opened','sidewalk_task_assigned','sidewalk_protocol_sent','sidewalk_response_received','sidewalk_result_recorded',
  'community_followed','community_membership_requested','community_membership_approved','community_circle_opened','community_task_assigned','community_pauta_stage_changed','community_activity_upcoming','community_result_published','community_correction_completed','community_withdrawal_completed'
));

create table public.comun_community_memberships (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.comun_communities(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'following' check(state in('following','member','paused','left','suspended')),
  collaboration_preferences text[] not null default '{}',
  update_preferences text[] not null default '{}',
  joined_at timestamptz,
  paused_at timestamptz,
  left_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(community_id,member_user_id),
  check(collaboration_preferences <@ array['circles','actions','research','art','radio','communication','territory']::text[]),
  check(update_preferences <@ array['pautas','circles','activities','results','memory','art','radio']::text[])
);
create index comun_community_memberships_member_state_idx on public.comun_community_memberships(member_user_id,state);
create index comun_community_memberships_community_state_idx on public.comun_community_memberships(community_id,state) where state in('following','member','paused');
create trigger comun_community_memberships_updated_at before update on public.comun_community_memberships for each row execute function public.set_updated_at();

create table public.comun_community_role_assignments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.comun_community_memberships(id) on delete cascade,
  role text not null check(role in('coordinator','facilitator','curator','community_editor','field_observer')),
  scope text not null default 'community',
  granted_by uuid references auth.users(id) on delete set null,
  starts_at timestamptz not null default now(),
  review_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(membership_id,role,scope)
);
create index comun_community_roles_active_idx on public.comun_community_role_assignments(membership_id,role) where revoked_at is null;

create table public.comun_community_work_groups (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.comun_communities(id) on delete cascade,
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete restrict,
  name text not null,
  objective text not null,
  cycle_label text not null,
  next_action text,
  result_expected text not null,
  state text not null default 'proposed' check(state in('proposed','active','paused','completed','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  completed_at timestamptz,
  memory_url text check(memory_url is null or memory_url like '/comun/%'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comun_community_work_groups_public_idx on public.comun_community_work_groups(community_id,state,ends_at);
create trigger comun_community_work_groups_updated_at before update on public.comun_community_work_groups for each row execute function public.set_updated_at();

create table public.comun_community_work_group_members (
  group_id uuid not null references public.comun_community_work_groups(id) on delete cascade,
  membership_id uuid not null references public.comun_community_memberships(id) on delete cascade,
  responsibility text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key(group_id,membership_id)
);

create table public.comun_community_work_group_tasks (
  group_id uuid not null references public.comun_community_work_groups(id) on delete cascade,
  task_id uuid not null references public.comun_pauta_tasks(id) on delete cascade,
  primary key(group_id,task_id)
);

create table public.comun_community_audit_log (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.comun_communities(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check(event_type in('followed','preferences_changed','membership_requested','membership_approved','paused','resumed','left','suspended','role_granted','role_revoked','group_joined','group_left')),
  prior_state text,
  next_state text,
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object' and pg_column_size(metadata)<=4096),
  created_at timestamptz not null default now()
);
create index comun_community_audit_community_created_idx on public.comun_community_audit_log(community_id,created_at desc);

do $$ declare t text; begin foreach t in array array[
  'comun_community_memberships','comun_community_role_assignments','comun_community_work_groups',
  'comun_community_work_group_members','comun_community_work_group_tasks','comun_community_audit_log'
] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon,authenticated',t); execute format('grant select,insert,update,delete on public.%I to service_role',t); end loop; end $$;

grant select on public.comun_community_memberships to authenticated;
create policy "Members read only their own community links" on public.comun_community_memberships for select to authenticated
using((select auth.uid())=member_user_id);

grant select on public.comun_community_role_assignments to authenticated;
create policy "Members read only their own active community roles" on public.comun_community_role_assignments for select to authenticated
using(revoked_at is null and exists(select 1 from public.comun_community_memberships m where m.id=membership_id and m.member_user_id=(select auth.uid()) and m.state='member'));

grant select on public.comun_community_work_groups to anon,authenticated;
create policy "Public reads active community work groups" on public.comun_community_work_groups for select to anon,authenticated
using(state in('active','completed'));

grant select on public.comun_community_work_group_tasks to anon,authenticated;
create policy "Public reads tasks linked to visible work groups" on public.comun_community_work_group_tasks for select to anon,authenticated
using(exists(select 1 from public.comun_community_work_groups g where g.id=group_id and g.state in('active','completed')));

-- Member lists, responsibilities and audit stay server-only. No client grant is intentional.
