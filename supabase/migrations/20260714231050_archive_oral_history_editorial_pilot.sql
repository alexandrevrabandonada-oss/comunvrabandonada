create table public.comun_archive_consent_templates (
  id uuid primary key default gen_random_uuid(),
  template_type text not null check (template_type in ('oral_history_adult','oral_history_representative','oral_history_minor_future','audio_excerpt','image_use','social_media_use')),
  version text not null, title text not null, public_explanation text not null,
  document_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','legal_review','approved','retired')),
  approved_by text, approved_at timestamptz, valid_from date, retired_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(template_type, version)
);

create table public.comun_archive_consent_legal_reviews (
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.comun_archive_consent_templates(id) on delete cascade,
  reviewer_reference text not null, reviewed_at timestamptz not null, reviewed_version text not null,
  pending_items text, decision text not null check(decision in ('pending','changes_required','approved','rejected')),
  review_due_at timestamptz, created_at timestamptz not null default now()
);

alter table public.comun_archive_oral_history_consents drop constraint comun_archive_oral_history_consents_participant_id_key;
alter table public.comun_archive_oral_history_consents
  add column template_id uuid references public.comun_archive_consent_templates(id),
  add column template_version text,
  add column presented_at timestamptz,
  add column acceptance_method text check(acceptance_method is null or acceptance_method in ('signed_document','recorded_audio','recorded_video','written_confirmation','in_person_record')),
  add column consent_stage text not null default 'initial' check(consent_stage in ('initial','publication_final')),
  add column supersedes_consent_id uuid references public.comun_archive_oral_history_consents(id),
  add column publication_identity_presented boolean not null default false,
  add column publication_text_presented boolean not null default false,
  add column publication_audio_presented boolean not null default false,
  add column publication_image_presented boolean not null default false;
create unique index comun_oral_consents_active_stage_idx on public.comun_archive_oral_history_consents(participant_id,consent_stage) where consent_status not in ('expired','withdrawn','archived');

create or replace function public.comun_validate_consent_template() returns trigger language plpgsql security invoker set search_path = public as $$
declare t public.comun_archive_consent_templates;
begin
  if new.template_id is null then raise exception 'Consentimento exige template versionado'; end if;
  select * into t from public.comun_archive_consent_templates where id=new.template_id;
  if t.status <> 'approved' or t.retired_at is not null then raise exception 'Template precisa estar aprovado e ativo'; end if;
  if new.template_version is distinct from t.version then raise exception 'Versão do consentimento diverge do template'; end if;
  return new;
end $$;
create trigger comun_validate_consent_template_before_write before insert or update of template_id,template_version on public.comun_archive_oral_history_consents for each row execute function public.comun_validate_consent_template();

create table public.comun_archive_oral_history_consent_sessions (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  participant_id uuid not null references public.comun_archive_oral_history_participants(id) on delete cascade,
  consent_id uuid references public.comun_archive_oral_history_consents(id) on delete set null,
  session_type text not null check(session_type in ('pre_interview','post_edit','renewal','withdrawal')),
  explained_by text, occurred_at timestamptz not null, participant_questions_summary_private text,
  comprehension_confirmed boolean not null default false, withdrawal_process_explained boolean not null default false,
  publication_scope_explained boolean not null default false, preservation_scope_explained boolean not null default false,
  recorded_evidence_asset_id uuid references public.comun_archive_assets(id) on delete set null, created_at timestamptz not null default now()
);

create table public.comun_archive_oral_history_interview_plans (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null unique references public.comun_archive_items(id) on delete cascade,
  objective_public text, themes_public text[] not null default '{}', questions_private jsonb, known_risks_private jsonb,
  sensitive_topics_private jsonb, sources_reviewed_private jsonb, responsible_editor text, next_action text, blockers_private text,
  interviewer_prepared boolean not null default false, consent_confirmed boolean not null default false,
  project_identity_explained boolean not null default false, purpose_explained boolean not null default false,
  recording_authorized boolean not null default false, device_checked boolean not null default false,
  adequate_space_confirmed boolean not null default false, interruption_allowed boolean not null default false,
  optional_questions_explained boolean not null default false, withdrawal_explained boolean not null default false,
  contact_provided boolean not null default false, backup_planned boolean not null default false,
  recording_check_completed boolean not null default false,
  pilot_stage text not null default 'indicated' check(pilot_stage in ('indicated','contacted','explanation_complete','initial_consent','scheduled','recorded','original_preserved','transcription','review','participant_approval','ready_to_publish','published','withdrawn')),
  risk_level text not null default 'low' check(risk_level in ('low','moderate','high','excluded')),
  stage_started_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_asset_custody_events (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references public.comun_archive_assets(id) on delete cascade,
  event_type text not null check(event_type in ('recorded','received','uploaded_private','checksum_verified','backup_confirmed','transcript_created','public_derivative_created','restricted','withdrawal_review','deleted','preserved_after_withdrawal')),
  performed_by text, sanitized_metadata jsonb, occurred_at timestamptz not null default now(),
  check (sanitized_metadata is null or not (sanitized_metadata ?| array['object_key','url','location','contact','private_name']))
);

create table public.comun_archive_oral_history_transcription_work (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null unique references public.comun_archive_items(id) on delete cascade,
  assignee text, started_at timestamptz, approximate_progress smallint not null default 0 check(approximate_progress between 0 and 100),
  last_edited_at timestamptz, pending_items_private text, fidelity_review_status text not null default 'pending' check(fidelity_review_status in ('pending','in_review','approved','changes_required')),
  risk_review_status text not null default 'pending' check(risk_review_status in ('pending','in_review','approved','changes_required','legal_review_required')),
  fidelity_reviewed_by text, risk_reviewed_by text, editorial_minutes integer not null default 0 check(editorial_minutes >= 0),
  revision_count integer not null default 0 check(revision_count >= 0), audio_duration_seconds integer check(audio_duration_seconds is null or audio_duration_seconds >= 0),
  transcript_character_count integer not null default 0 check(transcript_character_count >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_oral_history_third_party_statements (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  segment_id uuid references public.comun_archive_oral_history_segments(id) on delete set null, claim_nature_private text not null,
  referenced_party_private text, additional_source_private text, risk_level text not null default 'moderate' check(risk_level in ('low','moderate','high','critical')),
  decision_private text, response_right_required boolean not null default false, treatment text,
  status text not null default 'pending_review' check(status in ('pending_review','corroborated','contextualized','removed','restricted','legal_review_required')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_oral_history_participant_approvals (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  participant_id uuid not null references public.comun_archive_oral_history_participants(id) on delete cascade,
  transcript_version_id uuid references public.comun_archive_oral_history_transcript_versions(id) on delete set null,
  public_audio_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  approval_status text not null default 'pending' check(approval_status in ('pending','changes_requested','approved','partially_approved','denied','expired','withdrawn')),
  approved_identity text, approved_at timestamptz, expires_at timestamptz, requested_changes_private text,
  evidence_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  approved_transcript boolean not null default false, approved_audio boolean not null default false, approved_image boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index comun_oral_consent_sessions_item_idx on public.comun_archive_oral_history_consent_sessions(oral_history_item_id,occurred_at desc);
create index comun_oral_custody_asset_idx on public.comun_archive_asset_custody_events(asset_id,occurred_at desc);
create index comun_oral_third_party_pending_idx on public.comun_archive_oral_history_third_party_statements(oral_history_item_id,status);
create index comun_oral_approvals_item_idx on public.comun_archive_oral_history_participant_approvals(oral_history_item_id,approval_status);

alter table public.comun_archive_consent_templates enable row level security;
alter table public.comun_archive_consent_legal_reviews enable row level security;
alter table public.comun_archive_oral_history_consent_sessions enable row level security;
alter table public.comun_archive_oral_history_interview_plans enable row level security;
alter table public.comun_archive_asset_custody_events enable row level security;
alter table public.comun_archive_oral_history_transcription_work enable row level security;
alter table public.comun_archive_oral_history_third_party_statements enable row level security;
alter table public.comun_archive_oral_history_participant_approvals enable row level security;

revoke all on public.comun_archive_consent_templates,public.comun_archive_consent_legal_reviews,public.comun_archive_oral_history_consent_sessions,public.comun_archive_oral_history_interview_plans,public.comun_archive_asset_custody_events,public.comun_archive_oral_history_transcription_work,public.comun_archive_oral_history_third_party_statements,public.comun_archive_oral_history_participant_approvals from anon,authenticated;
grant select,insert,update,delete on public.comun_archive_consent_templates,public.comun_archive_consent_legal_reviews,public.comun_archive_oral_history_consent_sessions,public.comun_archive_oral_history_interview_plans,public.comun_archive_asset_custody_events,public.comun_archive_oral_history_transcription_work,public.comun_archive_oral_history_third_party_statements,public.comun_archive_oral_history_participant_approvals to service_role;
revoke execute on function public.comun_validate_consent_template() from public,anon,authenticated;
grant execute on function public.comun_validate_consent_template() to service_role;
