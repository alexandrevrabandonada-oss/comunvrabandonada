-- Correção de FKs da Sprint 32.1: sidewalk_record_id deve apontar para comun_sidewalk_records

alter table public.comun_observations drop constraint if exists comun_observations_sidewalk_record_id_fkey;
alter table public.comun_observations drop column if exists sidewalk_record_id;
alter table public.comun_observations add column sidewalk_record_id uuid references public.comun_sidewalk_records(id) on delete set null;

alter table public.comun_mobilization_actions drop constraint if exists comun_mobilization_actions_sidewalk_record_id_fkey;
alter table public.comun_mobilization_actions drop column if exists sidewalk_record_id;
alter table public.comun_mobilization_actions add column sidewalk_record_id uuid references public.comun_sidewalk_records(id) on delete set null;

alter table public.comun_hub_results drop constraint if exists comun_hub_results_sidewalk_record_id_fkey;
alter table public.comun_hub_results drop column if exists sidewalk_record_id;
alter table public.comun_hub_results add column sidewalk_record_id uuid references public.comun_sidewalk_records(id) on delete set null;

alter table public.comun_official_protocols drop constraint if exists comun_official_protocols_sidewalk_record_id_fkey;
alter table public.comun_official_protocols drop column if exists sidewalk_record_id;
alter table public.comun_official_protocols add column sidewalk_record_id uuid references public.comun_sidewalk_records(id) on delete set null;

alter table public.comun_radio_programs drop constraint if exists comun_radio_programs_sidewalk_record_id_fkey;
alter table public.comun_radio_programs drop column if exists sidewalk_record_id;
alter table public.comun_radio_programs add column sidewalk_record_id uuid references public.comun_sidewalk_records(id) on delete set null;

alter table public.comun_radio_episodes drop constraint if exists comun_radio_episodes_sidewalk_record_id_fkey;
alter table public.comun_radio_episodes drop column if exists sidewalk_record_id;
alter table public.comun_radio_episodes add column sidewalk_record_id uuid references public.comun_sidewalk_records(id) on delete set null;
