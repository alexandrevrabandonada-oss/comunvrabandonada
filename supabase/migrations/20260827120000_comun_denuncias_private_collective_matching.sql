begin;

-- COMUN 48.6-B2-A2: the production matcher is wallet-owned and opt-in only.
-- This migration adds no tables and does not promote the local 48.0C SQL.
do $$
begin
  if to_regclass('private.comun_participation_wallets') is null
     or to_regclass('private.comun_participation_wallet_items') is null
     or to_regclass('private.comun_relata_reports') is null
     or to_regclass('private.comun_relata_private_locations') is null
     or to_regclass('public.comun_relata_cases') is null
     or to_regclass('public.comun_relata_collective_cases') is null
     or to_regclass('public.comun_relata_case_memberships') is null
     or to_regclass('private.comun_relata_case_match_keys') is null
     or to_regclass('public.comun_relata_case_match_events') is null
     or to_regclass('private.comun_relata_public_projection_consents') is null then
    raise exception using errcode='P0001',
      message='COMUN_48_6_B2_A2_BLOCKED_MISSING_CANONICAL_ROOTS';
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in (
        'comun_relata_associate_collective_for_wallet',
        'comun_relata_public_projection_owned_location',
        'comun_relata_collective_connection_for_wallet'
      )
  ) then
    raise exception using errcode='P0001',
      message='COMUN_48_6_B2_A2_BLOCKED_UNEXPECTED_MATCHER_SCHEMA_DRIFT';
  end if;
end;
$$;

-- One invariant is shared by opt-in revocation and report withdrawal: an
-- inactive consent/case cannot continue to support private matching.
create or replace function private.comun_relata_unlink_collective_membership(
  p_case_id uuid,
  p_end_reason text
)
returns void
language plpgsql
security definer
set search_path=pg_catalog,private,public
as $$
declare
  v_collective_id uuid;
  v_count integer;
begin
  if p_end_reason is null or p_end_reason !~ '^RELATA_[A-Z0-9_]{3,80}$' then
    raise exception using errcode='22023', message='COMUN_RELATA_MATCH_END_REASON_INVALID';
  end if;
  for v_collective_id in
    select distinct m.collective_case_id
      from public.comun_relata_case_memberships m
     where m.individual_case_id=p_case_id
       and m.active
  loop
    update public.comun_relata_case_memberships
       set active=false, ended_at=pg_catalog.now(), end_reason=p_end_reason
     where individual_case_id=p_case_id
       and collective_case_id=v_collective_id
       and active;
    update private.comun_relata_case_match_keys
       set active=false, ended_at=pg_catalog.now()
     where individual_case_id=p_case_id
       and collective_case_id=v_collective_id
       and active;
    select count(*)::integer into v_count
      from public.comun_relata_case_memberships
     where collective_case_id=v_collective_id and active;
    update public.comun_relata_collective_cases
       set active_members_count=v_count,
           state=case when v_count=0 then 'inactive' else 'active' end,
           updated_at=pg_catalog.now()
     where id=v_collective_id;
  end loop;
end;
$$;

-- This is the only server-side location reader for B2-A2. It returns
-- encrypted location material to the trusted application client only; no
-- route exposes this record to a browser.
create or replace function public.comun_relata_public_projection_owned_location(
  p_token_hash_hex text,
  p_wallet_item_id uuid
)
returns table(
  protocol text,
  category text,
  urgency text,
  privacy_class text,
  case_state text,
  report_withdrawn_at timestamptz,
  captured_at timestamptz,
  encrypted_value bytea,
  nonce bytea,
  auth_tag bytea,
  key_version text,
  evidence_state text,
  approximation_level text,
  geographic_risk text
)
language sql
stable
security definer
set search_path=pg_catalog,private,public
as $$
  select
    c.protocol, c.category, c.urgency, r.privacy_class, c.state,
    r.withdrawn_at, l.captured_at, l.encrypted_value, l.nonce, l.auth_tag,
    l.key_version, l.evidence_state, l.approximation_level, l.geographic_risk
    from private.comun_participation_wallets w
    join private.comun_participation_wallet_items wi
      on wi.wallet_id=w.id
     and wi.id=p_wallet_item_id
     and wi.item_type='relata_report'
     and wi.archived_at is null
    join public.comun_relata_cases c on c.id::text=wi.subject_ref
    join private.comun_relata_reports r on r.id=c.report_id
    join private.comun_relata_private_locations l on l.report_id=r.id
   where p_token_hash_hex ~ '^[0-9a-f]{64}$'
     and w.token_hash=pg_catalog.decode(p_token_hash_hex,'hex')
     and w.status='active'
     and c.state<>'withdrawn'
     and r.withdrawn_at is null
     and l.evidence_state='added_private'
     and l.withdrawn_at is null;
$$;

-- Wallet ownership, consent, category and location are revalidated inside the
-- transaction. The browser supplies only the wallet item handle and token.
create or replace function public.comun_relata_associate_collective_for_wallet(
  p_token_hash_hex text,
  p_wallet_item_id uuid,
  p_requested_decision text,
  p_spatial_keys bytea[],
  p_window_start timestamptz
)
returns table(grouping_state text, confidence_level text, active_members_count integer)
language plpgsql
security definer
set search_path=pg_catalog,private,public
as $$
declare
  v_context record;
  v_now timestamptz:=pg_catalog.now();
  v_previous uuid;
  v_target uuid;
  v_membership_role text;
  v_existing_method text;
  v_existing_confidence numeric(4,3);
  v_count integer;
  v_key bytea;
  v_window interval;
begin
  if p_token_hash_hex is null
     or p_token_hash_hex !~ '^[0-9a-f]{64}$'
     or p_wallet_item_id is null then
    return;
  end if;
  select
    w.id as wallet_id, wi.id as wallet_item_id, c.id as case_id,
    c.report_id, c.protocol, c.category, c.urgency, c.state as case_state,
    r.withdrawn_at as report_withdrawn_at, r.privacy_class,
    (l.id is not null and l.evidence_state='added_private'
      and l.withdrawn_at is null
      and l.approximation_level in ('neighborhood','region')
      and l.geographic_risk in ('unreviewed','low','medium')) as location_ready
    into v_context
    from private.comun_participation_wallets w
    join private.comun_participation_wallet_items wi
      on wi.wallet_id=w.id and wi.id=p_wallet_item_id
     and wi.item_type='relata_report' and wi.archived_at is null
    join public.comun_relata_cases c on c.id::text=wi.subject_ref
    join private.comun_relata_reports r on r.id=c.report_id
    left join private.comun_relata_private_locations l on l.report_id=r.id
   where w.token_hash=pg_catalog.decode(p_token_hash_hex,'hex')
     and w.status='active';
  if not found then return; end if;

  if v_context.category not in ('public_lighting','power_distribution','smoke_or_environmental_trace')
     or v_context.case_state='withdrawn'
     or v_context.report_withdrawn_at is not null
     or v_context.urgency='emergency'
     or v_context.privacy_class not in ('public_safe','public_after_sanitization')
     or not coalesce(v_context.location_ready,false)
     or p_requested_decision<>'auto_link_high_confidence'
     or coalesce(pg_catalog.array_length(p_spatial_keys,1),0)<>9
     or p_window_start is null
     or p_window_start>v_now then
    return;
  end if;
  v_window:=case v_context.category
    when 'public_lighting' then interval '21 days'
    when 'power_distribution' then interval '12 hours'
    else interval '24 hours' end;
  if p_window_start < v_now-v_window then return; end if;
  if exists(
    select 1 from pg_catalog.unnest(p_spatial_keys) as keys(key_hash)
     where pg_catalog.octet_length(keys.key_hash)<>32
  ) then
    raise exception using errcode='22023', message='COMUN_RELATA_MATCH_INVALID_KEY_SHAPE';
  end if;
  if not exists(
    select 1 from private.comun_relata_public_projection_consents consent
     where consent.case_id=v_context.case_id
       and consent.active
       and consent.consent_version='relata-public-projection-v1'
       and consent.scope='collective_projection'
  ) then
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('relata-case:'||v_context.case_id::text,4862)
  );
  -- Lock every candidate key in lexical order so overlapping neighbour cells
  -- serialize even when two different cases arrive concurrently.
  for v_key in
    select key_hash from pg_catalog.unnest(p_spatial_keys) as keys(key_hash)
    order by pg_catalog.encode(key_hash,'hex')
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('relata-match:'||pg_catalog.encode(v_key,'hex'),4863)
    );
  end loop;

  select m.collective_case_id, m.association_method, m.confidence
    into v_previous, v_existing_method, v_existing_confidence
    from public.comun_relata_case_memberships m
   where m.individual_case_id=v_context.case_id and m.active
   order by m.created_at desc
   limit 1
   for update;
  if v_previous is not null then
    perform 1 from public.comun_relata_collective_cases where id=v_previous for update;
  end if;

  select collective.id into v_target
    from private.comun_relata_case_match_keys match_key
    join public.comun_relata_collective_cases collective
      on collective.id=match_key.collective_case_id
   where match_key.active
     and match_key.created_at>=p_window_start
     and match_key.key_hash=any(p_spatial_keys)
     and collective.category=v_context.category
     and collective.state='active'
     and (v_previous is null or collective.id<>v_previous)
   group by collective.id, collective.active_members_count, collective.created_at
   order by collective.active_members_count desc, collective.created_at asc
   limit 1;
  if v_target is not null then
    perform 1 from public.comun_relata_collective_cases where id=v_target for update;
  end if;

  if v_target is null then
    v_target:=v_previous;
    if v_target is null then
      insert into public.comun_relata_collective_cases(
        category,collective_urgency,state,match_rule,match_rule_version,
        active_members_count,first_report_at,last_report_at,confidence_level,
        future_map_eligibility,review_state
      ) values(
        v_context.category,v_context.urgency,'active','explicit_opt_in_seed',
        'relata-match-v1',0,v_now,v_now,'low',false,'not_requested'
      ) returning id into v_target;
      insert into public.comun_relata_case_memberships(
        collective_case_id,individual_case_id,membership_role,
        association_method,confidence,match_rule_version
      ) values(v_target,v_context.case_id,'seed','new_collective_case',.250,'relata-match-v1');
      v_existing_method:='new_collective_case';
      v_existing_confidence:=.250;
    end if;
    insert into private.comun_relata_case_match_keys(
      individual_case_id,collective_case_id,key_hash,match_rule_version
    )
    select distinct v_context.case_id,v_target,keys.key_hash,'relata-match-v1'
      from pg_catalog.unnest(p_spatial_keys) as keys(key_hash)
     where not exists(
       select 1 from private.comun_relata_case_match_keys existing
        where existing.individual_case_id=v_context.case_id
          and existing.collective_case_id=v_target
          and existing.key_hash=keys.key_hash
          and existing.active
     );
    select count(*)::integer into v_count
      from public.comun_relata_case_memberships
     where collective_case_id=v_target and active;
    update public.comun_relata_collective_cases
       set active_members_count=v_count, last_report_at=greatest(last_report_at,v_now), updated_at=v_now
     where id=v_target;
    if v_existing_method is null then
      select m.association_method,m.confidence into v_existing_method,v_existing_confidence
        from public.comun_relata_case_memberships m
       where m.individual_case_id=v_context.case_id and m.active;
    end if;
    return query select v_existing_method,case when v_existing_confidence>=.900 then 'high' else 'low' end,v_count;
    return;
  end if;

  -- A B1 seed is replaced only by a high-confidence match. The old seed is
  -- retained in history and becomes inactive; no second active membership is
  -- possible because the canonical partial unique index remains in force.
  if v_previous is not null and v_previous<>v_target then
    update public.comun_relata_case_memberships
       set active=false,ended_at=v_now,end_reason='RELATA_MATCH_RECALCULATED'
     where individual_case_id=v_context.case_id and active;
    update private.comun_relata_case_match_keys
       set active=false,ended_at=v_now
     where individual_case_id=v_context.case_id and active;
    select count(*)::integer into v_count
      from public.comun_relata_case_memberships
     where collective_case_id=v_previous and active;
    update public.comun_relata_collective_cases
       set active_members_count=v_count,
           state=case when v_count=0 then 'inactive' else 'active' end,
           updated_at=v_now
     where id=v_previous;
  end if;

  select case when exists(
    select 1 from public.comun_relata_case_memberships
     where collective_case_id=v_target and active
  ) then 'report' else 'seed' end into v_membership_role;
  insert into public.comun_relata_case_memberships(
    collective_case_id,individual_case_id,membership_role,
    association_method,confidence,match_rule_version
  ) values(v_target,v_context.case_id,v_membership_role,
    'auto_link_high_confidence',.950,'relata-match-v1');
  insert into private.comun_relata_case_match_keys(
    individual_case_id,collective_case_id,key_hash,match_rule_version
  )
  select distinct v_context.case_id,v_target,keys.key_hash,'relata-match-v1'
    from pg_catalog.unnest(p_spatial_keys) as keys(key_hash);
  select count(*)::integer into v_count
    from public.comun_relata_case_memberships
   where collective_case_id=v_target and active;
  update public.comun_relata_collective_cases
     set active_members_count=v_count,last_report_at=greatest(last_report_at,v_now),
         confidence_level='high',state='active',updated_at=v_now
   where id=v_target;
  insert into public.comun_relata_case_match_events(
    individual_case_id,previous_collective_case_id,collective_case_id,
    decision,confidence_level,match_rule_version,result_code
  ) values(v_context.case_id,v_previous,v_target,'auto_link_high_confidence',
    'high','relata-match-v1','RELATA_COLLECTIVE_ASSOCIATION_RECORDED');
  if not exists(
    select 1 from public.comun_relata_evidence_consents
     where case_id=v_context.case_id and consent_kind='collective_grouping' and active
  ) then
    insert into public.comun_relata_evidence_consents(
      case_id,consent_kind,consent_version,active,result_code
    ) values(v_context.case_id,'collective_grouping','relata-collective-grouping-v1',true,
      'RELATA_COLLECTIVE_GROUPING_ALLOWED');
  end if;
  return query select 'auto_link_high_confidence','high',v_count;
end;
$$;

-- Holder-only read model. It intentionally returns only waiting/matched and
-- never a case, report, membership, count, or spatial key.
create or replace function public.comun_relata_collective_connection_for_wallet(
  p_token_hash_hex text,
  p_wallet_item_id uuid
)
returns table(connection text)
language sql
stable
security definer
set search_path=pg_catalog,private,public
as $$
  select case when collective.active_members_count>1
    or membership.association_method='auto_link_high_confidence'
    then 'matched' else 'waiting' end
    from private.comun_participation_wallets w
    join private.comun_participation_wallet_items wi
      on wi.wallet_id=w.id and wi.id=p_wallet_item_id
     and wi.item_type='relata_report' and wi.archived_at is null
    join public.comun_relata_cases c on c.id::text=wi.subject_ref
    join private.comun_relata_public_projection_consents consent
      on consent.case_id=c.id and consent.active
     and consent.consent_version='relata-public-projection-v1'
     and consent.scope='collective_projection'
    join public.comun_relata_case_memberships membership
      on membership.individual_case_id=c.id and membership.active
    join public.comun_relata_collective_cases collective
      on collective.id=membership.collective_case_id and collective.state='active'
   where p_token_hash_hex ~ '^[0-9a-f]{64}$'
     and w.token_hash=pg_catalog.decode(p_token_hash_hex,'hex')
     and w.status='active'
     and c.state<>'withdrawn';
$$;

-- Revoke is an invariant, not a second client API. The existing B1 consent
-- action remains the only user-facing write path.
create or replace function private.comun_relata_reconcile_collective_on_consent_change()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,private,public
as $$
declare
  v_collectives uuid[];
  v_collective_id uuid;
begin
  if old.active and not new.active then
    select pg_catalog.array_agg(distinct m.collective_case_id)
      into v_collectives
      from public.comun_relata_case_memberships m
     where m.individual_case_id=new.case_id and m.active;
    perform private.comun_relata_unlink_collective_membership(
      new.case_id,'RELATA_PUBLIC_OPT_IN_REVOKED'
    );
    if v_collectives is not null then
      foreach v_collective_id in array v_collectives loop
        perform 1 from private.comun_relata_public_projection_recompute(v_collective_id);
      end loop;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists comun_relata_collective_consent_reconcile
  on private.comun_relata_public_projection_consents;
create trigger comun_relata_collective_consent_reconcile
after update of active on private.comun_relata_public_projection_consents
for each row execute function private.comun_relata_reconcile_collective_on_consent_change();

-- Direct report withdrawal uses the same unlink invariant before recomputing
-- any historical projection. It never deletes the report or event history.
create or replace function private.comun_relata_recompute_public_projection_after_withdrawal()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,private,public
as $$
declare
  v_collectives uuid[];
  v_collective_id uuid;
begin
  if new.state='withdrawn' and old.state is distinct from new.state then
    select pg_catalog.array_agg(distinct m.collective_case_id)
      into v_collectives
      from public.comun_relata_case_memberships m
     where m.individual_case_id=new.id and m.active;
    perform private.comun_relata_unlink_collective_membership(
      new.id,'RELATA_REPORT_WITHDRAWN'
    );
    if v_collectives is not null then
      foreach v_collective_id in array v_collectives loop
        perform 1 from private.comun_relata_public_projection_recompute(v_collective_id);
      end loop;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists comun_relata_public_projection_withdrawal_recompute
  on public.comun_relata_cases;
create trigger comun_relata_public_projection_withdrawal_recompute
after update of state,withdrawn_at on public.comun_relata_cases
for each row execute function private.comun_relata_recompute_public_projection_after_withdrawal();

-- The historical withdrawal action used to decrement the collective count
-- itself.  The trigger above now performs the exact reconciliation, so keep
-- the action's public contract while removing the second decrement.  This
-- preserves the existing wallet/receipt authority and append-only history.
create or replace function public.comun_relata_withdraw(
  p_protocol text,p_receipt_secret text
)
returns table (protocol text,state text,category text,urgency text,rule_version text,created_at timestamptz,withdrawn_at timestamptz,timeline jsonb)
language plpgsql security definer set search_path=pg_catalog,private,public
as $$
declare
  v_case public.comun_relata_cases%rowtype;
  v_report private.comun_relata_reports%rowtype;
  v_collective uuid;
begin
  if p_protocol !~ '^COMUN-RELATA-[A-F0-9]{16}$'
     or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$' then
    return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_protocol,4801)
  );
  select * into v_case
    from public.comun_relata_cases
   where public.comun_relata_cases.protocol=p_protocol;
  if not found then return; end if;
  select * into v_report
    from private.comun_relata_reports report
   where report.id=v_case.report_id
     and report.receipt_hash=extensions.digest(
       'relata-receipt-v1:'||p_receipt_secret,'sha256'
     );
  if not found then return; end if;
  if v_case.state<>'withdrawn' then
    select collective_case_id into v_collective
      from public.comun_relata_case_memberships
     where individual_case_id=v_case.id and active
     for update;

    update public.comun_relata_cases
       set state='withdrawn',withdrawn_at=pg_catalog.now(),updated_at=pg_catalog.now()
     where id=v_case.id
     returning * into v_case;
    update private.comun_relata_reports
       set withdrawn_at=v_case.withdrawn_at,retention_class='withdrawn',
           review_after=v_case.withdrawn_at+interval '30 days'
     where id=v_report.id;
    update private.comun_relata_private_locations
       set evidence_state='withdrawn',withdrawn_at=v_case.withdrawn_at
     where report_id=v_report.id and evidence_state<>'withdrawn';
    update private.comun_relata_attachments attachment
       set state='withdrawn',withdrawn_at=v_case.withdrawn_at,
           retention_class='withdrawn_evidence',
           updated_at=pg_catalog.now()
     where attachment.report_id=v_report.id
       and attachment.state not in ('withdrawn','rejected');

    -- Memberships and match keys were reconciled by the AFTER trigger.  Do
    -- not update their count again here.
    if v_collective is not null then
      insert into public.comun_relata_case_match_events(
        individual_case_id,previous_collective_case_id,collective_case_id,
        decision,confidence_level,match_rule_version,result_code
      ) values(
        v_case.id,v_collective,v_collective,'withdrawn_unlinked','blocked',
        'relata-match-v1','RELATA_WITHDRAWAL_UNLINKED'
      );
    end if;
    insert into public.comun_relata_status_events(case_id,state,actor,result_code)
      values(v_case.id,'withdrawn','person','RELATA_WITHDRAWN_BY_HOLDER');
  end if;
  return query
    select receipt.*
      from public.comun_relata_get_receipt(p_protocol,p_receipt_secret) receipt;
end;
$$;

revoke all on function public.comun_relata_public_projection_owned_location(text,uuid)
  from public,anon,authenticated;
revoke all on function public.comun_relata_associate_collective_for_wallet(text,uuid,text,bytea[],timestamptz)
  from public,anon,authenticated;
revoke all on function public.comun_relata_collective_connection_for_wallet(text,uuid)
  from public,anon,authenticated;
grant execute on function public.comun_relata_public_projection_owned_location(text,uuid)
  to service_role;
grant execute on function public.comun_relata_associate_collective_for_wallet(text,uuid,text,bytea[],timestamptz)
  to service_role;
grant execute on function public.comun_relata_collective_connection_for_wallet(text,uuid)
  to service_role;

comment on function public.comun_relata_associate_collective_for_wallet(text,uuid,text,bytea[],timestamptz)
  is '48.6-B2-A2 wallet-owned deterministic private matching; explicit projection opt-in required; map remains off.';
comment on function public.comun_relata_collective_connection_for_wallet(text,uuid)
  is '48.6-B2-A2 holder-only waiting/matched projection; no internal identifiers or counts.';

commit;
