begin;

do $preflight$
declare
  expected_identities constant text[] := array[
    'public.comun_assisted_forwarding_declare_sent(p_token_hash_hex text, p_attempt_id uuid, p_sent boolean)',
    'public.comun_assisted_forwarding_list(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_assisted_forwarding_open(p_token_hash_hex text, p_package_id uuid, p_channel text)',
    'public.comun_assisted_forwarding_open(p_token_hash_hex text, p_package_id uuid, p_channel text, p_institutional_channel_id text)',
    'public.comun_assisted_forwarding_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_note text, p_official_protocol text, p_resolved boolean)',
    'public.comun_assisted_forwarding_withdraw(p_token_hash_hex text, p_package_id uuid)',
    'public.comun_assisted_wallet_item_category(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_bus_intake_create(p_protocol text, p_receipt_secret text, p_issue_type text, p_line_label text, p_direction text, p_vehicle_order text, p_observed_at timestamp with time zone, p_wait_minutes integer)',
    'public.comun_bus_intake_withdraw(p_protocol text, p_receipt_secret text)',
    'public.comun_civic_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid, p_public_reference text, p_person_authored_summary text, p_preview_confirmed boolean)',
    'public.comun_civic_wallet_item_context(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_claim_search_embedding_jobs(p_limit integer)',
    'public.comun_complete_search_embedding_job(p_job_id bigint, p_content_checksum text, p_model text, p_version text, p_embedding vector)',
    'public.comun_create_solidarity_need_interest_v1(p_request_id uuid, p_need_id uuid, p_member_user_id uuid, p_message_private text, p_contact_private text, p_consent_version text, p_consent_to_contact boolean)',
    'public.comun_create_solidarity_offer_interest_v1(p_request_id uuid, p_offer_id uuid, p_member_user_id uuid, p_message_private text, p_contact_private text, p_consent_version text, p_consent_to_contact boolean)',
    'public.comun_essential_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_essential_wallet_mark_ready(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_fail_search_embedding_job(p_job_id bigint, p_failure_code text)',
    'public.comun_govern_solidarity_organization_access(p_access_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_action text, p_review_note_private text)',
    'public.comun_leave_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid)',
    'public.comun_list_my_solidarity_connections_v1(p_member_user_id uuid)',
    'public.comun_list_my_solidarity_organization_access(p_member_user_id uuid)',
    'public.comun_list_platform_solidarity_organization_access(p_actor_user_id uuid)',
    'public.comun_list_solidarity_organization_connections_v1(p_organization_territory_id uuid, p_actor_user_id uuid)',
    'public.comun_list_solidarity_organization_governance(p_organization_territory_id uuid, p_actor_user_id uuid)',
    'public.comun_participation_wallet_attach_relata(p_token_hash_hex text, p_protocol text, p_receipt_secret text)',
    'public.comun_participation_wallet_claim_bus(p_token_hash_hex text, p_observation_id text, p_metadata jsonb)',
    'public.comun_participation_wallet_create(p_token_hash_hex text, p_recovery_hash_hex text)',
    'public.comun_participation_wallet_follow_case(p_token_hash_hex text, p_public_case_id text, p_category text)',
    'public.comun_participation_wallet_follow_legacy(p_token_hash_hex text, p_protocol text)',
    'public.comun_participation_wallet_link_account(p_token_hash_hex text, p_user_id uuid, p_link_method text)',
    'public.comun_participation_wallet_list(p_token_hash_hex text)',
    'public.comun_participation_wallet_redeem(p_recovery_code_hash_hex text, p_new_token_hash_hex text)',
    'public.comun_participation_wallet_remove_item(p_token_hash_hex text, p_item_id uuid)',
    'public.comun_participation_wallet_revoke_account(p_token_hash_hex text, p_user_id uuid)',
    'public.comun_participation_wallet_rotate_recovery(p_token_hash_hex text, p_new_recovery_hash_hex text, p_new_token_hash_hex text)',
    'public.comun_public_search_hybrid(p_query text, p_type text, p_pauta_id uuid, p_territory_id uuid, p_query_embedding vector, p_limit integer)',
    'public.comun_record_quality_metric(p_metric_name text, p_route_class text, p_device_class text, p_app_version text, p_value_bucket integer, p_rating text)',
    'public.comun_record_search_metric(p_search_kind text, p_outcome text, p_query_size_band text, p_latency_band text, p_confidence_band text, p_model_version text)',
    'public.comun_relata_add_location(p_protocol text, p_receipt_secret text, p_origin text, p_accuracy_class text, p_captured_at timestamp with time zone, p_ciphertext bytea, p_nonce bytea, p_auth_tag bytea, p_key_version text, p_approximate_region text, p_approximation_level text, p_geographic_risk text)',
    'public.comun_relata_associate_collective_for_wallet(p_token_hash_hex text, p_wallet_item_id uuid, p_requested_decision text, p_spatial_keys bytea[], p_window_start timestamp with time zone)',
    'public.comun_relata_authorize_attachment_read(p_protocol text, p_receipt_secret text, p_attachment_id uuid)',
    'public.comun_relata_begin_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_declared_mime_type text, p_declared_size_bucket text)',
    'public.comun_relata_classification_transition(p_protocol text, p_receipt_secret text, p_original_text text, p_category text, p_decision jsonb)',
    'public.comun_relata_collective_connection_for_wallet(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_relata_create(p_idempotency_key text, p_receipt_secret text, p_original_text text, p_answers jsonb, p_category text, p_urgency text, p_rule_version text, p_decision jsonb, p_privacy_class text, p_consent_version text)',
    'public.comun_relata_finalize_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_actual_mime_type text, p_actual_size_bytes bigint, p_derivative_size_bytes bigint, p_width integer, p_height integer, p_checksum_sha256 bytea, p_derivative_checksum_sha256 bytea)',
    'public.comun_relata_get_evidence_state(p_protocol text, p_receipt_secret text)',
    'public.comun_relata_get_receipt(p_protocol text, p_receipt_secret text)',
    'public.comun_relata_mark_attachment_validating(p_protocol text, p_receipt_secret text, p_attachment_id uuid)',
    'public.comun_relata_public_projection_owned_location(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_relata_reject_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_rejection_code text)',
    'public.comun_relata_withdraw(p_protocol text, p_receipt_secret text)',
    'public.comun_relata_withdraw_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid)',
    'public.comun_relata_withdraw_location(p_protocol text, p_receipt_secret text)',
    'public.comun_request_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid, p_request_note_private text)',
    'public.comun_review_solidarity_connection_v1(p_subject_kind text, p_interest_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_decision text)',
    'public.comun_review_solidarity_organization_access(p_access_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_decision text, p_review_note_private text)',
    'public.comun_sensitive_assisted_list(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_sensitive_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid, p_include_issue_type boolean, p_include_unit_label boolean, p_unit_label text, p_include_network_label boolean, p_network_label text, p_include_approximate_period boolean, p_approximate_period text, p_include_person_authored_summary boolean, p_person_authored_summary text, p_authorization_confirmed boolean)',
    'public.comun_sensitive_assisted_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_outcome text, p_response_note text, p_official_protocol text)',
    'public.comun_sensitive_wallet_item_context(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_sidewalk_intake_admin_list(p_intake_id uuid)',
    'public.comun_sidewalk_intake_create(p_protocol text, p_receipt_secret text, p_condition text, p_problems text[], p_affected_groups text[])',
    'public.comun_sidewalk_intake_finalize(p_protocol text, p_receipt_secret text)',
    'public.comun_sidewalk_intake_review(p_intake_id uuid, p_decision text, p_public_summary text, p_public_geometry jsonb)',
    'public.comun_stmu_assisted_declare_sent(p_token_hash_hex text, p_attempt_id uuid, p_sent boolean)',
    'public.comun_stmu_assisted_list(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_stmu_assisted_open(p_token_hash_hex text, p_package_id uuid, p_channel text)',
    'public.comun_stmu_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_stmu_assisted_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_note text, p_official_protocol text, p_resolved boolean)',
    'public.comun_sync_public_search_projection()',
    'public.comun_withdraw_solidarity_connection_v1(p_subject_kind text, p_interest_id uuid, p_member_user_id uuid)',
    'public.comun_withdraw_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid)'
  ];
  actual_identities text[];
begin
  select array_agg('public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' order by p.proname, pg_get_function_identity_arguments(p.oid))
  into actual_identities
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (
      not exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c where c = 'search_path=pg_catalog')
      or exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c where c ~ '(^|,)[[:space:]]*public[[:space:]]*(,|$)')
    );
  if actual_identities is distinct from expected_identities then
    raise exception 'COMUN_SECURITY_HARDENING_V2_PREFLIGHT_IDENTITY_MISMATCH';
  end if;
end
$preflight$;

alter function public.comun_assisted_forwarding_declare_sent(p_token_hash_hex text, p_attempt_id uuid, p_sent boolean) set search_path = pg_catalog;
alter function public.comun_assisted_forwarding_list(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_assisted_forwarding_open(p_token_hash_hex text, p_package_id uuid, p_channel text) set search_path = pg_catalog;
alter function public.comun_assisted_forwarding_open(p_token_hash_hex text, p_package_id uuid, p_channel text, p_institutional_channel_id text) set search_path = pg_catalog;
alter function public.comun_assisted_forwarding_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_note text, p_official_protocol text, p_resolved boolean) set search_path = pg_catalog;
alter function public.comun_assisted_forwarding_withdraw(p_token_hash_hex text, p_package_id uuid) set search_path = pg_catalog;
alter function public.comun_assisted_wallet_item_category(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_bus_intake_create(p_protocol text, p_receipt_secret text, p_issue_type text, p_line_label text, p_direction text, p_vehicle_order text, p_observed_at timestamp with time zone, p_wait_minutes integer) set search_path = pg_catalog;
alter function public.comun_bus_intake_withdraw(p_protocol text, p_receipt_secret text) set search_path = pg_catalog;
alter function public.comun_civic_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid, p_public_reference text, p_person_authored_summary text, p_preview_confirmed boolean) set search_path = pg_catalog;
alter function public.comun_civic_wallet_item_context(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_claim_search_embedding_jobs(p_limit integer) set search_path = pg_catalog;
alter function public.comun_complete_search_embedding_job(p_job_id bigint, p_content_checksum text, p_model text, p_version text, p_embedding vector) set search_path = pg_catalog;
alter function public.comun_create_solidarity_need_interest_v1(p_request_id uuid, p_need_id uuid, p_member_user_id uuid, p_message_private text, p_contact_private text, p_consent_version text, p_consent_to_contact boolean) set search_path = pg_catalog;
alter function public.comun_create_solidarity_offer_interest_v1(p_request_id uuid, p_offer_id uuid, p_member_user_id uuid, p_message_private text, p_contact_private text, p_consent_version text, p_consent_to_contact boolean) set search_path = pg_catalog;
alter function public.comun_essential_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_essential_wallet_mark_ready(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_fail_search_embedding_job(p_job_id bigint, p_failure_code text) set search_path = pg_catalog;
alter function public.comun_govern_solidarity_organization_access(p_access_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_action text, p_review_note_private text) set search_path = pg_catalog;
alter function public.comun_leave_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid) set search_path = pg_catalog;
alter function public.comun_list_my_solidarity_connections_v1(p_member_user_id uuid) set search_path = pg_catalog;
alter function public.comun_list_my_solidarity_organization_access(p_member_user_id uuid) set search_path = pg_catalog;
alter function public.comun_list_platform_solidarity_organization_access(p_actor_user_id uuid) set search_path = pg_catalog;
alter function public.comun_list_solidarity_organization_connections_v1(p_organization_territory_id uuid, p_actor_user_id uuid) set search_path = pg_catalog;
alter function public.comun_list_solidarity_organization_governance(p_organization_territory_id uuid, p_actor_user_id uuid) set search_path = pg_catalog;
alter function public.comun_participation_wallet_attach_relata(p_token_hash_hex text, p_protocol text, p_receipt_secret text) set search_path = pg_catalog;
alter function public.comun_participation_wallet_claim_bus(p_token_hash_hex text, p_observation_id text, p_metadata jsonb) set search_path = pg_catalog;
alter function public.comun_participation_wallet_create(p_token_hash_hex text, p_recovery_hash_hex text) set search_path = pg_catalog;
alter function public.comun_participation_wallet_follow_case(p_token_hash_hex text, p_public_case_id text, p_category text) set search_path = pg_catalog;
alter function public.comun_participation_wallet_follow_legacy(p_token_hash_hex text, p_protocol text) set search_path = pg_catalog;
alter function public.comun_participation_wallet_link_account(p_token_hash_hex text, p_user_id uuid, p_link_method text) set search_path = pg_catalog;
alter function public.comun_participation_wallet_list(p_token_hash_hex text) set search_path = pg_catalog;
alter function public.comun_participation_wallet_redeem(p_recovery_code_hash_hex text, p_new_token_hash_hex text) set search_path = pg_catalog;
alter function public.comun_participation_wallet_remove_item(p_token_hash_hex text, p_item_id uuid) set search_path = pg_catalog;
alter function public.comun_participation_wallet_revoke_account(p_token_hash_hex text, p_user_id uuid) set search_path = pg_catalog;
alter function public.comun_participation_wallet_rotate_recovery(p_token_hash_hex text, p_new_recovery_hash_hex text, p_new_token_hash_hex text) set search_path = pg_catalog;
CREATE OR REPLACE FUNCTION public.comun_public_search_hybrid(p_query text, p_type text DEFAULT NULL::text, p_pauta_id uuid DEFAULT NULL::uuid, p_territory_id uuid DEFAULT NULL::uuid, p_query_embedding vector DEFAULT NULL::vector, p_limit integer DEFAULT 20)
 RETURNS TABLE(type text, title text, summary text, href text, origin text, updated_at timestamp with time zone, match_reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  with input as (
    select left(trim(coalesce(p_query, '')), 120) q,
      lower(extensions.unaccent(left(trim(coalesce(p_query, '')), 120))) normalized,
      websearch_to_tsquery('public.comun_portuguese_unaccent', left(trim(coalesce(p_query, '')), 120)) tsq,
      least(greatest(coalesce(p_limit, 20), 1), 50) lim
  ), candidates as (
    select d.*,
      lower(extensions.unaccent(d.title)) = i.normalized as exact_match,
      lower(extensions.unaccent(d.title)) like i.normalized || '%' as prefix_match,
      d.search_vector @@ i.tsq as fts_match,
      ts_rank_cd(d.search_vector, i.tsq, 32) as lexical_rank,
      extensions.similarity(lower(extensions.unaccent(d.title)), i.normalized) as typo_rank,
      case when p_query_embedding is null then null else (
        select min(s.embedding OPERATOR(extensions.<=>) p_query_embedding)
        from public.comun_search_sections s where s.document_id = d.id and s.embedding is not null
      ) end as semantic_distance
    from public.comun_search_documents d cross join input i
    where d.visibility = 'public_projection' and d.permission_scope = 'public'
      and (p_type is null or d.source_type = p_type)
      and (p_pauta_id is null or d.pauta_id = p_pauta_id)
      and (p_territory_id is null or d.territory_id = p_territory_id)
      and (i.q <> '' and (
        d.search_vector @@ i.tsq
        or lower(extensions.unaccent(d.title)) like '%' || i.normalized || '%'
        or extensions.similarity(lower(extensions.unaccent(d.title)), i.normalized) >= 0.28
        or (p_query_embedding is not null and exists (
          select 1 from public.comun_search_sections s
          where s.document_id = d.id and s.embedding is not null and s.embedding OPERATOR(extensions.<=>) p_query_embedding < 0.38
        ))
      ))
  ), ranked as (
    select c.*,
      row_number() over (order by exact_match desc, prefix_match desc, lexical_rank desc, typo_rank desc, source_date desc nulls last) lexical_position,
      case when semantic_distance is null then null else row_number() over (order by semantic_distance asc nulls last) end semantic_position
    from candidates c
  )
  select r.source_type, r.title, r.summary, r.canonical_route, initcap(r.domain), r.source_date,
    case
      when r.exact_match then 'correspondência exata'
      when r.prefix_match then 'título correspondente'
      when p_pauta_id is not null and r.pauta_id = p_pauta_id then 'mesma pauta'
      when p_territory_id is not null and r.territory_id = p_territory_id then 'mesmo território'
      when r.fts_match then 'termos relacionados'
      when r.semantic_distance is not null then 'relacionado pelo significado'
      else 'grafia aproximada'
    end
  from ranked r cross join input i
  order by
    r.exact_match desc,
    (1.0 / (60 + r.lexical_position) + coalesce(1.0 / (60 + r.semantic_position), 0)) desc,
    r.source_date desc nulls last, r.title
  limit (select lim from input)
$function$;
alter function public.comun_record_quality_metric(p_metric_name text, p_route_class text, p_device_class text, p_app_version text, p_value_bucket integer, p_rating text) set search_path = pg_catalog;
alter function public.comun_record_search_metric(p_search_kind text, p_outcome text, p_query_size_band text, p_latency_band text, p_confidence_band text, p_model_version text) set search_path = pg_catalog;
alter function public.comun_relata_add_location(p_protocol text, p_receipt_secret text, p_origin text, p_accuracy_class text, p_captured_at timestamp with time zone, p_ciphertext bytea, p_nonce bytea, p_auth_tag bytea, p_key_version text, p_approximate_region text, p_approximation_level text, p_geographic_risk text) set search_path = pg_catalog;
alter function public.comun_relata_associate_collective_for_wallet(p_token_hash_hex text, p_wallet_item_id uuid, p_requested_decision text, p_spatial_keys bytea[], p_window_start timestamp with time zone) set search_path = pg_catalog;
alter function public.comun_relata_authorize_attachment_read(p_protocol text, p_receipt_secret text, p_attachment_id uuid) set search_path = pg_catalog;
alter function public.comun_relata_begin_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_declared_mime_type text, p_declared_size_bucket text) set search_path = pg_catalog;
alter function public.comun_relata_classification_transition(p_protocol text, p_receipt_secret text, p_original_text text, p_category text, p_decision jsonb) set search_path = pg_catalog;
alter function public.comun_relata_collective_connection_for_wallet(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_relata_create(p_idempotency_key text, p_receipt_secret text, p_original_text text, p_answers jsonb, p_category text, p_urgency text, p_rule_version text, p_decision jsonb, p_privacy_class text, p_consent_version text) set search_path = pg_catalog;
alter function public.comun_relata_finalize_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_actual_mime_type text, p_actual_size_bytes bigint, p_derivative_size_bytes bigint, p_width integer, p_height integer, p_checksum_sha256 bytea, p_derivative_checksum_sha256 bytea) set search_path = pg_catalog;
alter function public.comun_relata_get_evidence_state(p_protocol text, p_receipt_secret text) set search_path = pg_catalog;
alter function public.comun_relata_get_receipt(p_protocol text, p_receipt_secret text) set search_path = pg_catalog;
alter function public.comun_relata_mark_attachment_validating(p_protocol text, p_receipt_secret text, p_attachment_id uuid) set search_path = pg_catalog;
alter function public.comun_relata_public_projection_owned_location(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_relata_reject_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_rejection_code text) set search_path = pg_catalog;
alter function public.comun_relata_withdraw(p_protocol text, p_receipt_secret text) set search_path = pg_catalog;
alter function public.comun_relata_withdraw_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid) set search_path = pg_catalog;
alter function public.comun_relata_withdraw_location(p_protocol text, p_receipt_secret text) set search_path = pg_catalog;
alter function public.comun_request_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid, p_request_note_private text) set search_path = pg_catalog;
alter function public.comun_review_solidarity_connection_v1(p_subject_kind text, p_interest_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_decision text) set search_path = pg_catalog;
alter function public.comun_review_solidarity_organization_access(p_access_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_decision text, p_review_note_private text) set search_path = pg_catalog;
alter function public.comun_sensitive_assisted_list(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_sensitive_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid, p_include_issue_type boolean, p_include_unit_label boolean, p_unit_label text, p_include_network_label boolean, p_network_label text, p_include_approximate_period boolean, p_approximate_period text, p_include_person_authored_summary boolean, p_person_authored_summary text, p_authorization_confirmed boolean) set search_path = pg_catalog;
alter function public.comun_sensitive_assisted_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_outcome text, p_response_note text, p_official_protocol text) set search_path = pg_catalog;
alter function public.comun_sensitive_wallet_item_context(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_sidewalk_intake_admin_list(p_intake_id uuid) set search_path = pg_catalog;
alter function public.comun_sidewalk_intake_create(p_protocol text, p_receipt_secret text, p_condition text, p_problems text[], p_affected_groups text[]) set search_path = pg_catalog;
alter function public.comun_sidewalk_intake_finalize(p_protocol text, p_receipt_secret text) set search_path = pg_catalog;
alter function public.comun_sidewalk_intake_review(p_intake_id uuid, p_decision text, p_public_summary text, p_public_geometry jsonb) set search_path = pg_catalog;
alter function public.comun_stmu_assisted_declare_sent(p_token_hash_hex text, p_attempt_id uuid, p_sent boolean) set search_path = pg_catalog;
alter function public.comun_stmu_assisted_list(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_stmu_assisted_open(p_token_hash_hex text, p_package_id uuid, p_channel text) set search_path = pg_catalog;
alter function public.comun_stmu_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid) set search_path = pg_catalog;
alter function public.comun_stmu_assisted_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_note text, p_official_protocol text, p_resolved boolean) set search_path = pg_catalog;
alter function public.comun_sync_public_search_projection() set search_path = pg_catalog;
alter function public.comun_withdraw_solidarity_connection_v1(p_subject_kind text, p_interest_id uuid, p_member_user_id uuid) set search_path = pg_catalog;
alter function public.comun_withdraw_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid) set search_path = pg_catalog;

do $postflight$
declare
  expected_identities constant text[] := array[
    'public.comun_assisted_forwarding_declare_sent(p_token_hash_hex text, p_attempt_id uuid, p_sent boolean)',
    'public.comun_assisted_forwarding_list(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_assisted_forwarding_open(p_token_hash_hex text, p_package_id uuid, p_channel text)',
    'public.comun_assisted_forwarding_open(p_token_hash_hex text, p_package_id uuid, p_channel text, p_institutional_channel_id text)',
    'public.comun_assisted_forwarding_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_note text, p_official_protocol text, p_resolved boolean)',
    'public.comun_assisted_forwarding_withdraw(p_token_hash_hex text, p_package_id uuid)',
    'public.comun_assisted_wallet_item_category(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_bus_intake_create(p_protocol text, p_receipt_secret text, p_issue_type text, p_line_label text, p_direction text, p_vehicle_order text, p_observed_at timestamp with time zone, p_wait_minutes integer)',
    'public.comun_bus_intake_withdraw(p_protocol text, p_receipt_secret text)',
    'public.comun_civic_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid, p_public_reference text, p_person_authored_summary text, p_preview_confirmed boolean)',
    'public.comun_civic_wallet_item_context(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_claim_search_embedding_jobs(p_limit integer)',
    'public.comun_complete_search_embedding_job(p_job_id bigint, p_content_checksum text, p_model text, p_version text, p_embedding vector)',
    'public.comun_create_solidarity_need_interest_v1(p_request_id uuid, p_need_id uuid, p_member_user_id uuid, p_message_private text, p_contact_private text, p_consent_version text, p_consent_to_contact boolean)',
    'public.comun_create_solidarity_offer_interest_v1(p_request_id uuid, p_offer_id uuid, p_member_user_id uuid, p_message_private text, p_contact_private text, p_consent_version text, p_consent_to_contact boolean)',
    'public.comun_essential_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_essential_wallet_mark_ready(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_fail_search_embedding_job(p_job_id bigint, p_failure_code text)',
    'public.comun_govern_solidarity_organization_access(p_access_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_action text, p_review_note_private text)',
    'public.comun_leave_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid)',
    'public.comun_list_my_solidarity_connections_v1(p_member_user_id uuid)',
    'public.comun_list_my_solidarity_organization_access(p_member_user_id uuid)',
    'public.comun_list_platform_solidarity_organization_access(p_actor_user_id uuid)',
    'public.comun_list_solidarity_organization_connections_v1(p_organization_territory_id uuid, p_actor_user_id uuid)',
    'public.comun_list_solidarity_organization_governance(p_organization_territory_id uuid, p_actor_user_id uuid)',
    'public.comun_participation_wallet_attach_relata(p_token_hash_hex text, p_protocol text, p_receipt_secret text)',
    'public.comun_participation_wallet_claim_bus(p_token_hash_hex text, p_observation_id text, p_metadata jsonb)',
    'public.comun_participation_wallet_create(p_token_hash_hex text, p_recovery_hash_hex text)',
    'public.comun_participation_wallet_follow_case(p_token_hash_hex text, p_public_case_id text, p_category text)',
    'public.comun_participation_wallet_follow_legacy(p_token_hash_hex text, p_protocol text)',
    'public.comun_participation_wallet_link_account(p_token_hash_hex text, p_user_id uuid, p_link_method text)',
    'public.comun_participation_wallet_list(p_token_hash_hex text)',
    'public.comun_participation_wallet_redeem(p_recovery_code_hash_hex text, p_new_token_hash_hex text)',
    'public.comun_participation_wallet_remove_item(p_token_hash_hex text, p_item_id uuid)',
    'public.comun_participation_wallet_revoke_account(p_token_hash_hex text, p_user_id uuid)',
    'public.comun_participation_wallet_rotate_recovery(p_token_hash_hex text, p_new_recovery_hash_hex text, p_new_token_hash_hex text)',
    'public.comun_public_search_hybrid(p_query text, p_type text, p_pauta_id uuid, p_territory_id uuid, p_query_embedding vector, p_limit integer)',
    'public.comun_record_quality_metric(p_metric_name text, p_route_class text, p_device_class text, p_app_version text, p_value_bucket integer, p_rating text)',
    'public.comun_record_search_metric(p_search_kind text, p_outcome text, p_query_size_band text, p_latency_band text, p_confidence_band text, p_model_version text)',
    'public.comun_relata_add_location(p_protocol text, p_receipt_secret text, p_origin text, p_accuracy_class text, p_captured_at timestamp with time zone, p_ciphertext bytea, p_nonce bytea, p_auth_tag bytea, p_key_version text, p_approximate_region text, p_approximation_level text, p_geographic_risk text)',
    'public.comun_relata_associate_collective_for_wallet(p_token_hash_hex text, p_wallet_item_id uuid, p_requested_decision text, p_spatial_keys bytea[], p_window_start timestamp with time zone)',
    'public.comun_relata_authorize_attachment_read(p_protocol text, p_receipt_secret text, p_attachment_id uuid)',
    'public.comun_relata_begin_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_declared_mime_type text, p_declared_size_bucket text)',
    'public.comun_relata_classification_transition(p_protocol text, p_receipt_secret text, p_original_text text, p_category text, p_decision jsonb)',
    'public.comun_relata_collective_connection_for_wallet(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_relata_create(p_idempotency_key text, p_receipt_secret text, p_original_text text, p_answers jsonb, p_category text, p_urgency text, p_rule_version text, p_decision jsonb, p_privacy_class text, p_consent_version text)',
    'public.comun_relata_finalize_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_actual_mime_type text, p_actual_size_bytes bigint, p_derivative_size_bytes bigint, p_width integer, p_height integer, p_checksum_sha256 bytea, p_derivative_checksum_sha256 bytea)',
    'public.comun_relata_get_evidence_state(p_protocol text, p_receipt_secret text)',
    'public.comun_relata_get_receipt(p_protocol text, p_receipt_secret text)',
    'public.comun_relata_mark_attachment_validating(p_protocol text, p_receipt_secret text, p_attachment_id uuid)',
    'public.comun_relata_public_projection_owned_location(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_relata_reject_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid, p_rejection_code text)',
    'public.comun_relata_withdraw(p_protocol text, p_receipt_secret text)',
    'public.comun_relata_withdraw_attachment(p_protocol text, p_receipt_secret text, p_attachment_id uuid)',
    'public.comun_relata_withdraw_location(p_protocol text, p_receipt_secret text)',
    'public.comun_request_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid, p_request_note_private text)',
    'public.comun_review_solidarity_connection_v1(p_subject_kind text, p_interest_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_decision text)',
    'public.comun_review_solidarity_organization_access(p_access_id uuid, p_expected_organization_territory_id uuid, p_actor_user_id uuid, p_decision text, p_review_note_private text)',
    'public.comun_sensitive_assisted_list(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_sensitive_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid, p_include_issue_type boolean, p_include_unit_label boolean, p_unit_label text, p_include_network_label boolean, p_network_label text, p_include_approximate_period boolean, p_approximate_period text, p_include_person_authored_summary boolean, p_person_authored_summary text, p_authorization_confirmed boolean)',
    'public.comun_sensitive_assisted_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_outcome text, p_response_note text, p_official_protocol text)',
    'public.comun_sensitive_wallet_item_context(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_sidewalk_intake_admin_list(p_intake_id uuid)',
    'public.comun_sidewalk_intake_create(p_protocol text, p_receipt_secret text, p_condition text, p_problems text[], p_affected_groups text[])',
    'public.comun_sidewalk_intake_finalize(p_protocol text, p_receipt_secret text)',
    'public.comun_sidewalk_intake_review(p_intake_id uuid, p_decision text, p_public_summary text, p_public_geometry jsonb)',
    'public.comun_stmu_assisted_declare_sent(p_token_hash_hex text, p_attempt_id uuid, p_sent boolean)',
    'public.comun_stmu_assisted_list(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_stmu_assisted_open(p_token_hash_hex text, p_package_id uuid, p_channel text)',
    'public.comun_stmu_assisted_prepare(p_token_hash_hex text, p_wallet_item_id uuid)',
    'public.comun_stmu_assisted_record_response(p_token_hash_hex text, p_attempt_id uuid, p_response_note text, p_official_protocol text, p_resolved boolean)',
    'public.comun_sync_public_search_projection()',
    'public.comun_withdraw_solidarity_connection_v1(p_subject_kind text, p_interest_id uuid, p_member_user_id uuid)',
    'public.comun_withdraw_solidarity_organization_access(p_organization_territory_id uuid, p_member_user_id uuid)'
  ];
  hardened_count integer;
  remaining_count integer;
begin
  select count(*) into hardened_count
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' = any(expected_identities)
    and p.prosecdef and p.proconfig = array['search_path=pg_catalog'];
  select count(*) into remaining_count
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef and (
    not exists(select 1 from unnest(coalesce(p.proconfig,array[]::text[])) c where c='search_path=pg_catalog')
    or exists(select 1 from unnest(coalesce(p.proconfig,array[]::text[])) c where c ~ '(^|,)[[:space:]]*public[[:space:]]*(,|$)')
  );
  if hardened_count <> cardinality(expected_identities) or remaining_count <> 0 then
    raise exception 'COMUN_SECURITY_HARDENING_V2_POSTFLIGHT_FAILED';
  end if;
end
$postflight$;

do $ledger$
declare
  expected_path constant text := 'supabase/migrations/20260922120000_comun_canonical_security_hardening_v2.sql';
  expected_sha text := pg_catalog.current_setting('comun.release_sha256', true);
  expected_pre text := pg_catalog.current_setting('comun.release_pre_fingerprint', true);
  expected_post text := pg_catalog.current_setting('comun.release_post_fingerprint', true);
  existing public.comun_schema_releases%rowtype;
begin
  if expected_sha is null or expected_sha = '' then expected_sha := 'LOCAL_VALIDATION'; end if;
  if expected_pre is null or expected_pre = '' then expected_pre := 'LOCAL_VALIDATION'; end if;
  if expected_post is null or expected_post = '' then expected_post := 'LOCAL_VALIDATION'; end if;
  select * into existing from public.comun_schema_releases where release='20260922120000-canonical-security-hardening-v2';
  if found then
    if existing.migration_path<>expected_path or existing.migration_sha256<>expected_sha or existing.pre_fingerprint<>expected_pre or existing.post_fingerprint<>expected_post or existing.status<>'applied' then
      raise exception 'COMUN_SCHEMA_RELEASE_LEDGER_DIVERGENCE';
    end if;
  else
    insert into public.comun_schema_releases(release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status)
    values('20260922120000-canonical-security-hardening-v2',expected_path,expected_sha,expected_pre,expected_post,'applied');
  end if;
end
$ledger$;

commit;
