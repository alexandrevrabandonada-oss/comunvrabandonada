create table public.comun_editorial_operation_items (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('contribution','record','photo','observation','proposal','task','protocol','correction','withdrawal','alert')),
  source_id uuid,
  pauta_id uuid references public.comun_pautas(id) on delete set null,
  territory_id uuid references public.comun_territories(id) on delete set null,
  queue text not null check (queue in ('entry','triage','rights','safety','factual','editorial','publication','follow_up','corrections','withdrawals')),
  state text not null default 'pending' check (state in ('pending','assigned','in_review','blocked','ready','published','resolved','withdrawn')),
  title text not null check (char_length(title) between 1 and 180),
  public_reason text,
  next_action text,
  priority smallint not null default 2 check (priority between 1 and 4),
  indicative_due_at timestamptz,
  human_gate text,
  fixture_tag text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_editorial_operation_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.comun_editorial_operation_items(id) on delete cascade,
  assignee_profile_id uuid not null references public.comun_admin_profiles(id),
  assigned_by_profile_id uuid not null references public.comun_admin_profiles(id),
  role_at_assignment text not null check (role_at_assignment in ('admin','editor','factual_reviewer','editorial_reviewer','publisher','viewer')),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  assigned_at timestamptz not null default now(), resolved_at timestamptz,
  unique(item_id, assignee_profile_id, status)
);

create table public.comun_editorial_operation_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.comun_editorial_operation_items(id) on delete cascade,
  actor_profile_id uuid references public.comun_admin_profiles(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index comun_editorial_operation_queue_idx on public.comun_editorial_operation_items(queue, state, priority, created_at);
create index comun_editorial_operation_events_item_idx on public.comun_editorial_operation_events(item_id, created_at desc);
alter table public.comun_editorial_operation_items enable row level security;
alter table public.comun_editorial_operation_assignments enable row level security;
alter table public.comun_editorial_operation_events enable row level security;
revoke all on public.comun_editorial_operation_items, public.comun_editorial_operation_assignments, public.comun_editorial_operation_events from anon, authenticated;
grant all on public.comun_editorial_operation_items, public.comun_editorial_operation_assignments, public.comun_editorial_operation_events to service_role;
