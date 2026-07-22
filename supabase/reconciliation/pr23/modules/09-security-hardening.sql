-- Índice revisável do domínio; DDL preservado em 02-foundations.sql para não quebrar dependências.
-- Objetos auditados (100):
-- - public.comun_actions
-- - public.comun_admin_alerts
-- - public.comun_admin_audit_log
-- - public.comun_admin_notifications
-- - public.comun_admin_users
-- - public.comun_archive_agents
-- - public.comun_archive_asset_custody_events
-- - public.comun_archive_assets
-- - public.comun_archive_collection_items
-- - public.comun_archive_collections
-- - public.comun_archive_consent_legal_reviews
-- - public.comun_archive_consent_templates
-- - public.comun_archive_external_links
-- - public.comun_archive_identification_campaigns
-- - public.comun_archive_identification_items
-- - public.comun_archive_identification_reports
-- - public.comun_archive_identification_summaries
-- - public.comun_archive_item_suggestions
-- - public.comun_archive_items
-- - public.comun_archive_link_checks
-- - public.comun_archive_music_releases
-- - public.comun_archive_music_rights_reviews
-- - public.comun_archive_music_tracks
-- - public.comun_archive_oral_histories
-- - public.comun_archive_oral_history_consent_sessions
-- - public.comun_archive_oral_history_consents
-- - public.comun_archive_oral_history_interview_plans
-- - public.comun_archive_oral_history_participant_approvals
-- - public.comun_archive_oral_history_participants
-- - public.comun_archive_oral_history_segments
-- - public.comun_archive_oral_history_suggestions
-- - public.comun_archive_oral_history_third_party_statements
-- - public.comun_archive_oral_history_transcript_versions
-- - public.comun_archive_oral_history_transcription_work
-- - public.comun_archive_oral_history_withdrawals
-- - public.comun_archive_processing_attempts
-- - public.comun_archive_processing_events
-- - public.comun_archive_processing_jobs
-- - public.comun_archive_relations
-- - public.comun_archive_rights_removal_requests
-- - public.comun_archive_storage_uploads
-- - public.comun_archive_submission_assets
-- - public.comun_archive_submissions
-- - public.comun_archive_worker_heartbeats
-- - public.comun_collection_route_materials
-- - public.comun_collection_routes
-- - public.comun_communities
-- - public.comun_dossiers
-- - public.comun_hub_archive_links
-- - public.comun_hub_communication_materials
-- - public.comun_hub_participation_interests
-- - public.comun_hub_projects
-- - public.comun_hub_results
-- - public.comun_hub_territories
-- - public.comun_issues
-- - public.comun_metric_definitions
-- - public.comun_metric_snapshots
-- - public.comun_mobilization_actions
-- - public.comun_monitored_entities
-- - public.comun_observation_campaign_access_grants
-- - public.comun_observation_campaign_assignments
-- - public.comun_observation_campaign_evidence_links
-- - public.comun_observation_campaign_field_diaries
-- - public.comun_observation_campaign_field_sessions
-- - public.comun_observation_campaign_reports
-- - public.comun_observation_campaigns
-- - public.comun_observation_field_corrections
-- - public.comun_observation_form_versions
-- - public.comun_observation_quality_reviews
-- - public.comun_observation_sampling_plans
-- - public.comun_observation_sampling_slots
-- - public.comun_observation_verification_events
-- - public.comun_observations
-- - public.comun_observatories
-- - public.comun_observatory_action_links
-- - public.comun_observatory_methodologies
-- - public.comun_observatory_reports
-- - public.comun_official_protocols
-- - public.comun_public_dossier_features
-- - public.comun_public_lookup_events
-- - public.comun_public_reports
-- - public.comun_recycling_materials
-- - public.comun_recycling_point_materials
-- - public.comun_recycling_points
-- - public.comun_report_attachments
-- - public.comun_reports
-- - public.comun_system_verification_runs
-- - public.comun_territorial_contributions
-- - public.comun_territorial_layers
-- - public.comun_territorial_need_interests
-- - public.comun_territorial_needs
-- - public.comun_territorial_organization_materials
-- - public.comun_territorial_organizations
-- - public.comun_territorial_ownership_assertions
-- - public.comun_territorial_properties
-- - public.comun_territorial_social_use_proposals
-- - public.comun_territorial_sources
-- - public.comun_territory_layers
-- - public.comun_transport_lines
-- - public.comun_transport_stops

-- Remover privilégios auxiliares herdados dos default privileges legados,
-- sem alterar SELECT/INSERT/UPDATE/DELETE definidos pela matriz canônica.
do $$
declare target record;
begin
  for target in select format('%I.%I', n.nspname, c.relname) as qualified_name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') loop
    execute format('revoke maintain, references, trigger, truncate on table %s from anon, authenticated', target.qualified_name);
  end loop;
end $$;

revoke all privileges on table public.comun_sidewalk_uploads, public.comun_sidewalk_forwardings, public.comun_editorial_operation_items, public.comun_community_role_assignments from public, anon, authenticated;
grant select on table public.comun_sidewalk_uploads, public.comun_community_role_assignments to authenticated;
grant select, insert, update, delete, truncate, references, trigger on table public.comun_sidewalk_uploads, public.comun_sidewalk_forwardings, public.comun_editorial_operation_items, public.comun_community_role_assignments to service_role;
revoke all privileges on function public.set_updated_at(), public.set_comun_official_protocols_updated_at() from anon, authenticated, service_role;

-- Drift remoto preservado temporariamente, mas não exposto.
do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    revoke all privileges on function public.handle_new_user() from public, anon, authenticated;
    grant execute on function public.handle_new_user() to service_role;
  end if;
end $$;
