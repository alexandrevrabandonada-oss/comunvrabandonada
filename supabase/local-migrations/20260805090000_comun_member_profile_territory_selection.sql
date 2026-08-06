-- Catálogo territorial amplo para onboarding; sem coordenadas e sem exposição pública.
alter table public.comun_member_profiles
  add column if not exists territory_municipality text,
  add column if not exists territory_neighborhood text,
  add column if not exists territory_source_version text;

comment on column public.comun_member_profiles.territory_municipality is
  'Município informado pela pessoa; dado privado e opcional.';
comment on column public.comun_member_profiles.territory_neighborhood is
  'Bairro informado pela pessoa; seleção ampla, não é localização precisa.';
comment on column public.comun_member_profiles.territory_source_version is
  'Versão do catálogo territorial usado no onboarding.';
