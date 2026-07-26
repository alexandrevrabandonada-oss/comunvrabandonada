create table public.comun_collective_actions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null check (char_length(summary) between 10 and 600),
  objective text not null check (char_length(objective) between 10 and 1200),
  action_type text not null check (action_type in ('community_inspection','petition','public_meeting','mutual_aid','pressure_campaign','collective_forwarding','cultural_action','study_circle','volunteer_task_force','other')),
  status text not null default 'draft' check (status in ('draft','preparing','open','active','awaiting_result','completed','cancelled','archived')),
  visibility text not null default 'internal' check (visibility in ('public','community','internal')),
  territory_label text,
  meeting_place text,
  starts_at timestamptz,
  ends_at timestamptz,
  participation_mode text not null default 'hybrid' check (participation_mode in ('remote','in_person','hybrid')),
  pauta_id uuid references public.comun_pauta_spaces(id) on delete set null,
  community_id uuid references public.comun_communities(id) on delete set null,
  created_by_admin_id uuid references public.comun_admin_users(id) on delete set null,
  published_at timestamptz,
  completed_at timestamptz,
  result_summary text,
  memory_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at),
  check ((status = 'completed') = (completed_at is not null) or status <> 'completed')
);

create table public.comun_collective_action_participations (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.comun_collective_actions(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested','participating','available_for_task','attended','contributed','withdrew')),
  contribution_note_private text check (char_length(contribution_note_private) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (action_id, member_user_id)
);

create table public.comun_collective_action_tasks (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.comun_collective_actions(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 3 and 1000),
  desired_count integer not null default 1 check (desired_count between 1 and 1000),
  due_at timestamptz,
  state text not null default 'open' check (state in ('draft','open','in_progress','done','cancelled','archived')),
  effort_level text not null default 'small' check (effort_level in ('small','medium','collective')),
  participation_mode text not null default 'hybrid' check (participation_mode in ('remote','in_person','hybrid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comun_collective_action_task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.comun_collective_action_tasks(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','released')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  unique (task_id, member_user_id),
  check ((status = 'released') = (released_at is not null))
);

create table public.comun_collective_action_updates (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.comun_collective_actions(id) on delete cascade,
  update_type text not null check (update_type in ('announcement','progress','meeting','protocol','response','result','memory')),
  title text not null check (char_length(title) between 3 and 180),
  public_summary text not null check (char_length(public_summary) between 3 and 2000),
  occurred_at timestamptz not null default now(),
  visibility text not null default 'public' check (visibility in ('public','internal')),
  created_by_admin_id uuid references public.comun_admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.comun_collective_action_sidewalk_records (
  action_id uuid not null references public.comun_collective_actions(id) on delete cascade,
  sidewalk_record_id uuid not null references public.comun_sidewalk_records(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (action_id, sidewalk_record_id)
);

create index comun_collective_actions_public_idx on public.comun_collective_actions (visibility, status, starts_at);
create index comun_collective_participations_member_idx on public.comun_collective_action_participations (member_user_id, updated_at desc);
create index comun_collective_tasks_action_idx on public.comun_collective_action_tasks (action_id, state, due_at);
create index comun_collective_assignments_task_idx on public.comun_collective_action_task_assignments (task_id, status);
create index comun_collective_updates_timeline_idx on public.comun_collective_action_updates (action_id, visibility, occurred_at desc);

create function public.comun_collective_action_task_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  capacity integer;
  current_count integer;
  task_state text;
  task_due_at timestamptz;
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  select desired_count, state, due_at into capacity, task_state, task_due_at
  from public.comun_collective_action_tasks
  where id = new.task_id
  for update;

  if task_state is null or task_state not in ('open', 'in_progress') or (task_due_at is not null and task_due_at < now()) then
    raise exception 'COMUN_COLLECTIVE_TASK_NOT_AVAILABLE';
  end if;

  select count(*) into current_count
  from public.comun_collective_action_task_assignments
  where task_id = new.task_id and status = 'active' and id is distinct from new.id;

  if current_count >= capacity then
    raise exception 'COMUN_COLLECTIVE_TASK_CAPACITY_REACHED';
  end if;

  return new;
end;
$$;

create trigger comun_collective_action_task_capacity_guard
before insert or update of status, task_id on public.comun_collective_action_task_assignments
for each row execute function public.comun_collective_action_task_capacity_guard();

revoke all on function public.comun_collective_action_task_capacity_guard() from public, anon, authenticated;

alter table public.comun_collective_actions enable row level security;
alter table public.comun_collective_action_participations enable row level security;
alter table public.comun_collective_action_tasks enable row level security;
alter table public.comun_collective_action_task_assignments enable row level security;
alter table public.comun_collective_action_updates enable row level security;
alter table public.comun_collective_action_sidewalk_records enable row level security;

revoke all on table public.comun_collective_actions from public, anon, authenticated;
revoke all on table public.comun_collective_action_participations from public, anon, authenticated;
revoke all on table public.comun_collective_action_tasks from public, anon, authenticated;
revoke all on table public.comun_collective_action_task_assignments from public, anon, authenticated;
revoke all on table public.comun_collective_action_updates from public, anon, authenticated;
revoke all on table public.comun_collective_action_sidewalk_records from public, anon, authenticated;

grant select on public.comun_collective_actions, public.comun_collective_action_tasks,
  public.comun_collective_action_updates, public.comun_collective_action_sidewalk_records
to anon, authenticated;
grant select, insert, update on public.comun_collective_action_participations,
  public.comun_collective_action_task_assignments to authenticated;
grant select, insert, update, delete on public.comun_collective_actions,
  public.comun_collective_action_participations, public.comun_collective_action_tasks,
  public.comun_collective_action_task_assignments, public.comun_collective_action_updates,
  public.comun_collective_action_sidewalk_records to service_role;

create policy "Public can read published collective actions"
on public.comun_collective_actions for select to anon, authenticated
using (visibility = 'public' and status in ('open','active','awaiting_result','completed'));

create policy "Public can read tasks of published collective actions"
on public.comun_collective_action_tasks for select to anon, authenticated
using (exists (select 1 from public.comun_collective_actions action where action.id = action_id and action.visibility = 'public' and action.status in ('open','active','awaiting_result','completed')));

create policy "Public can read public collective updates"
on public.comun_collective_action_updates for select to anon, authenticated
using (visibility = 'public' and exists (select 1 from public.comun_collective_actions action where action.id = action_id and action.visibility = 'public' and action.status in ('open','active','awaiting_result','completed')));

create policy "Public can read published collective sidewalk links"
on public.comun_collective_action_sidewalk_records for select to anon, authenticated
using (exists (select 1 from public.comun_collective_actions action where action.id = action_id and action.visibility = 'public' and action.status in ('open','active','awaiting_result','completed')));

create policy "Members can read own collective participation"
on public.comun_collective_action_participations for select to authenticated
using ((select auth.uid()) = member_user_id);
create policy "Members can create own collective participation"
on public.comun_collective_action_participations for insert to authenticated
with check (
  (select auth.uid()) = member_user_id
  and exists (
    select 1 from public.comun_collective_actions action
    where action.id = action_id
      and action.visibility = 'public'
      and action.status in ('open','active','awaiting_result')
  )
);
create policy "Members can update own collective participation"
on public.comun_collective_action_participations for update to authenticated
using ((select auth.uid()) = member_user_id)
with check ((select auth.uid()) = member_user_id);

create policy "Members can read own collective task assignment"
on public.comun_collective_action_task_assignments for select to authenticated
using ((select auth.uid()) = member_user_id);
create policy "Members can claim own collective task"
on public.comun_collective_action_task_assignments for insert to authenticated
with check (
  (select auth.uid()) = member_user_id
  and exists (
    select 1
    from public.comun_collective_action_tasks task
    join public.comun_collective_actions action on action.id = task.action_id
    where task.id = task_id
      and task.state in ('open','in_progress')
      and action.visibility = 'public'
      and action.status in ('open','active','awaiting_result')
  )
);
create policy "Members can release own collective task"
on public.comun_collective_action_task_assignments for update to authenticated
using ((select auth.uid()) = member_user_id)
with check ((select auth.uid()) = member_user_id);
