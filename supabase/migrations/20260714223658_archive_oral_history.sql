alter table public.comun_archive_assets drop constraint comun_archive_assets_asset_role_check;
alter table public.comun_archive_assets add constraint comun_archive_assets_asset_role_check check (asset_role in (
  'original','public_version','thumbnail','cover','transcript','attachment',
  'oral_history_original_audio','oral_history_public_audio_excerpt','oral_history_public_full_audio',
  'oral_history_consent_document','oral_history_transcript_source','oral_history_portrait','oral_history_attachment'
));

create table public.comun_archive_oral_histories (
  archive_item_id uuid primary key references public.comun_archive_items(id) on delete cascade,
  interview_title text not null, interview_date date, interview_date_approximate boolean not null default false,
  recording_location_public text, recording_location_private text, interviewer_public text,
  duration_seconds integer check(duration_seconds is null or duration_seconds >= 0), language text not null default 'pt-BR',
  public_summary text, internal_summary text, editorial_context_public text,
  sensitive_content_level text not null default 'normal' check(sensitive_content_level in('normal','attention','restricted','highly_restricted')),
  embargo_until timestamptz,
  publication_status text not null default 'draft' check(publication_status in('draft','consent_pending','transcription','editorial_review','changes_requested','approved','published','embargoed','withdrawn','archived')),
  transcript_status text not null default 'not_started' check(transcript_status in('not_started','in_progress','review','approved_internal','approved_public','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_oral_history_participants (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  participant_role text not null check(participant_role in('interviewee','interviewer','facilitator','translator','recorder','other')),
  public_name text, private_name text, preferred_identification text not null default 'anonymous' check(preferred_identification in('full_public_name','first_name_only','artistic_name','role_only','anonymous')),
  biography_public text, contact_private text, representative_contact_private text, is_minor boolean not null default false,
  participation_status text not null default 'pending' check(participation_status in('pending','consented','restricted','withdrawn','archived')),
  position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_oral_history_consents (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  participant_id uuid not null references public.comun_archive_oral_history_participants(id) on delete cascade,
  consent_status text not null default 'pending' check(consent_status in('pending','information_requested','granted','partially_granted','denied','withdrawn','expired','archived')),
  allow_preservation_private boolean not null default false, allow_internal_transcription boolean not null default false,
  allow_public_transcript boolean not null default false, allow_public_audio_excerpt boolean not null default false,
  allow_public_full_audio boolean not null default false, allow_public_image boolean not null default false,
  allow_public_name boolean not null default false, allow_educational_use boolean not null default false,
  allow_exhibition_use boolean not null default false, allow_social_media_use boolean not null default false,
  allow_download boolean not null default false, guardian_consent boolean not null default false,
  valid_from date, valid_until date, withdrawal_requested_at timestamptz, withdrawal_completed_at timestamptz,
  consent_document_asset_id uuid references public.comun_archive_assets(id), recorded_by text, reviewed_by text,
  reviewed_at timestamptz, private_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(participant_id)
);

create table public.comun_archive_oral_history_transcript_versions (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  version_number integer not null check(version_number > 0), transcript_type text not null check(transcript_type in('internal_full','public_edited','public_excerpt','accessibility_caption')),
  content text not null, language text not null default 'pt-BR', status text not null default 'draft' check(status in('draft','review','approved','archived')),
  source text not null default 'manual' check(source in('manual','imported_text','assisted_future')), editor_note text,
  contains_redactions boolean not null default false, created_by text, created_at timestamptz not null default now(),
  unique(oral_history_item_id, transcript_type, version_number)
);

create table public.comun_archive_oral_history_segments (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  transcript_version_id uuid references public.comun_archive_oral_history_transcript_versions(id) on delete set null,
  start_seconds integer, end_seconds integer, speaker_label text, internal_text text, public_text text,
  sensitivity text not null default 'normal' check(sensitivity in('normal','personal_data','third_party_claim','legal_risk','health_information','workplace_risk','minor_related','location_sensitive','other_sensitive')),
  publication_status text not null default 'private' check(publication_status in('private','review','approved_public','redacted','rejected','archived')),
  editorial_note_private text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(start_seconds is null or start_seconds >= 0), check(end_seconds is null or start_seconds is null or end_seconds >= start_seconds)
);

create table public.comun_archive_oral_history_editorial_versions (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  entity_type text not null, entity_id uuid, change_type text not null, sanitized_snapshot jsonb not null default '{}'::jsonb,
  changed_by text, editor_note text, created_at timestamptz not null default now()
);

create table public.comun_archive_oral_history_suggestions (
  id uuid primary key default gen_random_uuid(), suggested_person_or_theme text not null, story_summary text not null,
  city text, neighborhood text, period_public text, relationship_public text, contact_private text,
  available_for_interview boolean not null default false, credit_preference text,
  status text not null default 'pending' check(status in('pending','triage','accepted','rejected','archived')),
  submitter_hash text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_oral_history_withdrawals (
  id uuid primary key default gen_random_uuid(), oral_history_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  participant_id uuid references public.comun_archive_oral_history_participants(id) on delete set null,
  request_type text not null check(request_type in('correction','restriction','withdrawal','credit')),
  public_summary text, contact_private text, private_reason text,
  status text not null default 'pending' check(status in('pending','reviewing','completed','rejected','archived')),
  requested_at timestamptz not null default now(), completed_at timestamptz, handled_by text
);

create index comun_oral_histories_public_idx on public.comun_archive_oral_histories(publication_status,embargo_until);
create index comun_oral_participants_item_idx on public.comun_archive_oral_history_participants(oral_history_item_id,position);
create index comun_oral_consents_item_idx on public.comun_archive_oral_history_consents(oral_history_item_id,consent_status,valid_until);
create index comun_oral_transcripts_item_idx on public.comun_archive_oral_history_transcript_versions(oral_history_item_id,transcript_type,status,version_number desc);
create index comun_oral_segments_item_idx on public.comun_archive_oral_history_segments(oral_history_item_id,publication_status);

alter table public.comun_archive_oral_histories enable row level security;
alter table public.comun_archive_oral_history_participants enable row level security;
alter table public.comun_archive_oral_history_consents enable row level security;
alter table public.comun_archive_oral_history_transcript_versions enable row level security;
alter table public.comun_archive_oral_history_segments enable row level security;
alter table public.comun_archive_oral_history_editorial_versions enable row level security;
alter table public.comun_archive_oral_history_suggestions enable row level security;
alter table public.comun_archive_oral_history_withdrawals enable row level security;

revoke all on public.comun_archive_oral_histories, public.comun_archive_oral_history_participants,
 public.comun_archive_oral_history_consents, public.comun_archive_oral_history_transcript_versions,
 public.comun_archive_oral_history_segments, public.comun_archive_oral_history_editorial_versions,
 public.comun_archive_oral_history_suggestions, public.comun_archive_oral_history_withdrawals from anon, authenticated;
grant select,insert,update,delete on public.comun_archive_oral_histories, public.comun_archive_oral_history_participants,
 public.comun_archive_oral_history_consents, public.comun_archive_oral_history_transcript_versions,
 public.comun_archive_oral_history_segments, public.comun_archive_oral_history_editorial_versions,
 public.comun_archive_oral_history_suggestions, public.comun_archive_oral_history_withdrawals to service_role;

alter table public.comun_archive_relations drop constraint comun_archive_relations_relation_type_check;
alter table public.comun_archive_relations add constraint comun_archive_relations_relation_type_check check(relation_type in(
 'related_to','depicts','created_by','performed_by','located_at','part_of','before_after','mentioned_in','related_pauta','related_dossier',
 'artist_from_place','performed_at','recorded_at','member_of','release_by','featured_on','documented_in','related_event',
 'interviewed_at_place','speaks_about_place','speaks_about_event','speaks_about_artist','related_photograph','related_document'
));
