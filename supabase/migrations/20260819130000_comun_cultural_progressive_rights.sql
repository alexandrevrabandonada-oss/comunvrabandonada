-- A4: typed, progressive declarations on the specialized contribution envelopes.
-- Existing rows remain incomplete and are never reinterpreted by this migration.
alter table public.comun_archive_submissions
  add column rights_basis text not null default 'not_declared'
    check (rights_basis in ('not_declared','own_creation','authorized_by_rightsholder','public_official_material','historical_unknown','third_party_unverified')),
  add column publication_scope text not null default 'review_only'
    check (publication_scope in ('review_only','comun_display','comun_display_and_reuse')),
  add column reuse_permission text not null default 'not_defined'
    check (reuse_permission in ('not_defined','comun_only','licensed_reuse')),
  add column license_code text
    check (license_code is null or license_code in ('not_defined','none','cc_by_4_0','cc_by_sa_4_0','external_license')),
  add column rights_state text not null default 'rights_incomplete'
    check (rights_state in ('rights_incomplete','rights_declared','rights_review_required','rights_approved')),
  add column rights_contract_version text,
  add column rights_declared_at timestamptz;

alter table public.comun_archive_artwork_submissions
  add column authorship_basis text not null default 'not_declared'
    check (authorship_basis in ('not_declared','uploader_creator','collective_representative','authorized_by_creator','unknown')),
  add column publication_scope text not null default 'review_only'
    check (publication_scope in ('review_only','comun_display','comun_display_and_reuse')),
  add column reuse_permission text not null default 'not_defined'
    check (reuse_permission in ('not_defined','comun_only','licensed_reuse')),
  add column license_code text
    check (license_code is null or license_code in ('not_defined','none','cc_by_4_0','cc_by_sa_4_0','external_license')),
  add column identity_preference text not null default 'not_declared'
    check (identity_preference in ('not_declared','anonymous','public_credit','artistic_name','collective')),
  add column rights_state text not null default 'rights_incomplete'
    check (rights_state in ('rights_incomplete','rights_declared','rights_review_required','rights_approved')),
  add column rights_contract_version text,
  add column rights_declared_at timestamptz;

alter table public.comun_radio_contributions
  add column voice_source text not null default 'not_declared'
    check (voice_source in ('not_declared','no_voice','submitter_voice','third_party_voice','unknown')),
  add column material_source text not null default 'not_declared'
    check (material_source in ('not_declared','original_text','authorized_third_party','third_party_unverified','unknown')),
  add column publication_scope text not null default 'review_only'
    check (publication_scope in ('review_only','comun_audio','comun_audio_and_reuse')),
  add column reuse_permission text not null default 'not_defined'
    check (reuse_permission in ('not_defined','comun_only','licensed_reuse')),
  add column license_code text
    check (license_code is null or license_code in ('not_defined','none','cc_by_4_0','cc_by_sa_4_0','external_license')),
  add column identity_preference text not null default 'not_declared'
    check (identity_preference in ('not_declared','anonymous','public_credit','artistic_name','collective')),
  add column rights_state text not null default 'rights_incomplete'
    check (rights_state in ('rights_incomplete','rights_declared','rights_review_required','rights_approved')),
  add column rights_contract_version text,
  add column rights_declared_at timestamptz;

alter table public.comun_archive_submissions
  add constraint comun_archive_submissions_a4_license_check
  check (reuse_permission <> 'licensed_reuse' or (license_code is not null and license_code not in ('not_defined','none')));
alter table public.comun_archive_artwork_submissions
  add constraint comun_archive_artwork_submissions_a4_license_check
  check (reuse_permission <> 'licensed_reuse' or (license_code is not null and license_code not in ('not_defined','none')));
alter table public.comun_radio_contributions
  add constraint comun_radio_contributions_a4_license_check
  check (reuse_permission <> 'licensed_reuse' or (license_code is not null and license_code not in ('not_defined','none')));

comment on column public.comun_archive_submissions.rights_basis is 'Typed provenance declaration. It never proves ownership or publication by itself.';
comment on column public.comun_archive_artwork_submissions.authorship_basis is 'Typed authorship relationship; uploader identity is not inferred as authorship.';
comment on column public.comun_radio_contributions.material_source is 'Third-party material remains rights-review-required until the specialized radio workflow resolves it.';

revoke all on public.comun_archive_submissions, public.comun_archive_artwork_submissions, public.comun_radio_contributions from anon, authenticated;
grant select, insert, update, delete on public.comun_archive_submissions, public.comun_archive_artwork_submissions, public.comun_radio_contributions to service_role;
