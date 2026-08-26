begin;

do $$
declare
  v_token_hash text := encode(extensions.digest('b1-disposable-wallet', 'sha256'), 'hex');
  v_wallet uuid := '10000000-0000-0000-0000-000000000001';
  v_report uuid := '20000000-0000-0000-0000-000000000001';
  v_case uuid := '30000000-0000-0000-0000-000000000001';
  v_item uuid := '40000000-0000-0000-0000-000000000001';
  v_collective uuid;
  v_result record;
  v_public jsonb;
begin
  insert into private.comun_participation_wallets(id, token_hash)
    values (v_wallet, decode(v_token_hash, 'hex'));
  insert into private.comun_relata_reports(
    id, original_text, receipt_hash, actor_hash, idempotency_hash,
    payload_hash, privacy_class
  ) values (
    v_report, 'B1 local disposable report',
    extensions.digest('b1-receipt', 'sha256'),
    extensions.digest('b1-actor', 'sha256'),
    extensions.digest('b1-idempotency', 'sha256'),
    extensions.digest('b1-payload', 'sha256'),
    'public_after_sanitization'
  );
  insert into public.comun_relata_cases(
    id, report_id, protocol, category, urgency, routing_rule_version,
    routing_decision, state
  ) values (
    v_case, v_report, 'COMUN-RELATA-3000000000000001', 'public_lighting',
    'routine', 'relata-routing-v1', '{}'::jsonb, 'stored_private'
  );
  insert into private.comun_relata_private_locations(
    report_id, precision, encrypted_value, origin, accuracy_class,
    captured_at, nonce, auth_tag, key_version, approximate_region,
    approximation_level, geographic_risk
  ) values (
    v_report, 'map_pin', decode(repeat('aa', 16), 'hex'), 'map_pin',
    'over_100m', now(), decode(repeat('bb', 12), 'hex'),
    decode(repeat('cc', 16), 'hex'), 'relata-location-key-v1',
    'region-safe', 'neighborhood', 'low'
  );
  insert into private.comun_participation_wallet_items(
    id, wallet_id, item_type, subject_ref, subject_hash, title_template,
    category, presentation_state, source_domain
  ) values (
    v_item, v_wallet, 'relata_report', v_case::text,
    extensions.digest('wallet-subject-v1:COMUN-RELATA-3000000000000001', 'sha256'),
    'Relato COMUN', 'public_lighting', 'Guardado', 'relata'
  );

  select * into v_result from public.comun_relata_public_projection_consent_status(
    v_token_hash, v_item
  );
  if not v_result.available or v_result.active then
    raise exception 'B1_OPT_IN_STATUS_INITIAL_FAILED';
  end if;

  select * into v_result from public.comun_relata_public_projection_consent_set(
    v_token_hash, v_item, true
  );
  if not v_result.available or not v_result.active then
    raise exception 'B1_OPT_IN_GRANT_FAILED';
  end if;
  if (select count(*) from private.comun_relata_public_projection_consents
      where case_id = v_case and active) <> 1
     or (select count(*) from public.comun_relata_case_memberships
      where individual_case_id = v_case and active) <> 1
     or (select count(*) from public.comun_relata_collective_cases) <> 1 then
    raise exception 'B1_OPT_IN_PRIVATE_PREPARATION_FAILED';
  end if;
  if (select count(*) from private.comun_relata_public_projections) <> 0 then
    raise exception 'B1_OPT_IN_CREATED_PROJECTION_TOO_EARLY';
  end if;

  -- Replay is idempotent: no second consent, membership or collective.
  perform public.comun_relata_public_projection_consent_set(v_token_hash, v_item, true);
  if (select count(*) from private.comun_relata_public_projection_consents
      where case_id = v_case) <> 1
     or (select count(*) from public.comun_relata_case_memberships
      where individual_case_id = v_case and active) <> 1
     or (select count(*) from public.comun_relata_collective_cases) <> 1 then
    raise exception 'B1_OPT_IN_REPLAY_NOT_IDEMPOTENT';
  end if;

  -- Wrong wallet and arbitrary item handles cannot grant consent.
  select * into v_result from public.comun_relata_public_projection_consent_status(
    encode(extensions.digest('b1-wrong-wallet', 'sha256'), 'hex'), v_item
  );
  if v_result.available then
    raise exception 'B1_WRONG_WALLET_AUTHORIZED';
  end if;
  select * into v_result from public.comun_relata_public_projection_consent_status(
    v_token_hash, '40000000-0000-0000-0000-000000000099'
  );
  if v_result.available then
    raise exception 'B1_ARBITRARY_ITEM_AUTHORIZED';
  end if;

  select collective_case_id into v_collective
    from public.comun_relata_case_memberships
   where individual_case_id = v_case and active;
  update public.comun_relata_collective_cases
     set future_map_eligibility = true
   where id = v_collective;
  perform private.comun_relata_public_projection_set_candidate(
    v_collective, 1, 1, 300, -22.52, -44.10, 300
  );
  select * into v_result from private.comun_relata_public_projection_recompute(v_collective);
  if v_result.result_code <> 'RELATA_PUBLIC_PROJECTION_READY' then
    raise exception 'B1_LOCAL_PROJECTION_RELEASE_FAILED';
  end if;

  -- Revoking the person's consent suppresses the existing projection.
  perform public.comun_relata_public_projection_consent_set(v_token_hash, v_item, false);
  if (select active from private.comun_relata_public_projection_consents where case_id=v_case)
     or (select projection_state from private.comun_relata_public_projections where collective_case_id=v_collective)
        <> 'suppressed' then
    raise exception 'B1_REVOCATION_SUPPRESSION_FAILED';
  end if;

  -- A withdrawn report also cannot sustain a projection.
  perform public.comun_relata_public_projection_consent_set(v_token_hash, v_item, true);
  select * into v_result from private.comun_relata_public_projection_recompute(v_collective);
  update public.comun_relata_cases set state='withdrawn', withdrawn_at=now()
   where id=v_case;
  if (select projection_state from private.comun_relata_public_projections where collective_case_id=v_collective)
       <> 'suppressed' then
    raise exception 'B1_WITHDRAWAL_SUPPRESSION_FAILED';
  end if;

  if (select count(*) from private.comun_relata_public_confirmations) <> 0 then
    raise exception 'B1_CONFIRMATIONS_MUST_REMAIN_UNUSED';
  end if;
  select to_jsonb(x) into v_public from public.comun_denuncias_public_list() x limit 1;
  if v_public ? 'case_id' or v_public ? 'report_id' or v_public ? 'membership_id'
     or v_public ? 'wallet_item_id' then
    raise exception 'B1_PUBLIC_PAYLOAD_LEAK';
  end if;
end;
$$;

rollback;

select 0 = (select count(*) from private.comun_relata_public_projection_consents)
  and 0 = (select count(*) from public.comun_relata_collective_cases)
  and 0 = (select count(*) from private.comun_relata_public_projections)
  and 0 = (select count(*) from private.comun_relata_public_confirmations)
  as disposable_cleanup;
