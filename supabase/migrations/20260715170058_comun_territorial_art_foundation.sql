alter table public.comun_archive_items drop constraint comun_archive_items_item_type_check;
alter table public.comun_archive_items add constraint comun_archive_items_item_type_check check(item_type in ('photograph','document','place','artist','music_release','oral_history','video','poster','newspaper','territorial_artwork','other'));

alter table public.comun_archive_assets drop constraint comun_archive_assets_asset_role_check;
alter table public.comun_archive_assets add constraint comun_archive_assets_asset_role_check check(asset_role in ('original','public_version','thumbnail','cover','transcript','attachment','artwork_private_original','artwork_public_detail','artwork_public_card','artwork_public_thumbnail','artwork_public_social_preview','artwork_rights_document','artwork_context_document','artwork_process_photo'));

alter table public.comun_archive_processing_jobs drop constraint comun_archive_processing_jobs_job_type_check;
alter table public.comun_archive_processing_jobs add constraint comun_archive_processing_jobs_job_type_check check(job_type in ('historical_photo_derivatives','music_external_link_check','territorial_artwork_derivatives'));
alter table public.comun_archive_processing_jobs drop constraint comun_archive_processing_job_target_check;
alter table public.comun_archive_processing_jobs add constraint comun_archive_processing_job_target_check check((job_type in('historical_photo_derivatives','territorial_artwork_derivatives') and archive_asset_id is not null) or (job_type='music_external_link_check' and external_link_id is not null));

update public.comun_pauta_modules set module_type='art_gallery' where module_type='art_gallery_future';
alter table public.comun_pauta_modules drop constraint comun_pauta_modules_module_type_check;
alter table public.comun_pauta_modules add constraint comun_pauta_modules_module_type_check check(module_type in('overview','construction_circle','reports','evidence','map','observatory','metrics','documents','timeline','proposals','actions','tasks','calendar','results','archive','art_gallery','community_radio_future','participation'));

create table public.comun_archive_agents(
 id uuid primary key default gen_random_uuid(), agent_type text not null check(agent_type in('person','collective','organization','anonymous','unknown','traditional_community')),
 public_name text not null, public_slug text unique, public_bio text, territory_id uuid references public.comun_hub_territories(id) on delete set null,
 member_user_id uuid, public_visibility text not null default 'private' check(public_visibility in('private','public')),
 status text not null default 'draft' check(status in('draft','review','approved','published','unpublished','archived')),
 private_contact text, private_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_artworks(
 archive_item_id uuid primary key references public.comun_archive_items(id) on delete cascade,
 artwork_type text not null check(artwork_type in('drawing','painting','collage','poster','photography','graffiti','mural','sculpture','installation','comic','illustration','digital_art','textile','craft','printmaking','performance_record','poetry_visual','mixed_media','other')),
 title_public text not null, subtitle_public text, description_public text, context_public text, creation_date date, creation_year integer,
 creation_period_public text, creation_date_approximate boolean not null default false, technique_public text, materials_public text[] not null default '{}', dimensions_public text,
 territory_id uuid references public.comun_hub_territories(id) on delete set null, creation_place_public text, creation_place_private text,
 current_location_public text, current_location_private text, edition_information_public text,
 creation_process text not null default 'human_created' check(creation_process in('human_created','digital_tools','ai_assisted_disclosed','collective_process','traditional_process','unknown')),
 ai_assistance_disclosure_public text, publication_status text not null default 'draft' check(publication_status in('draft','rights_review','editorial_review','approved','published','withdrawn','archived')),
 sensitivity_level text not null default 'normal' check(sensitivity_level in('normal','attention','restricted')),
 territory_absence_reason text, long_description_public text, updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
 check(creation_year is null or creation_year between 1000 and 2200)
);

create table public.comun_archive_artwork_credits(
 id uuid primary key default gen_random_uuid(), archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
 agent_id uuid references public.comun_archive_agents(id) on delete restrict,
 credit_role text not null check(credit_role in('creator','co_creator','collective','photographer','designer','illustrator','writer','printer','performer','curator','restorer','donor','rights_holder','unknown_creator')),
 public_credit text not null, position integer not null default 0, public_visibility text not null default 'public' check(public_visibility in('public','private')),
 source_public text, private_notes text, created_at timestamptz not null default now()
);

create table public.comun_archive_artwork_rights(
 id uuid primary key default gen_random_uuid(), archive_item_id uuid not null unique references public.comun_archive_items(id) on delete cascade,
 rights_holder_agent_id uuid references public.comun_archive_agents(id) on delete set null,
 consent_status text not null default 'pending' check(consent_status in('pending','information_requested','granted','partially_granted','denied','expired','withdrawn')),
 allow_private_preservation boolean not null default false, allow_comun_display boolean not null default false, allow_social_media boolean not null default false,
 allow_print boolean not null default false, allow_exhibition boolean not null default false, allow_educational_use boolean not null default false,
 allow_campaign_use boolean not null default false, allow_crop boolean not null default false, allow_derivative_use boolean not null default false,
 allow_download boolean not null default false, allow_third_party_reuse boolean not null default false, required_credit_public text, license_public text,
 valid_from date, valid_until date, embargo_until timestamptz, withdrawal_requested_at timestamptz, withdrawal_completed_at timestamptz,
 evidence_asset_id uuid references public.comun_archive_assets(id) on delete set null, private_notes text, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table public.comun_archive_artwork_safety_reviews(
 id uuid primary key default gen_random_uuid(), archive_item_id uuid not null unique references public.comun_archive_items(id) on delete cascade,
 creator_minor_private boolean not null default false, depicted_minor_private boolean not null default false, identifiable_people_private boolean not null default false,
 appropriate_authorization_confirmed boolean not null default false, sensitive_location_private boolean not null default false,
 reinforced_review_status text not null default 'not_required' check(reinforced_review_status in('not_required','pending','approved','rejected')),
 private_notes text, reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_artwork_submissions(
 id uuid primary key default gen_random_uuid(), archive_item_id uuid references public.comun_archive_items(id) on delete set null,
 member_user_id uuid, public_protocol text not null unique, submission_kind text not null check(submission_kind in('own_work','collective_work','authorized_submission','unknown_authorship','existing_work_complement','credit_correction')),
 title_suggestion text not null, artwork_type text not null, context_suggestion text, territory_id uuid references public.comun_hub_territories(id) on delete set null,
 creator_credit_suggestion text not null, authorship_source text, private_contact text, information_request_public text, next_action_public text,
 status text not null default 'pending' check(status in('pending','information_requested','rights_review','editorial_review','processing','approved','partially_approved','rejected','published','withdrawn','archived')),
 is_author_or_authorized boolean not null default false, information_true_declared boolean not null default false, moderation_understood boolean not null default false,
 correction_withdrawal_understood boolean not null default false, internal_notes text, submitter_hash text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reviewed_at timestamptz
);

create table public.comun_archive_artwork_relations(
 id uuid primary key default gen_random_uuid(), archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
 relation_type text not null check(relation_type in('artwork_documents_pauta','artwork_created_for_action','artwork_related_to_territory','artwork_historical_context','artwork_related_to_project','artwork_used_in_campaign','artwork_related_to_event','artwork_inspired_by_testimony','artwork_future_radio_feature')),
 target_type text not null check(target_type in('archive_item','pauta','project','territory','action','result','report','event','dossier','document','historical_photo','musical_artist','oral_history')),
 target_id uuid not null, public_note text, internal_note text, created_at timestamptz not null default now(), unique(archive_item_id,relation_type,target_type,target_id)
);

create table public.comun_archive_artwork_editorial_versions(
 id uuid primary key default gen_random_uuid(), archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
 version_number integer not null, sanitized_snapshot jsonb not null, change_type text not null, created_by uuid, created_at timestamptz not null default now(),
 unique(archive_item_id,version_number)
);

create index comun_archive_agents_public_idx on public.comun_archive_agents(status,public_visibility,public_name);
create index comun_archive_artworks_public_idx on public.comun_archive_artworks(publication_status,territory_id,artwork_type,created_at desc);
create index comun_archive_artwork_credits_item_idx on public.comun_archive_artwork_credits(archive_item_id,position);
create index comun_archive_artwork_submissions_member_idx on public.comun_archive_artwork_submissions(member_user_id,created_at desc) where member_user_id is not null;
create index comun_archive_artwork_relations_target_idx on public.comun_archive_artwork_relations(target_type,target_id,relation_type);

do $$ declare t text; begin foreach t in array array['comun_archive_agents','comun_archive_artworks','comun_archive_artwork_credits','comun_archive_artwork_rights','comun_archive_artwork_safety_reviews','comun_archive_artwork_submissions','comun_archive_artwork_relations','comun_archive_artwork_editorial_versions'] loop
 execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon,authenticated',t); execute format('grant select,insert,update,delete on public.%I to service_role',t);
end loop; end $$;

create trigger comun_archive_agents_updated_at before update on public.comun_archive_agents for each row execute function public.set_updated_at();
create trigger comun_archive_artworks_updated_at before update on public.comun_archive_artworks for each row execute function public.set_updated_at();
create trigger comun_archive_artwork_rights_updated_at before update on public.comun_archive_artwork_rights for each row execute function public.set_updated_at();
create trigger comun_archive_artwork_safety_reviews_updated_at before update on public.comun_archive_artwork_safety_reviews for each row execute function public.set_updated_at();
create trigger comun_archive_artwork_submissions_updated_at before update on public.comun_archive_artwork_submissions for each row execute function public.set_updated_at();

comment on column public.comun_archive_agents.private_contact is 'Private server-only contact; never expose in public queries.';
comment on column public.comun_archive_agents.member_user_id is 'Private auth linkage; never expose in public HTML.';
comment on column public.comun_archive_artworks.creation_place_private is 'Private precise creation location.';
comment on column public.comun_archive_artwork_rights.private_notes is 'Private rights evidence notes.';
comment on column public.comun_archive_artwork_submissions.private_contact is 'Private contributor contact.';
