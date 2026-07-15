alter table public.comun_member_profiles
  add column onboarding_completed_at timestamptz,
  add column terms_version text,
  add column terms_accepted_at timestamptz,
  add column privacy_version text,
  add column privacy_accepted_at timestamptz,
  add column profile_visibility text not null default 'private' check(profile_visibility in('private','pauta_members','public')),
  add column suspension_reason_private text;

alter table public.comun_member_profiles
  drop constraint if exists comun_member_profiles_status_check,
  add constraint comun_member_profiles_status_check check(status in('active','suspended','deactivation_requested','deactivated','archived'));
