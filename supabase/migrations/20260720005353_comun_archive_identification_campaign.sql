create table if not exists public.comun_member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade, display_name text not null,
  public_slug text unique, public_bio text, territory_id uuid,
  participation_visibility text not null default 'private' check(participation_visibility in('public','participants','private')),
  profile_visibility text not null default 'private' check(profile_visibility in('private','pauta_members','public')),
  status text not null default 'active' check(status in('active','suspended','deactivation_requested','deactivated','archived')),
  onboarding_completed_at timestamptz, terms_version text, terms_accepted_at timestamptz,
  privacy_version text, privacy_accepted_at timestamptz, suspension_reason_private text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.comun_member_profiles enable row level security;
revoke all on public.comun_member_profiles from anon,authenticated;
grant select,insert,update,delete on public.comun_member_profiles to service_role;

create table if not exists public.comun_member_inbox (
  id uuid primary key default gen_random_uuid(), member_user_id uuid not null references auth.users(id) on delete cascade,
  pauta_id uuid, notification_type text not null, title text not null, summary text not null,
  action_label text not null, action_url text not null check(action_url like '/comun/%'),
  priority text not null default 'normal' check(priority in('normal','attention','urgent')),
  dedupe_key text not null, read_at timestamptz, resolved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(member_user_id,dedupe_key)
);
create index if not exists comun_member_inbox_active_idx on public.comun_member_inbox(member_user_id,resolved_at,priority,created_at desc);
alter table public.comun_member_inbox enable row level security;
revoke all on public.comun_member_inbox from anon,authenticated;
grant select,insert,update,delete on public.comun_member_inbox to service_role;
do $$ begin
  if not exists(select 1 from pg_trigger where tgname='comun_member_profiles_updated_at') then create trigger comun_member_profiles_updated_at before update on public.comun_member_profiles for each row execute function public.set_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='comun_member_inbox_updated_at') then create trigger comun_member_inbox_updated_at before update on public.comun_member_inbox for each row execute function public.set_updated_at(); end if;
end $$;

create table public.comun_archive_identification_campaigns (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.comun_archive_collections(id) on delete restrict,
  slug text not null unique,
  title text not null,
  public_summary text not null,
  public_notice text not null,
  state text not null default 'draft' check(state in('draft','processing','open','paused','closed')),
  display_authorization_reference text not null,
  display_authorized_at timestamptz not null,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comun_archive_identification_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.comun_archive_identification_campaigns(id) on delete cascade,
  archive_item_id uuid not null references public.comun_archive_items(id) on delete restrict,
  preview_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  public_slug text not null,
  public_title text not null,
  public_prompt text not null,
  preview_url text,
  preview_width integer,
  preview_height integer,
  research_state text not null default 'unidentified' check(research_state in('unidentified','has_clues','under_review','partially_identified','identified','disputed')),
  display_state text not null default 'processing' check(display_state in('processing','open','paused','restoration_required','withdrawn')),
  position integer not null default 0,
  comment_count integer not null default 0 check(comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id,archive_item_id),
  unique(campaign_id,public_slug)
);

alter table public.comun_archive_item_suggestions
  add column member_user_id uuid references auth.users(id) on delete set null,
  add column parent_id uuid references public.comun_archive_item_suggestions(id) on delete set null,
  add column display_name_snapshot text,
  add column public_text text,
  add column publication_status text not null default 'private' check(publication_status in('private','approved_public','hidden','withdrawn')),
  add column withdrawn_at timestamptz,
  add column updated_at timestamptz not null default now();

alter table public.comun_archive_item_suggestions drop constraint comun_archive_item_suggestions_status_check;
alter table public.comun_archive_item_suggestions add constraint comun_archive_item_suggestions_status_check
  check(status in('pending','research','needs_information','approved','rejected','withdrawn','archived'));
alter table public.comun_archive_item_suggestions add constraint comun_archive_item_suggestions_public_check
  check(publication_status <> 'approved_public' or (status='approved' and public_text is not null and display_name_snapshot is not null));
alter table public.comun_archive_item_suggestions add constraint comun_archive_item_suggestions_not_self_reply_check
  check(parent_id is null or parent_id <> id);

create table public.comun_archive_identification_reports (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.comun_archive_item_suggestions(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reason text not null check(reason in('personal_data','incorrect_authorship','abuse','offensive_content','copyright','other')),
  details_private text,
  status text not null default 'pending' check(status in('pending','reviewing','resolved','rejected','archived')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(suggestion_id,reporter_user_id)
);

create table public.comun_archive_identification_summaries (
  id uuid primary key default gen_random_uuid(),
  identification_item_id uuid not null references public.comun_archive_identification_items(id) on delete cascade,
  confirmed_text text,
  open_questions_text text,
  disagreement_text text,
  status text not null default 'draft' check(status in('draft','review','published','archived')),
  editorial_basis_private text,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(identification_item_id)
);

create table public.comun_archive_identification_editorial_log (
  id uuid primary key default gen_random_uuid(),
  identification_item_id uuid not null references public.comun_archive_identification_items(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check(action in('campaign_created','preview_reconciled','comment_moderated','summary_updated','item_paused','item_opened','item_withdrawn')),
  public_note text,
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object' and pg_column_size(metadata)<=4096),
  created_at timestamptz not null default now()
);

create index comun_archive_identification_items_public_idx on public.comun_archive_identification_items(campaign_id,display_state,research_state,position);
create index comun_archive_identification_comments_queue_idx on public.comun_archive_item_suggestions(status,risk_level,created_at) where member_user_id is not null;
create index comun_archive_identification_comments_member_idx on public.comun_archive_item_suggestions(member_user_id,created_at desc) where member_user_id is not null;
create index comun_archive_identification_comments_parent_idx on public.comun_archive_item_suggestions(parent_id,created_at) where parent_id is not null;
create index comun_archive_identification_reports_queue_idx on public.comun_archive_identification_reports(status,created_at);

create trigger comun_archive_identification_campaigns_updated_at before update on public.comun_archive_identification_campaigns for each row execute function public.set_updated_at();
create trigger comun_archive_identification_items_updated_at before update on public.comun_archive_identification_items for each row execute function public.set_updated_at();
create trigger comun_archive_item_suggestions_updated_at before update on public.comun_archive_item_suggestions for each row execute function public.set_updated_at();
create trigger comun_archive_identification_summaries_updated_at before update on public.comun_archive_identification_summaries for each row execute function public.set_updated_at();

alter table public.comun_archive_identification_campaigns enable row level security;
alter table public.comun_archive_identification_items enable row level security;
alter table public.comun_archive_identification_reports enable row level security;
alter table public.comun_archive_identification_summaries enable row level security;
alter table public.comun_archive_identification_editorial_log enable row level security;

revoke all on public.comun_archive_identification_campaigns, public.comun_archive_identification_items,
  public.comun_archive_identification_reports, public.comun_archive_identification_summaries,
  public.comun_archive_identification_editorial_log from anon,authenticated;
grant select,insert,update,delete on public.comun_archive_identification_campaigns, public.comun_archive_identification_items,
  public.comun_archive_identification_reports, public.comun_archive_identification_summaries,
  public.comun_archive_identification_editorial_log to service_role;

alter table public.comun_member_inbox drop constraint if exists comun_member_inbox_notification_type_check;
alter table public.comun_member_inbox add constraint comun_member_inbox_notification_type_check check(notification_type in(
  'action_required','contribution_update','information_requested','task_assigned','task_due','round_opened','round_closing','synthesis_published','campaign_assignment','campaign_update','official_response','result_registered','artwork_update','radio_update','consent_action_required','rights_action_required','sidewalk_report_received','sidewalk_report_verified','sidewalk_report_published','sidewalk_circle_opened','sidewalk_task_assigned','sidewalk_protocol_sent','sidewalk_response_received','sidewalk_result_recorded',
  'community_followed','community_membership_requested','community_membership_approved','community_circle_opened','community_task_assigned','community_pauta_stage_changed','community_activity_upcoming','community_result_published','community_correction_completed','community_withdrawal_completed',
  'archive_comment_approved','archive_comment_rejected','archive_comment_reply','archive_comment_needs_information','archive_comment_withdrawn'
));

comment on table public.comun_archive_identification_items is 'Sanitized campaign projection. Private archive fields must never be copied here.';
comment on column public.comun_archive_item_suggestions.suggestion_text is 'Raw private contribution. Never expose publicly; use public_text after moderation.';
comment on column public.comun_archive_identification_reports.details_private is 'Private moderation data; never expose in public pages or audit metadata.';
create table if not exists public.comun_member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  public_slug text unique,
  public_bio text,
  territory_id uuid,
  participation_visibility text not null default 'private' check(participation_visibility in('public','participants','private')),
  profile_visibility text not null default 'private' check(profile_visibility in('private','pauta_members','public')),
  status text not null default 'active' check(status in('active','suspended','deactivation_requested','deactivated','archived')),
  onboarding_completed_at timestamptz,
  terms_version text,
  terms_accepted_at timestamptz,
  privacy_version text,
  privacy_accepted_at timestamptz,
  suspension_reason_private text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.comun_member_profiles enable row level security;
revoke all on public.comun_member_profiles from anon,authenticated;
grant select,insert,update,delete on public.comun_member_profiles to service_role;

create table if not exists public.comun_member_inbox (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null references auth.users(id) on delete cascade,
  pauta_id uuid,
  notification_type text not null,
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
create index if not exists comun_member_inbox_active_idx on public.comun_member_inbox(member_user_id,resolved_at,priority,created_at desc);
alter table public.comun_member_inbox enable row level security;
revoke all on public.comun_member_inbox from anon,authenticated;
grant select,insert,update,delete on public.comun_member_inbox to service_role;

do $$ begin
  if not exists(select 1 from pg_trigger where tgname='comun_member_profiles_updated_at') then
    create trigger comun_member_profiles_updated_at before update on public.comun_member_profiles for each row execute function public.set_updated_at();
  end if;
  if not exists(select 1 from pg_trigger where tgname='comun_member_inbox_updated_at') then
    create trigger comun_member_inbox_updated_at before update on public.comun_member_inbox for each row execute function public.set_updated_at();
  end if;
end $$;
