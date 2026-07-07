create table if not exists public.comun_official_protocols (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.comun_reports(id) on delete cascade,
  comun_protocol text not null,
  channel text not null default 'ouvidoria',
  agency text null,
  official_protocol_number text null,
  generated_text text null,
  submitted_by_user boolean not null default false,
  submitted_at timestamptz null,
  expected_response_at timestamptz null,
  status text not null default 'draft',
  response_text text null,
  response_received_at timestamptz null,
  satisfaction text null,
  public_summary text null,
  internal_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_official_protocols_status_check check (
    status in (
      'draft',
      'text_generated',
      'sent_by_user',
      'official_protocol_informed',
      'waiting_response',
      'response_received',
      'satisfactory_response',
      'unsatisfactory_response',
      'overdue',
      'resolved',
      'unresolved',
      'archived'
    )
  ),
  constraint comun_official_protocols_satisfaction_check check (
    satisfaction is null or satisfaction in ('satisfactory', 'unsatisfactory', 'partial', 'unknown')
  )
);

create unique index if not exists comun_official_protocols_report_id_idx
  on public.comun_official_protocols(report_id);

create index if not exists comun_official_protocols_comun_protocol_idx
  on public.comun_official_protocols(comun_protocol);

create or replace function public.set_comun_official_protocols_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_comun_official_protocols_updated_at on public.comun_official_protocols;
create trigger set_comun_official_protocols_updated_at
before update on public.comun_official_protocols
for each row execute function public.set_comun_official_protocols_updated_at();
