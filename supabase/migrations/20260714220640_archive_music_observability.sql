alter table public.comun_archive_link_checks
 add column method_used text not null default 'HEAD' check(method_used in('HEAD','GET_HEADERS_ONLY')),
 add column fallback_reason text,
 add column redirect_count integer not null default 0 check(redirect_count between 0 and 3),
 add column platform text,
 add column safe_final_hostname text;
create index comun_archive_external_links_platform_status_idx on public.comun_archive_external_links(platform,official_status);
create index comun_archive_artist_claims_status_created_idx on public.comun_archive_artist_claims(status,created_at);
create index comun_archive_music_rights_decision_created_idx on public.comun_archive_music_rights_reviews(decision,created_at);
create index comun_archive_artist_submissions_status_created_idx on public.comun_archive_artist_submissions(status,created_at);
comment on column public.comun_archive_link_checks.safe_final_hostname is 'Sanitized hostname only; never store full URL or resolved IP.';
