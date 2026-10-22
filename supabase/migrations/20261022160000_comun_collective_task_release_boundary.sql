-- SOC-D10.M6: reviewed candidate only; remote application requires separate approval.
begin;

alter policy "Members can release own collective task"
on public.comun_collective_action_task_assignments
using ((select auth.uid()) = member_user_id and status = 'active')
with check (
  (select auth.uid()) = member_user_id
  and status = 'released'
  and released_at is not null
);

-- Preserve assignment identity/history, including during privileged canonical upserts.
-- This function needs no elevated privileges or access to other rows.
create function public.comun_collective_task_assignment_identity_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.id is distinct from old.id
    or new.task_id is distinct from old.task_id
    or new.member_user_id is distinct from old.member_user_id
    or new.created_at is distinct from old.created_at then
    raise exception 'COMUN_COLLECTIVE_TASK_ASSIGNMENT_IDENTITY_IMMUTABLE'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.comun_collective_task_assignment_identity_guard()
from public, anon, authenticated;

create trigger comun_collective_task_assignment_identity_guard
before update on public.comun_collective_action_task_assignments
for each row execute function public.comun_collective_task_assignment_identity_guard();

commit;
