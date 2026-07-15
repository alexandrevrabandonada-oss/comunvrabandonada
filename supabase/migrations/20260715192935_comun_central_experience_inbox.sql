create table public.comun_member_inbox (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null,
  pauta_id uuid references public.comun_pauta_spaces(id) on delete cascade,
  notification_type text not null check(notification_type in('action_required','contribution_update','information_requested','task_assigned','task_due','round_opened','round_closing','synthesis_published','campaign_assignment','campaign_update','official_response','result_registered','artwork_update','radio_update','consent_action_required','rights_action_required')),
  title text not null,
  summary text not null,
  action_label text not null,
  action_url text not null check(action_url like '/comun/%'),
  priority text not null default 'normal' check(priority in('normal','attention','urgent')),
  dedupe_key text not null,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_user_id,dedupe_key)
);
create index comun_member_inbox_active_idx on public.comun_member_inbox(member_user_id,resolved_at,priority,created_at desc);
alter table public.comun_member_inbox enable row level security;
revoke all on public.comun_member_inbox from anon,authenticated;
grant select,insert,update,delete on public.comun_member_inbox to service_role;
create trigger comun_member_inbox_updated_at before update on public.comun_member_inbox for each row execute function public.set_updated_at();

alter table public.comun_hub_territories add column if not exists private_notes text;
alter table public.comun_pauta_spaces drop constraint comun_pauta_spaces_public_status_check;
alter table public.comun_pauta_spaces add constraint comun_pauta_spaces_public_status_check check(public_status in('received','triage','investigating','collecting_evidence','building_proposal','building_solution','ready_for_action','active_mobilization','awaiting_response','monitoring','partial_win','resolved','no_progress','archived'));

alter table public.comun_pauta_timeline_events drop constraint comun_pauta_timeline_events_event_type_check;
alter table public.comun_pauta_timeline_events add constraint comun_pauta_timeline_events_event_type_check check(event_type in('report_received','evidence_added','circle_opened','round_closed','synthesis_published','proposal_created','decision_recorded','task_created','action_started','protocol_sent','official_response_received','result_recorded','archive_item_related','artwork_related','radio_episode_related','official_response','investigation_update','action_announced','action_completed','publication_released','meeting_held','proposal_presented','partial_result','final_result','correction','other'));
