create table public.comun_pauta_decisions (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  synthesis_version_id uuid not null references public.comun_pauta_synthesis_versions(id) on delete restrict,
  circle_id uuid references public.comun_construction_circles(id) on delete set null,
  public_title text not null check (char_length(public_title) between 3 and 180),
  public_summary text not null check (char_length(public_summary) between 10 and 2000),
  public_justification text not null check (char_length(public_justification) between 10 and 2000),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'superseded', 'reopened')),
  created_by_admin_id uuid not null references public.comun_admin_users(id) on delete restrict,
  published_by_admin_id uuid references public.comun_admin_users(id) on delete restrict,
  decided_at timestamptz,
  published_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'published'
    or (
      published_by_admin_id is not null
      and published_by_admin_id <> created_by_admin_id
      and decided_at is not null
      and published_at is not null
    )
  )
);

create table public.comun_pauta_action_cycles (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null unique references public.comun_pauta_spaces(id) on delete cascade,
  current_stage text not null default 'contribution'
    check (current_stage in (
      'contribution', 'moderation', 'conversation', 'synthesis', 'decision',
      'action', 'tasks', 'forwarding', 'protocol', 'response', 'result',
      'memory', 'reopened'
    )),
  decision_id uuid references public.comun_pauta_decisions(id) on delete restrict,
  collective_action_id uuid references public.comun_collective_actions(id) on delete restrict,
  forwarding_id uuid references public.comun_collective_action_forwardings(id) on delete restrict,
  official_protocol_id uuid references public.comun_official_protocols(id) on delete restrict,
  result_id uuid references public.comun_hub_results(id) on delete restrict,
  next_action_public text,
  blocking_reason_public text,
  responsible_role text not null default 'editor'
    check (responsible_role in (
      'admin', 'editor', 'coordinator', 'facilitator', 'community_editor',
      'curator', 'protocol_operator', 'result_editor', 'member'
    )),
  public_visible boolean not null default false,
  cycle_scope text not null default 'production'
    check (cycle_scope in ('production', 'controlled_rehearsal')),
  rehearsal_cycle_id text unique,
  state_version integer not null default 1 check (state_version > 0),
  last_transition_at timestamptz not null default now(),
  memory_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (cycle_scope = 'production' and rehearsal_cycle_id is null)
    or (
      cycle_scope = 'controlled_rehearsal'
      and rehearsal_cycle_id ~ '^pauta-action-cycle-[0-9]{8}-[0-9]{2}$'
      and public_visible = false
    )
  )
);

create table public.comun_pauta_action_cycle_events (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.comun_pauta_action_cycles(id) on delete cascade,
  idempotency_key text not null check (char_length(idempotency_key) between 12 and 128),
  from_stage text not null,
  to_stage text not null,
  actor_admin_id uuid not null references public.comun_admin_users(id) on delete restrict,
  actor_role text not null,
  public_summary text not null check (char_length(public_summary) between 3 and 2000),
  private_note text,
  public_visible boolean not null default false,
  state_version integer not null check (state_version > 1),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (cycle_id, idempotency_key)
);

create index comun_pauta_decisions_public_idx
  on public.comun_pauta_decisions(pauta_id, status, published_at desc);
create index comun_pauta_action_cycles_public_idx
  on public.comun_pauta_action_cycles(public_visible, current_stage, updated_at desc);
create index comun_pauta_action_cycle_events_timeline_idx
  on public.comun_pauta_action_cycle_events(cycle_id, occurred_at, id);

alter table public.comun_pauta_decisions enable row level security;
alter table public.comun_pauta_action_cycles enable row level security;
alter table public.comun_pauta_action_cycle_events enable row level security;

revoke all on table public.comun_pauta_decisions from public, anon, authenticated;
revoke all on table public.comun_pauta_action_cycles from public, anon, authenticated;
revoke all on table public.comun_pauta_action_cycle_events from public, anon, authenticated;

grant select on public.comun_pauta_decisions,
  public.comun_pauta_action_cycles,
  public.comun_pauta_action_cycle_events
to anon, authenticated;

grant select, insert, update, delete on public.comun_pauta_decisions,
  public.comun_pauta_action_cycles,
  public.comun_pauta_action_cycle_events
to service_role;

create policy "Public can read reviewed pauta decisions"
on public.comun_pauta_decisions for select to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.comun_pauta_spaces pauta
    where pauta.id = pauta_id
      and pauta.visibility = 'public'
      and pauta.status <> 'archived'
  )
);

create policy "Public can read reviewed pauta action cycles"
on public.comun_pauta_action_cycles for select to anon, authenticated
using (
  public_visible
  and cycle_scope = 'production'
  and exists (
    select 1
    from public.comun_pauta_spaces pauta
    where pauta.id = pauta_id
      and pauta.visibility = 'public'
      and pauta.status <> 'archived'
  )
);

create policy "Public can read reviewed pauta cycle history"
on public.comun_pauta_action_cycle_events for select to anon, authenticated
using (
  public_visible
  and private_note is null
  and exists (
    select 1
    from public.comun_pauta_action_cycles cycle
    join public.comun_pauta_spaces pauta on pauta.id = cycle.pauta_id
    where cycle.id = cycle_id
      and cycle.public_visible
      and cycle.cycle_scope = 'production'
      and pauta.visibility = 'public'
      and pauta.status <> 'archived'
  )
);

create function public.comun_transition_pauta_action_cycle(
  p_cycle_id uuid,
  p_expected_version integer,
  p_idempotency_key text,
  p_to_stage text,
  p_actor_admin_id uuid,
  p_actor_role text,
  p_public_summary text,
  p_private_note text default null
)
returns table (
  cycle_id uuid,
  current_stage text,
  state_version integer,
  replayed boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_cycle public.comun_pauta_action_cycles%rowtype;
  existing_event public.comun_pauta_action_cycle_events%rowtype;
  allowed_roles text[];
  approved_contributions integer;
  previous_stage text;
  transition_allowed boolean := false;
begin
  if p_idempotency_key !~ '^[A-Za-z0-9:_-]{12,128}$' then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_INVALID_IDEMPOTENCY_KEY';
  end if;

  select * into current_cycle
  from public.comun_pauta_action_cycles
  where id = p_cycle_id
  for update;

  if current_cycle.id is null then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_NOT_FOUND';
  end if;

  select * into existing_event
  from public.comun_pauta_action_cycle_events
  where comun_pauta_action_cycle_events.cycle_id = p_cycle_id
    and idempotency_key = p_idempotency_key;

  if existing_event.id is not null then
    if existing_event.to_stage <> p_to_stage then
      raise exception 'COMUN_PAUTA_ACTION_CYCLE_IDEMPOTENCY_CONFLICT';
    end if;
    return query
      select current_cycle.id, current_cycle.current_stage,
        current_cycle.state_version, true;
    return;
  end if;

  if current_cycle.state_version <> p_expected_version then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_VERSION_CONFLICT';
  end if;

  transition_allowed :=
    (current_cycle.current_stage = 'contribution' and p_to_stage = 'moderation')
    or (current_cycle.current_stage = 'moderation' and p_to_stage = 'conversation')
    or (current_cycle.current_stage = 'conversation' and p_to_stage = 'synthesis')
    or (current_cycle.current_stage = 'synthesis' and p_to_stage = 'decision')
    or (current_cycle.current_stage = 'decision' and p_to_stage = 'action')
    or (current_cycle.current_stage = 'action' and p_to_stage = 'tasks')
    or (current_cycle.current_stage = 'tasks' and p_to_stage = 'forwarding')
    or (current_cycle.current_stage = 'forwarding' and p_to_stage = 'protocol')
    or (current_cycle.current_stage = 'protocol' and p_to_stage = 'response')
    or (current_cycle.current_stage = 'response' and p_to_stage = 'result')
    or (current_cycle.current_stage = 'result' and p_to_stage = 'memory')
    or (current_cycle.current_stage = 'memory' and p_to_stage = 'reopened')
    or (current_cycle.current_stage = 'reopened' and p_to_stage in ('moderation', 'conversation'));

  if not transition_allowed then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_INVALID_TRANSITION';
  end if;

  allowed_roles := case p_to_stage
    when 'moderation' then array['admin', 'editor', 'curator']
    when 'conversation' then array['admin', 'editor', 'coordinator', 'facilitator']
    when 'synthesis' then array['admin', 'editor', 'curator', 'facilitator']
    when 'decision' then array['admin', 'editor', 'coordinator']
    when 'action' then array['admin', 'editor', 'coordinator']
    when 'tasks' then array['admin', 'editor', 'coordinator', 'facilitator']
    when 'forwarding' then array['admin', 'editor', 'coordinator', 'protocol_operator']
    when 'protocol' then array['admin', 'editor', 'protocol_operator']
    when 'response' then array['admin', 'editor', 'protocol_operator']
    when 'result' then array['admin', 'editor', 'coordinator', 'result_editor']
    when 'memory' then array['admin', 'editor', 'curator']
    when 'reopened' then array['admin', 'editor', 'coordinator']
    else array[]::text[]
  end;

  if not (p_actor_role = any(allowed_roles)) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_ROLE_FORBIDDEN';
  end if;

  previous_stage := current_cycle.current_stage;

  if p_to_stage in ('moderation', 'conversation') then
    select count(*) into approved_contributions
    from public.comun_pauta_contributions contribution
    where contribution.pauta_id = current_cycle.pauta_id
      and contribution.status = 'approved';
    if approved_contributions = 0 then
      raise exception 'COMUN_PAUTA_ACTION_CYCLE_APPROVED_CONTRIBUTION_REQUIRED';
    end if;
  elsif p_to_stage = 'synthesis' and not exists (
    select 1 from public.comun_construction_circles circle
    where circle.pauta_id = current_cycle.pauta_id
      and circle.status not in ('draft', 'archived')
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_CONVERSATION_REQUIRED';
  elsif p_to_stage = 'decision' and not exists (
    select 1 from public.comun_pauta_synthesis_versions synthesis
    where synthesis.pauta_id = current_cycle.pauta_id
      and nullif(trim(synthesis.new_public_synthesis), '') is not null
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_SYNTHESIS_REQUIRED';
  elsif p_to_stage = 'action' and not exists (
    select 1 from public.comun_pauta_decisions decision
    where decision.id = current_cycle.decision_id
      and decision.pauta_id = current_cycle.pauta_id
      and decision.status = 'published'
      and (
        decision.created_by_admin_id <> p_actor_admin_id
        or p_actor_role = 'admin'
      )
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_REVIEWED_DECISION_REQUIRED';
  elsif p_to_stage = 'tasks' and not exists (
    select 1 from public.comun_collective_actions action
    where action.id = current_cycle.collective_action_id
      and action.pauta_id = current_cycle.pauta_id
      and action.status <> 'draft'
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_COLLECTIVE_ACTION_REQUIRED';
  elsif p_to_stage = 'forwarding' and not exists (
    select 1 from public.comun_collective_action_tasks task
    where task.action_id = current_cycle.collective_action_id
      and task.state not in ('draft', 'archived', 'cancelled')
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_TASK_REQUIRED';
  elsif p_to_stage = 'protocol' and not exists (
    select 1 from public.comun_collective_action_forwardings forwarding
    where forwarding.id = current_cycle.forwarding_id
      and forwarding.action_id = current_cycle.collective_action_id
      and forwarding.state <> 'preparing'
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_FORWARDING_REQUIRED';
  elsif p_to_stage = 'response' and not exists (
    select 1 from public.comun_official_protocols protocol
    where protocol.id = current_cycle.official_protocol_id
      and protocol.submitted_at is not null
      and protocol.status not in ('draft', 'text_generated')
      and exists (
        select 1
        from public.comun_pauta_evidence_items evidence
        where evidence.pauta_id = current_cycle.pauta_id
          and evidence.source_type = 'official_protocol'
          and evidence.source_id = protocol.id
      )
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_SUBMITTED_PROTOCOL_REQUIRED';
  elsif p_to_stage = 'result' and not exists (
    select 1 from public.comun_collective_actions action
    where action.id = current_cycle.collective_action_id
      and action.status in ('awaiting_result', 'completed')
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_ACTIVITY_REQUIRED';
  elsif p_to_stage = 'result' and not exists (
    select 1 from public.comun_official_protocols protocol
    where protocol.id = current_cycle.official_protocol_id
      and protocol.response_received_at is not null
      and nullif(trim(protocol.public_summary), '') is not null
      and exists (
        select 1
        from public.comun_pauta_evidence_items evidence
        where evidence.pauta_id = current_cycle.pauta_id
          and evidence.source_type = 'official_protocol'
          and evidence.source_id = protocol.id
      )
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_PUBLIC_RESPONSE_REQUIRED';
  elsif p_to_stage = 'memory' and not exists (
    select 1 from public.comun_hub_results result
    where result.id = current_cycle.result_id
      and result.pauta_id = current_cycle.pauta_id
      and result.verification_status = 'verified'
      and result.visibility = 'public'
      and nullif(trim(result.evidence_summary_public), '') is not null
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_VERIFIED_RESULT_REQUIRED';
  elsif p_to_stage = 'reopened' and not exists (
    select 1 from public.comun_collective_actions action
    where action.id = current_cycle.collective_action_id
      and action.status = 'completed'
      and action.memory_published_at is not null
      and nullif(trim(action.memory_summary), '') is not null
  ) then
    raise exception 'COMUN_PAUTA_ACTION_CYCLE_REVIEWED_MEMORY_REQUIRED';
  end if;

  update public.comun_pauta_action_cycles
  set current_stage = p_to_stage,
      state_version = comun_pauta_action_cycles.state_version + 1,
      last_transition_at = now(),
      updated_at = now(),
      blocking_reason_public = null
  where id = p_cycle_id
  returning * into current_cycle;

  insert into public.comun_pauta_action_cycle_events(
    cycle_id, idempotency_key, from_stage, to_stage, actor_admin_id,
    actor_role, public_summary, private_note, public_visible, state_version
  )
  values (
    p_cycle_id, p_idempotency_key, previous_stage, p_to_stage,
    p_actor_admin_id, p_actor_role, p_public_summary, p_private_note,
    current_cycle.public_visible and current_cycle.cycle_scope = 'production',
    current_cycle.state_version
  );

  return query
    select current_cycle.id, current_cycle.current_stage,
      current_cycle.state_version, false;
end;
$$;

revoke all on function public.comun_transition_pauta_action_cycle(
  uuid, integer, text, text, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.comun_transition_pauta_action_cycle(
  uuid, integer, text, text, uuid, text, text, text
) to service_role;
