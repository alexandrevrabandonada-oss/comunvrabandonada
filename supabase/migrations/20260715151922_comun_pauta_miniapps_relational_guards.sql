create unique index comun_circle_one_open_round
on public.comun_construction_circle_rounds(circle_id)
where status = 'open';

create or replace function public.comun_guard_circle_contribution_round()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  round_circle_id uuid;
  round_status text;
begin
  select circle_id, status into round_circle_id, round_status
  from public.comun_construction_circle_rounds
  where id = new.round_id;
  if round_circle_id is null or round_circle_id <> new.circle_id then
    raise exception 'round_id must belong to circle_id';
  end if;
  if round_status <> 'open' then
    raise exception 'contributions require an open round';
  end if;
  return new;
end;
$$;

create trigger comun_circle_contributions_round_guard
before insert or update of circle_id, round_id on public.comun_circle_contributions
for each row execute function public.comun_guard_circle_contribution_round();

create or replace function public.comun_guard_circle_synthesis_round()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  round_circle_id uuid;
begin
  select circle_id into round_circle_id
  from public.comun_construction_circle_rounds
  where id = new.round_id;
  if round_circle_id is null or round_circle_id <> new.circle_id then
    raise exception 'synthesis round_id must belong to circle_id';
  end if;
  return new;
end;
$$;

create trigger comun_circle_syntheses_round_guard
before insert or update of circle_id, round_id on public.comun_circle_syntheses
for each row execute function public.comun_guard_circle_synthesis_round();

revoke all on function public.comun_guard_circle_contribution_round() from public, anon, authenticated;
revoke all on function public.comun_guard_circle_synthesis_round() from public, anon, authenticated;
