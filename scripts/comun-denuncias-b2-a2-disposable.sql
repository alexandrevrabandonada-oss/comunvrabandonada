-- COMUN 48.6-B2-A2 disposable proof.
-- All rows below live in one transaction and are rolled back before the
-- postcondition. This script never reads or writes a Production database.
begin;

do $$
declare
  v_a_wallet uuid := '51000000-0000-0000-0000-000000000001';
  v_a_report uuid := '52000000-0000-0000-0000-000000000001';
  v_a_case uuid := '53000000-0000-0000-0000-000000000001';
  v_a_item uuid := '54000000-0000-0000-0000-000000000001';
  v_a_token text := encode(extensions.digest('b2-a-wallet', 'sha256'), 'hex');
  v_b_wallet uuid := '51000000-0000-0000-0000-000000000002';
  v_b_report uuid := '52000000-0000-0000-0000-000000000002';
  v_b_case uuid := '53000000-0000-0000-0000-000000000002';
  v_b_item uuid := '54000000-0000-0000-0000-000000000002';
  v_b_token text := encode(extensions.digest('b2-b-wallet', 'sha256'), 'hex');
  v_c_wallet uuid := '51000000-0000-0000-0000-000000000003';
  v_c_report uuid := '52000000-0000-0000-0000-000000000003';
  v_c_case uuid := '53000000-0000-0000-0000-000000000003';
  v_c_item uuid := '54000000-0000-0000-0000-000000000003';
  v_c_token text := encode(extensions.digest('b2-c-wallet', 'sha256'), 'hex');
  v_p1_wallet uuid := '51000000-0000-0000-0000-000000000011';
  v_p1_report uuid := '52000000-0000-0000-0000-000000000011';
  v_p1_case uuid := '53000000-0000-0000-0000-000000000011';
  v_p1_item uuid := '54000000-0000-0000-0000-000000000011';
  v_p1_token text := encode(extensions.digest('b2-p1-wallet', 'sha256'), 'hex');
  v_p2_wallet uuid := '51000000-0000-0000-0000-000000000012';
  v_p2_report uuid := '52000000-0000-0000-0000-000000000012';
  v_p2_case uuid := '53000000-0000-0000-0000-000000000012';
  v_p2_item uuid := '54000000-0000-0000-0000-000000000012';
  v_p2_token text := encode(extensions.digest('b2-p2-wallet', 'sha256'), 'hex');
  v_health_wallet uuid := '51000000-0000-0000-0000-000000000099';
  v_health_report uuid := '52000000-0000-0000-0000-000000000099';
  v_health_case uuid := '53000000-0000-0000-0000-000000000099';
  v_health_item uuid := '54000000-0000-0000-0000-000000000099';
  v_health_token text := encode(extensions.digest('b2-health-wallet', 'sha256'), 'hex');
  v_result record;
  v_collective uuid;
  v_keys bytea[] := array_fill(decode(repeat('aa', 32), 'hex'), ARRAY[9]);
  v_other_keys bytea[] := array_fill(decode(repeat('cc', 32), 'hex'), ARRAY[9]);
  v_power_keys bytea[] := array_fill(decode(repeat('dd', 32), 'hex'), ARRAY[9]);
begin
  -- A and B are different wallet-owned reports with the same safe category,
  -- compatible spatial keys and an explicit public-projection opt-in.
  insert into private.comun_participation_wallets(id, token_hash)
    values (v_a_wallet, decode(v_a_token, 'hex')),
           (v_b_wallet, decode(v_b_token, 'hex')),
           (v_c_wallet, decode(v_c_token, 'hex')),
           (v_p1_wallet, decode(v_p1_token, 'hex')),
           (v_p2_wallet, decode(v_p2_token, 'hex')),
           (v_health_wallet, decode(v_health_token, 'hex'));

  insert into private.comun_relata_reports(
    id, original_text, receipt_hash, actor_hash, idempotency_hash,
    payload_hash, privacy_class
  ) values
    (v_a_report, 'B2 A local disposable report', extensions.digest('relata-receipt-v1:b2-receipt-a', 'sha256'), extensions.digest('b2-actor-a', 'sha256'), extensions.digest('b2-id-a', 'sha256'), extensions.digest('b2-payload-a', 'sha256'), 'public_after_sanitization'),
    (v_b_report, 'B2 B local disposable report', extensions.digest('b2-receipt-b', 'sha256'), extensions.digest('b2-actor-b', 'sha256'), extensions.digest('b2-id-b', 'sha256'), extensions.digest('b2-payload-b', 'sha256'), 'public_after_sanitization'),
    (v_c_report, 'B2 C distant local disposable report', extensions.digest('b2-receipt-c', 'sha256'), extensions.digest('b2-actor-c', 'sha256'), extensions.digest('b2-id-c', 'sha256'), extensions.digest('b2-payload-c', 'sha256'), 'public_after_sanitization'),
    (v_p1_report, 'B2 power A local disposable report', extensions.digest('b2-receipt-p1', 'sha256'), extensions.digest('b2-actor-p1', 'sha256'), extensions.digest('b2-id-p1', 'sha256'), extensions.digest('b2-payload-p1', 'sha256'), 'public_after_sanitization'),
    (v_p2_report, 'B2 power B local disposable report', extensions.digest('b2-receipt-p2', 'sha256'), extensions.digest('b2-actor-p2', 'sha256'), extensions.digest('b2-id-p2', 'sha256'), extensions.digest('b2-payload-p2', 'sha256'), 'public_after_sanitization'),
    (v_health_report, 'B2 health local disposable report', extensions.digest('b2-receipt-health', 'sha256'), extensions.digest('b2-actor-health', 'sha256'), extensions.digest('b2-id-health', 'sha256'), extensions.digest('b2-payload-health', 'sha256'), 'public_after_sanitization');

  insert into public.comun_relata_cases(
    id, report_id, protocol, category, urgency, routing_rule_version,
    routing_decision, state
  ) values
    (v_a_case, v_a_report, 'COMUN-RELATA-5200000000000001', 'public_lighting', 'routine', 'relata-routing-v1', '{}'::jsonb, 'stored_private'),
    (v_b_case, v_b_report, 'COMUN-RELATA-5200000000000002', 'public_lighting', 'routine', 'relata-routing-v1', '{}'::jsonb, 'stored_private'),
    (v_c_case, v_c_report, 'COMUN-RELATA-5200000000000003', 'public_lighting', 'routine', 'relata-routing-v1', '{}'::jsonb, 'stored_private'),
    (v_p1_case, v_p1_report, 'COMUN-RELATA-5200000000000011', 'power_distribution', 'routine', 'relata-routing-v1', '{}'::jsonb, 'stored_private'),
    (v_p2_case, v_p2_report, 'COMUN-RELATA-5200000000000012', 'power_distribution', 'routine', 'relata-routing-v1', '{}'::jsonb, 'stored_private'),
    (v_health_case, v_health_report, 'COMUN-RELATA-5200000000000099', 'public_health', 'routine', 'relata-routing-v1', '{}'::jsonb, 'stored_private');

  insert into private.comun_relata_private_locations(
    report_id, precision, encrypted_value, origin, accuracy_class,
    captured_at, nonce, auth_tag, key_version, approximate_region,
    approximation_level, geographic_risk
  )
  select report_id, 'map_pin', decode(repeat('aa', 16), 'hex'), 'map_pin',
    'over_100m', now(), decode(repeat('bb', 12), 'hex'),
    decode(repeat('cc', 16), 'hex'), 'relata-location-key-v1',
    'region-safe', 'neighborhood', 'low'
  from (values
    (v_a_report), (v_b_report), (v_c_report), (v_p1_report),
    (v_p2_report), (v_health_report)
  ) as reports(report_id);

  insert into private.comun_participation_wallet_items(
    id, wallet_id, item_type, subject_ref, subject_hash, title_template,
    category, presentation_state, source_domain
  ) values
    (v_a_item, v_a_wallet, 'relata_report', v_a_case::text, extensions.digest('b2-item-a', 'sha256'), 'Relato COMUN', 'public_lighting', 'Guardado', 'relata'),
    (v_b_item, v_b_wallet, 'relata_report', v_b_case::text, extensions.digest('b2-item-b', 'sha256'), 'Relato COMUN', 'public_lighting', 'Guardado', 'relata'),
    (v_c_item, v_c_wallet, 'relata_report', v_c_case::text, extensions.digest('b2-item-c', 'sha256'), 'Relato COMUN', 'public_lighting', 'Guardado', 'relata'),
    (v_p1_item, v_p1_wallet, 'relata_report', v_p1_case::text, extensions.digest('b2-item-p1', 'sha256'), 'Relato COMUN', 'power_distribution', 'Guardado', 'relata'),
    (v_p2_item, v_p2_wallet, 'relata_report', v_p2_case::text, extensions.digest('b2-item-p2', 'sha256'), 'Relato COMUN', 'power_distribution', 'Guardado', 'relata'),
    (v_health_item, v_health_wallet, 'relata_report', v_health_case::text, extensions.digest('b2-item-health', 'sha256'), 'Relato COMUN', 'public_health', 'Guardado', 'relata');

  select * into v_result from public.comun_relata_public_projection_consent_set(v_a_token, v_a_item, true);
  if not v_result.available or not v_result.active then raise exception 'B2_A_CONSENT_FAILED'; end if;
  select * into v_result from public.comun_relata_public_projection_consent_set(v_b_token, v_b_item, true);
  if not v_result.available or not v_result.active then raise exception 'B2_B_CONSENT_FAILED'; end if;
  select * into v_result from public.comun_relata_public_projection_consent_set(v_c_token, v_c_item, true);
  if not v_result.available or not v_result.active then raise exception 'B2_C_CONSENT_FAILED'; end if;
  select * into v_result from public.comun_relata_public_projection_consent_set(v_p1_token, v_p1_item, true);
  if not v_result.available or not v_result.active then raise exception 'B2_POWER_A_CONSENT_FAILED'; end if;
  select * into v_result from public.comun_relata_public_projection_consent_set(v_p2_token, v_p2_item, true);
  if not v_result.available or not v_result.active then raise exception 'B2_POWER_B_CONSENT_FAILED'; end if;

  -- Health is outside the allowlist and never receives this opt-in.
  select * into v_result from public.comun_relata_public_projection_consent_status(v_health_token, v_health_item);
  if v_result.available then raise exception 'B2_SENSITIVE_CATEGORY_OPT_IN_AVAILABLE'; end if;

  -- The first report reconciles its B1 seed and stores only server-derived
  -- key material. A replay remains one active membership.
  select * into v_result from public.comun_relata_associate_collective_for_wallet(
    v_a_token, v_a_item, 'auto_link_high_confidence', v_keys, now() - interval '1 day'
  );
  if v_result.grouping_state <> 'new_collective_case' or v_result.active_members_count <> 1 then
    raise exception 'B2_FIRST_SEED_FAILED';
  end if;
  select * into v_result from public.comun_relata_associate_collective_for_wallet(
    v_a_token, v_a_item, 'auto_link_high_confidence', v_keys, now() - interval '1 day'
  );
  if v_result.active_members_count <> 1
     or (select count(*) from public.comun_relata_case_memberships where individual_case_id=v_a_case and active) <> 1 then
    raise exception 'B2_REPLAY_NOT_IDEMPOTENT';
  end if;

  -- B matches A. C has the same category but unrelated spatial keys.
  select * into v_result from public.comun_relata_associate_collective_for_wallet(
    v_b_token, v_b_item, 'auto_link_high_confidence', v_keys, now() - interval '1 day'
  );
  if v_result.grouping_state <> 'auto_link_high_confidence' or v_result.active_members_count <> 2 then
    raise exception 'B2_HIGH_CONFIDENCE_MATCH_FAILED';
  end if;
  select * into v_result from public.comun_relata_associate_collective_for_wallet(
    v_c_token, v_c_item, 'auto_link_high_confidence', v_other_keys, now() - interval '1 day'
  );
  if v_result.grouping_state <> 'new_collective_case' or v_result.active_members_count <> 1 then
    raise exception 'B2_DISTANT_CASE_WAS_LINKED';
  end if;
  if (select count(*) from public.comun_relata_collective_cases where state='active') <> 3 then
    raise exception 'B2_COLLECTIVE_COUNT_FAILED';
  end if;
  select * into v_result from public.comun_relata_collective_connection_for_wallet(v_b_token, v_b_item);
  if v_result.connection <> 'matched' then raise exception 'B2_MATCHED_HOLDER_SIGNAL_FAILED'; end if;
  select * into v_result from public.comun_relata_collective_connection_for_wallet(v_c_token, v_c_item);
  if v_result.connection <> 'waiting' then raise exception 'B2_WAITING_HOLDER_SIGNAL_FAILED'; end if;

  -- Power uses the narrower 12-hour window. An old window is rejected even
  -- if the same spatial key later becomes available for a current request.
  select * into v_result from public.comun_relata_associate_collective_for_wallet(
    v_p1_token, v_p1_item, 'auto_link_high_confidence', v_power_keys, now() - interval '13 hours'
  );
  if found then raise exception 'B2_POWER_OLD_WINDOW_ACCEPTED'; end if;
  select * into v_result from public.comun_relata_associate_collective_for_wallet(
    v_p1_token, v_p1_item, 'auto_link_high_confidence', v_power_keys, now() - interval '1 hour'
  );
  if v_result.active_members_count <> 1 then raise exception 'B2_POWER_SEED_FAILED'; end if;
  select * into v_result from public.comun_relata_associate_collective_for_wallet(
    v_p2_token, v_p2_item, 'auto_link_high_confidence', v_power_keys, now() - interval '1 hour'
  );
  if v_result.grouping_state <> 'auto_link_high_confidence' or v_result.active_members_count <> 2 then
    raise exception 'B2_POWER_MATCH_FAILED';
  end if;

  -- Revocation ends only the holder's active membership and recalculates the
  -- collective. The report itself, forwarding and history remain intact.
  select collective_case_id into v_collective
    from public.comun_relata_case_memberships
   where individual_case_id=v_b_case and active;
  perform public.comun_relata_public_projection_consent_set(v_b_token, v_b_item, false);
  if (select active from private.comun_relata_public_projection_consents where case_id=v_b_case)
     or (select count(*) from public.comun_relata_case_memberships where individual_case_id=v_b_case and active) <> 0
     or (select active_members_count from public.comun_relata_collective_cases where id=v_collective) <> 1
     or (select count(*) from private.comun_relata_case_match_keys where individual_case_id=v_b_case and active) <> 0 then
    raise exception 'B2_REVOCATION_RECONCILIATION_FAILED';
  end if;

  -- Exercise the public withdrawal contract: the B2 trigger reconciles the
  -- count exactly once, while the action keeps append-only event history.
  perform * from public.comun_relata_withdraw('COMUN-RELATA-5200000000000001', 'b2-receipt-a');
  if (select state from public.comun_relata_cases where id=v_a_case) <> 'withdrawn'
     or (select active_members_count from public.comun_relata_collective_cases where id=v_collective) <> 0
     or (select state from public.comun_relata_collective_cases where id=v_collective) <> 'inactive'
     or (select count(*) from public.comun_relata_case_match_events) < 1 then
    raise exception 'B2_WITHDRAWAL_RECONCILIATION_FAILED';
  end if;

  if (select count(*) from private.comun_relata_public_projections) <> 0
     or (select count(*) from private.comun_relata_public_confirmations) <> 0 then
    raise exception 'B2_MAP_OR_CONFIRMATION_WAS_TOUCHED';
  end if;
end;
$$;

rollback;

select
  0 = (select count(*) from private.comun_participation_wallets where id::text like '51000000-%')
  and 0 = (select count(*) from public.comun_relata_collective_cases where id::text like '53000000-%')
  and 0 = (select count(*) from private.comun_relata_public_projections)
  and 0 = (select count(*) from private.comun_relata_public_confirmations)
  as disposable_cleanup;
