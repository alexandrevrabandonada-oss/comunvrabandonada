create table public.comun_archive_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null default 'historical_photo' check (submission_type = 'historical_photo'),
  archive_item_id uuid references public.comun_archive_items(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','awaiting_upload','submitted','triage','research','rights_review','derivative_pending','ready_for_editorial_review','approved','rejected','archived')),
  contributor_name text,
  contributor_credit_preference text not null default 'anonymous' check (contributor_credit_preference in ('anonymous','contributor_name','custom_credit')),
  contributor_contact_private text,
  relationship_to_material text,
  title_suggestion text,
  description_suggestion text,
  city text, neighborhood text, place_name text, approximate_date text,
  source_name text, source_story text, photographer_name text,
  rights_declaration text,
  permission_confirmed boolean not null default false,
  public_credit text,
  moderation_notes text,
  risk_level text not null default 'normal' check (risk_level in ('normal','attention','high')),
  submitter_hash text,
  contact_authorized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.comun_archive_submission_assets (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.comun_archive_submissions(id) on delete cascade,
  archive_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  role text not null default 'original' check (role = 'original'),
  upload_status text not null default 'pending' check (upload_status in ('pending','authorized','uploaded','confirmed','rejected')),
  created_at timestamptz not null default now(),
  unique (submission_id, role)
);

create table public.comun_archive_item_suggestions (
  id uuid primary key default gen_random_uuid(),
  archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  suggestion_type text not null check (suggestion_type in ('date_correction','place_identification','event_context','photographer_information','source_information','person_information','historical_context','other')),
  suggestion_text text not null,
  contributor_alias text,
  contact_private text,
  source_reference text,
  status text not null default 'pending' check (status in ('pending','research','approved','rejected','archived')),
  risk_level text not null default 'normal' check (risk_level in ('normal','attention','high')),
  submitter_hash text,
  moderator_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.comun_archive_rights_removal_requests (
  id uuid primary key default gen_random_uuid(),
  archive_item_id uuid references public.comun_archive_items(id) on delete set null,
  request_type text not null check (request_type in ('correction','credit','removal')),
  requester_contact_private text,
  reason_private text not null,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','rejected','archived')),
  submitter_hash text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.comun_archive_assets
  alter column archive_item_id drop not null,
  add column if not exists integrity_status text not null default 'unknown' check (integrity_status in ('unknown','verified','missing','review_required')),
  add column if not exists derivative_kind text check (derivative_kind is null or derivative_kind in ('thumbnail','display','large'));

create index comun_archive_submissions_queue_idx on public.comun_archive_submissions(status, created_at);
create index comun_archive_submissions_hash_idx on public.comun_archive_submissions(submitter_hash, created_at);
create index comun_archive_suggestions_queue_idx on public.comun_archive_item_suggestions(status, risk_level, created_at);
create index comun_archive_assets_checksum_idx on public.comun_archive_assets(checksum_sha256) where checksum_sha256 is not null;

create trigger comun_archive_submissions_updated_at before update on public.comun_archive_submissions
for each row execute function public.set_updated_at();

alter table public.comun_archive_submissions enable row level security;
alter table public.comun_archive_submission_assets enable row level security;
alter table public.comun_archive_item_suggestions enable row level security;
alter table public.comun_archive_rights_removal_requests enable row level security;

revoke all on public.comun_archive_submissions, public.comun_archive_submission_assets, public.comun_archive_item_suggestions, public.comun_archive_rights_removal_requests from anon, authenticated;
grant select, insert, update, delete on public.comun_archive_submissions, public.comun_archive_submission_assets, public.comun_archive_item_suggestions, public.comun_archive_rights_removal_requests to service_role;

comment on column public.comun_archive_submissions.contributor_contact_private is 'Private operational data; never expose in public queries or manifests.';
comment on column public.comun_archive_item_suggestions.contact_private is 'Private operational data; moderator access only.';
