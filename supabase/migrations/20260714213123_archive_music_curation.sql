create table public.comun_archive_music_editorial_versions (
 id uuid primary key default gen_random_uuid(), archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
 entity_type text not null check(entity_type in('artist','release','track','membership','external_link','rights_review','public_profile')),
 entity_id uuid, change_type text not null check(change_type in('created','updated','published','unpublished','rights_changed','link_status_changed','claim_verified','correction_applied')),
 previous_snapshot jsonb, new_snapshot jsonb, editor_note text, changed_by text, created_at timestamptz not null default now()
);
create table public.comun_archive_link_checks (
 id uuid primary key default gen_random_uuid(), external_link_id uuid not null references public.comun_archive_external_links(id) on delete cascade,
 checked_at timestamptz not null default now(), status text not null check(status in('reachable','redirected','broken','timeout','blocked','unsafe_redirect','unknown')),
 http_status integer, final_hostname text, response_time_ms integer, error_code text, sanitized_error text, created_at timestamptz not null default now()
);
alter table public.comun_archive_artist_memberships add column position integer not null default 0, add column archived_at timestamptz;
alter table public.comun_archive_artist_memberships drop constraint comun_archive_artist_memberships_status_check;
alter table public.comun_archive_artist_memberships add constraint comun_archive_artist_memberships_status_check check(status in('current','former','guest','unknown','archived'));
alter table public.comun_archive_artist_claims add column response_private text, add column official_channel_private text, add column source_reference text;
alter table public.comun_archive_artist_claims drop constraint comun_archive_artist_claims_status_check;
alter table public.comun_archive_artist_claims add constraint comun_archive_artist_claims_status_check check(status in('pending','information_requested','under_review','verified','rejected','archived'));
alter table public.comun_archive_artist_submissions add column applied_fields text[] not null default '{}', add column decision_note text;
alter table public.comun_archive_artist_submissions drop constraint comun_archive_artist_submissions_status_check;
alter table public.comun_archive_artist_submissions add constraint comun_archive_artist_submissions_status_check check(status in('pending','triage','research','rights_review','information_requested','partially_applied','approved','rejected','archived'));
alter table public.comun_archive_processing_jobs alter column archive_asset_id drop not null;
alter table public.comun_archive_processing_jobs drop constraint comun_archive_processing_jobs_job_type_check;
alter table public.comun_archive_processing_jobs add constraint comun_archive_processing_jobs_job_type_check check(job_type in('historical_photo_derivatives','music_external_link_check'));
alter table public.comun_archive_processing_jobs add column external_link_id uuid references public.comun_archive_external_links(id) on delete cascade;
alter table public.comun_archive_processing_jobs add constraint comun_archive_processing_job_target_check check(
 (job_type='historical_photo_derivatives' and archive_asset_id is not null) or (job_type='music_external_link_check' and external_link_id is not null));
create index comun_archive_music_versions_item_idx on public.comun_archive_music_editorial_versions(archive_item_id,created_at desc);
create index comun_archive_link_checks_link_idx on public.comun_archive_link_checks(external_link_id,checked_at desc);
create index comun_archive_memberships_order_idx on public.comun_archive_artist_memberships(artist_item_id,position);
alter table public.comun_archive_music_editorial_versions enable row level security;
alter table public.comun_archive_link_checks enable row level security;
revoke all on public.comun_archive_music_editorial_versions,public.comun_archive_link_checks from anon,authenticated;
grant select,insert,update,delete on public.comun_archive_music_editorial_versions,public.comun_archive_link_checks to service_role;
comment on table public.comun_archive_music_editorial_versions is 'Admin-only sanitized editorial snapshots. Private contacts, authorization documents, full private notes, tokens and signed URLs are forbidden.';
