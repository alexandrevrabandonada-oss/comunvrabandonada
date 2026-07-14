create table if not exists public.comun_public_lookup_events (
  id uuid primary key default gen_random_uuid(),
  lookup_type text not null default 'protocol',
  protocol_hash text null,
  normalized_protocol text null,
  result_type text not null,
  ip_hash text null,
  user_agent_hash text null,
  route text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint comun_public_lookup_events_type_check check (lookup_type in ('protocol')),
  constraint comun_public_lookup_events_result_check check (
    result_type in (
      'invalid_format',
      'not_found',
      'found_received',
      'found_under_review',
      'found_published',
      'found_archived',
      'rate_limited'
    )
  )
);

alter table public.comun_public_lookup_events enable row level security;

drop policy if exists "Public cannot read lookup events" on public.comun_public_lookup_events;
create policy "Public cannot read lookup events"
on public.comun_public_lookup_events for select
using (false);

create index if not exists comun_public_lookup_events_created_at_idx
on public.comun_public_lookup_events (created_at desc);

create index if not exists comun_public_lookup_events_ip_route_created_idx
on public.comun_public_lookup_events (ip_hash, route, created_at desc);

create index if not exists comun_public_lookup_events_protocol_ip_created_idx
on public.comun_public_lookup_events (protocol_hash, ip_hash, created_at desc);

create index if not exists comun_public_lookup_events_result_ip_created_idx
on public.comun_public_lookup_events (result_type, ip_hash, created_at desc);
