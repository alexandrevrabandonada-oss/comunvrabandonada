create function public.comun_collective_action_member_journey_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status = 'withdrew' and old.status is distinct from 'withdrew' and exists (
    select 1
    from public.comun_collective_action_task_assignments assignment
    join public.comun_collective_action_tasks task on task.id = assignment.task_id
    where task.action_id = new.action_id
      and assignment.member_user_id = new.member_user_id
      and assignment.status = 'active'
  ) then
    raise exception 'COMUN_COLLECTIVE_RELEASE_TASKS_BEFORE_LEAVING';
  end if;

  return new;
end;
$$;

create trigger comun_collective_action_member_journey_guard
before update of status on public.comun_collective_action_participations
for each row execute function public.comun_collective_action_member_journey_guard();

revoke all on function public.comun_collective_action_member_journey_guard()
from public, anon, authenticated;

drop policy "Members can claim own collective task"
on public.comun_collective_action_task_assignments;

create policy "Members can claim own collective task"
on public.comun_collective_action_task_assignments for insert to authenticated
with check (
  (select auth.uid()) = member_user_id
  and exists (
    select 1
    from public.comun_collective_action_tasks task
    join public.comun_collective_actions action on action.id = task.action_id
    join public.comun_collective_action_participations participation
      on participation.action_id = action.id
     and participation.member_user_id = (select auth.uid())
    where task.id = task_id
      and task.state in ('open','in_progress')
      and action.visibility = 'public'
      and action.status in ('open','active','awaiting_result')
      and participation.status in ('participating','available_for_task','attended','contributed')
  )
);
