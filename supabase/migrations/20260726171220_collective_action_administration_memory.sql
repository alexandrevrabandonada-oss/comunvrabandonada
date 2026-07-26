alter table public.comun_collective_actions
  add column result_status text check (result_status in ('achieved', 'partial', 'not_achieved')),
  add column participant_count_aggregate integer check (participant_count_aggregate >= 0),
  add column tasks_completed_aggregate integer check (tasks_completed_aggregate >= 0),
  add column learned_summary text check (learned_summary is null or char_length(learned_summary) between 3 and 2000),
  add column next_steps_summary text check (next_steps_summary is null or char_length(next_steps_summary) between 3 and 2000),
  add column memory_published_at timestamptz;

alter table public.comun_collective_action_updates
  add column event_key text,
  add column idempotency_key text;

alter table public.comun_collective_action_updates
  drop constraint if exists comun_collective_action_updates_update_type_check;

alter table public.comun_collective_action_updates
  add constraint comun_collective_action_updates_update_type_check
  check (update_type in ('announcement', 'progress', 'meeting', 'protocol', 'response', 'result', 'memory', 'task', 'forwarding')),
  add constraint comun_collective_action_updates_event_key_check
  check (event_key is null or event_key in ('action_published', 'task_opened', 'activity_realized', 'forwarding_sent', 'protocol_registered', 'response_received', 'result_verified', 'memory_completed')),
  add constraint comun_collective_action_updates_idempotency_key_check
  check (idempotency_key is null or char_length(idempotency_key) between 12 and 128);

alter table public.comun_collective_action_updates
  add constraint comun_collective_updates_action_idempotency_key_unique
  unique (action_id, idempotency_key);

create table public.comun_collective_action_forwardings (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.comun_collective_actions(id) on delete cascade,
  recipient_name text check (recipient_name is null or char_length(recipient_name) between 3 and 180),
  public_summary text check (public_summary is null or char_length(public_summary) between 3 and 2000),
  sent_at timestamptz,
  protocol_code text check (protocol_code is null or char_length(protocol_code) between 3 and 120),
  expected_response_at timestamptz,
  state text not null default 'preparing' check (state in ('preparing', 'sent', 'protocol_registered', 'awaiting_response', 'response_received', 'verified_in_territory', 'closed')),
  response_public text check (response_public is null or char_length(response_public) between 3 and 2000),
  public_document_url text check (public_document_url is null or public_document_url ~ '^https://'),
  public_document_label text check (public_document_label is null or char_length(public_document_label) between 3 and 180),
  public_visible boolean not null default false,
  created_by_admin_id uuid references public.comun_admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((public_document_url is null) = (public_document_label is null))
);

create index comun_collective_forwardings_action_state_idx
  on public.comun_collective_action_forwardings(action_id, state, updated_at desc);

create table public.comun_collective_action_memory_assets (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.comun_collective_actions(id) on delete cascade,
  asset_kind text not null check (asset_kind in ('document', 'photograph')),
  title text not null check (char_length(title) between 3 and 180),
  public_url text not null check (public_url ~ '^https://'),
  public_visible boolean not null default false,
  reviewed_at timestamptz,
  created_by_admin_id uuid references public.comun_admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (action_id, public_url),
  check (not public_visible or reviewed_at is not null)
);

create index comun_collective_memory_assets_public_idx
  on public.comun_collective_action_memory_assets(action_id, asset_kind)
  where public_visible;

alter table public.comun_collective_action_forwardings enable row level security;
alter table public.comun_collective_action_memory_assets enable row level security;

revoke all on table public.comun_collective_action_forwardings from public, anon, authenticated;
revoke all on table public.comun_collective_action_memory_assets from public, anon, authenticated;

grant select on public.comun_collective_action_forwardings, public.comun_collective_action_memory_assets
  to anon, authenticated;
grant select, insert, update, delete on public.comun_collective_action_forwardings, public.comun_collective_action_memory_assets
  to service_role;

create policy "Public can read reviewed collective forwardings"
on public.comun_collective_action_forwardings for select to anon, authenticated
using (
  public_visible
  and exists (
    select 1 from public.comun_collective_actions action
    where action.id = action_id
      and action.visibility = 'public'
      and action.status in ('open', 'active', 'awaiting_result', 'completed')
  )
);

create policy "Public can read reviewed collective memory assets"
on public.comun_collective_action_memory_assets for select to anon, authenticated
using (
  public_visible
  and reviewed_at is not null
  and exists (
    select 1 from public.comun_collective_actions action
    where action.id = action_id
      and action.visibility = 'public'
      and action.status = 'completed'
  )
);
