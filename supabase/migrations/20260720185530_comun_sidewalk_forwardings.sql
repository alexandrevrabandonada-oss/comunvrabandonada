create table public.comun_sidewalk_forwardings (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  priority_id uuid not null unique references public.comun_sidewalk_priorities(id) on delete cascade,
  synthesis_id uuid references public.comun_circle_syntheses(id) on delete set null,
  action_id uuid references public.comun_mobilization_actions(id) on delete set null,
  report_id uuid unique references public.comun_reports(id) on delete set null,
  protocol_id uuid unique references public.comun_official_protocols(id) on delete set null,
  result_id uuid references public.comun_hub_results(id) on delete set null,
  memory_id uuid references public.comun_sidewalk_cycle_memories(id) on delete set null,
  territory_id uuid references public.comun_hub_territories(id) on delete set null,
  state text not null default 'draft' check (state in (
    'draft','ready_for_review','needs_correction','approved','protocol_pending',
    'protocol_registered','response_received','result_recorded','memory_draft','closed','archived'
  )),
  title_public text not null,
  objective_public text not null,
  territory_public text,
  summary_public text not null,
  methodology_public text not null,
  limitations_public text not null,
  proposal_public text not null,
  request_public text not null,
  records_public jsonb not null default '[]'::jsonb,
  package_public jsonb not null default '{}'::jsonb,
  excluded_fields text[] not null default array[
    'contato','member id','autoria privada','original','geometria privada','notas editoriais',
    'object key','URL assinada','consentimento','IDs técnicos privados'
  ],
  correction_request_public text,
  created_by text not null,
  reviewed_by text,
  approved_at timestamptz,
  protocol_registered_at timestamptz,
  response_received_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(records_public) = 'array'),
  check (jsonb_typeof(package_public) = 'object'),
  check (state not in ('approved','protocol_pending','protocol_registered','response_received','result_recorded','memory_draft','closed') or reviewed_by is not null),
  check (state not in ('protocol_registered','response_received','result_recorded','memory_draft','closed') or protocol_id is not null),
  check (state not in ('result_recorded','memory_draft','closed') or result_id is not null),
  check (state <> 'closed' or memory_id is not null)
);

create index comun_sidewalk_forwardings_pauta_state_idx
  on public.comun_sidewalk_forwardings(pauta_id,state,updated_at desc);
create index comun_sidewalk_forwardings_action_idx
  on public.comun_sidewalk_forwardings(action_id) where action_id is not null;

create table public.comun_sidewalk_forwarding_events (
  id uuid primary key default gen_random_uuid(),
  forwarding_id uuid not null references public.comun_sidewalk_forwardings(id) on delete cascade,
  event_type text not null check (event_type in (
    'prepared','submitted_for_review','correction_requested','approved','protocol_registered',
    'response_received','result_recorded','memory_drafted','memory_published','archived'
  )),
  public_summary text,
  private_note text,
  actor_private text not null,
  occurred_at timestamptz not null default now()
);

create index comun_sidewalk_forwarding_events_forwarding_idx
  on public.comun_sidewalk_forwarding_events(forwarding_id,occurred_at);

alter table public.comun_sidewalk_cycle_memories
  add column forwarding_id uuid unique references public.comun_sidewalk_forwardings(id) on delete set null,
  add column priority_id uuid references public.comun_sidewalk_priorities(id) on delete set null,
  add column territory_id uuid references public.comun_hub_territories(id) on delete set null,
  add column community_slug text references public.comun_communities(slug) on delete set null;

alter table public.comun_sidewalk_forwardings enable row level security;
alter table public.comun_sidewalk_forwarding_events enable row level security;
revoke all on public.comun_sidewalk_forwardings from anon,authenticated;
revoke all on public.comun_sidewalk_forwarding_events from anon,authenticated;
grant select,insert,update,delete on public.comun_sidewalk_forwardings to service_role;
grant select,insert,update,delete on public.comun_sidewalk_forwarding_events to service_role;

create trigger comun_sidewalk_forwardings_updated_at
before update on public.comun_sidewalk_forwardings
for each row execute function public.set_updated_at();

alter table public.comun_member_inbox drop constraint if exists comun_member_inbox_notification_type_check;
alter table public.comun_member_inbox add constraint comun_member_inbox_notification_type_check check(notification_type in(
  'action_required','contribution_update','information_requested','task_assigned','task_due','round_opened','round_closing','synthesis_published','campaign_assignment','campaign_update','official_response','result_registered','artwork_update','radio_update','consent_action_required','rights_action_required','sidewalk_report_received','sidewalk_report_verified','sidewalk_report_published','sidewalk_circle_opened','sidewalk_task_assigned','sidewalk_protocol_sent','sidewalk_response_received','sidewalk_result_recorded','sidewalk_forwarding_prepared','sidewalk_forwarding_approved','sidewalk_memory_published',
  'community_followed','community_membership_requested','community_membership_approved','community_circle_opened','community_task_assigned','community_pauta_stage_changed','community_activity_upcoming','community_result_published','community_correction_completed','community_withdrawal_completed',
  'archive_comment_approved','archive_comment_rejected','archive_comment_reply','archive_comment_needs_information','archive_comment_withdrawn'
));
