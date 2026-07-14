create table public.comun_archive_artist_profiles (
  archive_item_id uuid primary key references public.comun_archive_items(id) on delete cascade,
  stage_name text not null,
  artist_type text not null check (artist_type in ('solo','band','duo','collective','orchestra','choir','dj','producer','other')),
  genres text[] not null default '{}', formation_year integer, end_year integer,
  active_status text not null default 'unknown' check (active_status in ('active','inactive','occasional','historical','unknown')),
  city text, neighborhood text, biography_public text, members_public text, former_members_public text,
  influences_public text, contact_private text, official_contact_public text,
  claimed_by_artist boolean not null default false, claim_verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_music_releases (
  archive_item_id uuid primary key references public.comun_archive_items(id) on delete cascade,
  primary_artist_item_id uuid references public.comun_archive_items(id) on delete set null,
  release_type text not null check (release_type in ('single','ep','album','demo','live_album','compilation','soundtrack','other')),
  release_date date, release_year integer, label_name text, catalog_number text, producers_public text,
  recording_location text, rights_status text not null default 'external_link_only'
    check (rights_status in ('external_link_only','permission_granted','licensed','public_domain','restricted')),
  cover_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  cover_absence_confirmed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_music_tracks (
  id uuid primary key default gen_random_uuid(), release_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  title text not null, track_number integer, disc_number integer not null default 1, duration_seconds integer,
  writers_public text, performers_public text, lyrics_status text not null default 'not_stored' check (lyrics_status = 'not_stored'),
  external_link_only boolean not null default true check (external_link_only),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_external_links (
  id uuid primary key default gen_random_uuid(), archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  track_id uuid references public.comun_archive_music_tracks(id) on delete cascade,
  platform text not null check (platform in ('official_website','youtube','spotify','soundcloud','bandcamp','apple_music','deezer','instagram','facebook','other')),
  url text not null check (url ~ '^https://'),
  link_type text not null check (link_type in ('artist_profile','release','track','video','interview','social','purchase','other')),
  official_status text not null default 'unverified' check (official_status in ('unverified','official','authorized','rejected','broken')),
  display_label text, position integer not null default 0, checked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_artist_memberships (
  id uuid primary key default gen_random_uuid(), artist_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  member_name text not null, role_public text, started_year integer, ended_year integer,
  status text not null default 'current' check (status in ('current','former','guest','unknown')),
  source_public text, created_at timestamptz not null default now()
);

create table public.comun_archive_music_rights_reviews (
  id uuid primary key default gen_random_uuid(), archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  scope text not null check (scope in ('biography','promotional_photo','cover_art','external_links','hosted_audio_future','other')),
  decision text not null check (decision in ('pending','external_link_only','permission_granted','licensed','public_domain','restricted','rejected')),
  source_reference text, permission_reference_private text, reviewed_by text, reviewed_at timestamptz,
  notes_private text, created_at timestamptz not null default now()
);

create table public.comun_archive_artist_claims (
  id uuid primary key default gen_random_uuid(), artist_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  claimant_name text, claimant_contact_private text not null, relationship text not null,
  verification_reference_private text, status text not null default 'pending'
    check (status in ('pending','information_requested','verified','rejected','archived')),
  moderator_notes text, submitter_hash text, created_at timestamptz not null default now(), reviewed_at timestamptz
);

create table public.comun_archive_artist_submissions (
  id uuid primary key default gen_random_uuid(), status text not null default 'pending' check (status in ('pending','triage','research','rights_review','approved','rejected','archived')),
  stage_name text not null, artist_type text not null, city text, neighborhood text, genres text[], activity_period text,
  biography_suggested text, members_suggested text, releases_suggested text, official_links_suggested text,
  source_reference text, relationship_to_artist text, credit_preference text,
  contact_private text, is_artist_or_representative boolean not null default false, submitter_hash text,
  moderation_notes text, created_at timestamptz not null default now(), reviewed_at timestamptz
);

do $$ begin
  alter table public.comun_archive_relations drop constraint comun_archive_relations_relation_type_check;
exception when undefined_object then null; end $$;
alter table public.comun_archive_relations add constraint comun_archive_relations_relation_type_check check (relation_type in
('related_to','depicts','created_by','performed_by','located_at','part_of','before_after','mentioned_in','related_pauta','related_dossier','artist_from_place','performed_at','recorded_at','member_of','release_by','featured_on','documented_in','related_event'));

do $$ begin
  alter table public.comun_archive_item_suggestions drop constraint comun_archive_item_suggestions_suggestion_type_check;
exception when undefined_object then null; end $$;
alter table public.comun_archive_item_suggestions add constraint comun_archive_item_suggestions_suggestion_type_check check (suggestion_type in
('date_correction','place_identification','event_context','photographer_information','source_information','person_information','historical_context','other','biography_correction','member_correction','release_information','track_information','credit_correction','broken_link','official_link','rights_request','removal_request'));

create index comun_archive_artist_profiles_search_idx on public.comun_archive_artist_profiles using gin
(to_tsvector('portuguese', stage_name || ' ' || coalesce(biography_public,'') || ' ' || coalesce(members_public,'') || ' ' || coalesce(city,'') || ' ' || coalesce(neighborhood,'')));
create index comun_archive_artist_profiles_genres_idx on public.comun_archive_artist_profiles using gin(genres);
create index comun_archive_music_releases_artist_idx on public.comun_archive_music_releases(primary_artist_item_id, release_year desc);
create index comun_archive_music_tracks_release_idx on public.comun_archive_music_tracks(release_item_id, disc_number, track_number);
create index comun_archive_external_links_item_idx on public.comun_archive_external_links(archive_item_id, official_status, position);
create index comun_archive_artist_claims_queue_idx on public.comun_archive_artist_claims(status, created_at);
create index comun_archive_artist_submissions_queue_idx on public.comun_archive_artist_submissions(status, created_at);

alter table public.comun_archive_artist_profiles enable row level security;
alter table public.comun_archive_music_releases enable row level security;
alter table public.comun_archive_music_tracks enable row level security;
alter table public.comun_archive_external_links enable row level security;
alter table public.comun_archive_artist_memberships enable row level security;
alter table public.comun_archive_music_rights_reviews enable row level security;
alter table public.comun_archive_artist_claims enable row level security;
alter table public.comun_archive_artist_submissions enable row level security;

revoke all on public.comun_archive_artist_profiles, public.comun_archive_music_releases, public.comun_archive_music_tracks,
public.comun_archive_external_links, public.comun_archive_artist_memberships, public.comun_archive_music_rights_reviews,
public.comun_archive_artist_claims, public.comun_archive_artist_submissions from anon, authenticated;
grant select, insert, update, delete on public.comun_archive_artist_profiles, public.comun_archive_music_releases, public.comun_archive_music_tracks,
public.comun_archive_external_links, public.comun_archive_artist_memberships, public.comun_archive_music_rights_reviews,
public.comun_archive_artist_claims, public.comun_archive_artist_submissions to service_role;

create trigger comun_archive_artist_profiles_updated_at before update on public.comun_archive_artist_profiles for each row execute function public.set_updated_at();
create trigger comun_archive_music_releases_updated_at before update on public.comun_archive_music_releases for each row execute function public.set_updated_at();
create trigger comun_archive_music_tracks_updated_at before update on public.comun_archive_music_tracks for each row execute function public.set_updated_at();
create trigger comun_archive_external_links_updated_at before update on public.comun_archive_external_links for each row execute function public.set_updated_at();

comment on column public.comun_archive_artist_profiles.contact_private is 'Private moderator-only contact; never select in public queries.';
comment on column public.comun_archive_music_rights_reviews.permission_reference_private is 'Private evidence; never expose publicly.';
comment on column public.comun_archive_music_rights_reviews.notes_private is 'Private editorial notes; never expose publicly.';
comment on column public.comun_archive_artist_claims.claimant_contact_private is 'Private claim contact; never expose publicly.';
