begin;

-- 48.6-B1: explicit opt-in from the report holder.  This migration adds no
-- tables and never enables the Production map.  The wallet item is the only
-- browser-visible handle; the server resolves it to the canonical case.
do $$
begin
  if to_regclass('private.comun_participation_wallets') is null
     or to_regclass('private.comun_participation_wallet_items') is null
     or to_regclass('public.comun_relata_cases') is null
     or to_regclass('private.comun_relata_reports') is null
     or to_regclass('private.comun_relata_private_locations') is null
     or to_regclass('private.comun_relata_public_projection_consents') is null
     or to_regclass('public.comun_relata_collective_cases') is null
     or to_regclass('public.comun_relata_case_memberships') is null then
    raise exception using errcode = 'P0001',
      message = 'COMUN_48_6_B1_BLOCKED_MISSING_CANONICAL_ROOTS';
  end if;
end;
$$;

create or replace function private.comun_relata_public_projection_owned_context(
  p_token_hash_hex text,
  p_wallet_item_id uuid
)
returns table (
  wallet_id uuid,
  case_id uuid,
  category text,
  urgency text,
  case_state text,
  report_withdrawn_at timestamptz,
  privacy_class text,
  location_ready boolean
)
language sql
stable
security definer
set search_path = 'pg_catalog'
as $$
  select
    w.id,
    c.id,
    c.category,
    c.urgency,
    c.state,
    r.withdrawn_at,
    r.privacy_class,
    coalesce((
      r.withdrawn_at is null
      and l.evidence_state = 'added_private'
      and l.withdrawn_at is null
      and l.approximation_level in ('neighborhood', 'region')
      and l.geographic_risk in ('unreviewed', 'low', 'medium')
    ), false)
  from private.comun_participation_wallets w
  join private.comun_participation_wallet_items wi
    on wi.wallet_id = w.id
   and wi.id = p_wallet_item_id
   and wi.item_type = 'relata_report'
   and wi.archived_at is null
  join public.comun_relata_cases c
    on c.id::text = wi.subject_ref
  join private.comun_relata_reports r
    on r.id = c.report_id
  left join private.comun_relata_private_locations l
    on l.report_id = r.id
  where p_token_hash_hex ~ '^[0-9a-f]{64}$'
    and w.token_hash = pg_catalog.decode(p_token_hash_hex, 'hex')
    and w.status = 'active';
$$;

revoke all on function private.comun_relata_public_projection_owned_context(text, uuid)
  from public, anon, authenticated;

create or replace function public.comun_relata_public_projection_consent_status(
  p_token_hash_hex text,
  p_wallet_item_id uuid
)
returns table (
  available boolean,
  active boolean,
  category text,
  location_ready boolean,
  grouping_ready boolean,
  result_code text
)
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_context record;
  v_active boolean := false;
  v_eligible boolean := false;
  v_available boolean := false;
  v_grouping_ready boolean := false;
begin
  select * into v_context
    from private.comun_relata_public_projection_owned_context(
      p_token_hash_hex, p_wallet_item_id
    );

  if not found then
    return query select false, false, null::text, false, false,
      'RELATA_PUBLIC_OPT_IN_NOT_AVAILABLE'::text;
    return;
  end if;

  v_eligible := coalesce((v_context.category in (
    'public_lighting', 'power_distribution', 'smoke_or_environmental_trace'
  )
  and v_context.case_state <> 'withdrawn'
  and v_context.report_withdrawn_at is null
    and v_context.urgency <> 'emergency'
    and v_context.privacy_class in ('public_safe', 'public_after_sanitization')
    and v_context.location_ready), false);

  select c.active into v_active
    from private.comun_relata_public_projection_consents c
    where c.case_id = v_context.case_id;

  -- An active consent remains revocable even if a later withdrawal or
  -- location change makes the report ineligible for future projection.
  v_available := v_eligible or coalesce(v_active, false);

  select exists(
    select 1
      from public.comun_relata_case_memberships m
     where m.individual_case_id = v_context.case_id
       and m.active
  ) into v_grouping_ready;

  return query select
    v_available,
    coalesce(v_active, false),
    case when v_available then v_context.category else null end,
    v_context.location_ready,
    v_grouping_ready,
    case when v_available
      then 'RELATA_PUBLIC_OPT_IN_STATUS_READY'
      else 'RELATA_PUBLIC_OPT_IN_NOT_AVAILABLE'
    end;
end;
$$;

create or replace function public.comun_relata_public_projection_consent_set(
  p_token_hash_hex text,
  p_wallet_item_id uuid,
  p_active boolean
)
returns table (
  available boolean,
  active boolean,
  category text,
  location_ready boolean,
  grouping_ready boolean,
  result_code text
)
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_context record;
  v_eligible boolean := false;
  v_collective_id uuid;
  v_now timestamptz := pg_catalog.now();
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(coalesce(p_wallet_item_id::text, ''), 4861)
  );

  select * into v_context
    from private.comun_relata_public_projection_owned_context(
      p_token_hash_hex, p_wallet_item_id
    );

  if not found then
    return query select false, false, null::text, false, false,
      'RELATA_PUBLIC_OPT_IN_NOT_AVAILABLE'::text;
    return;
  end if;

  v_eligible := coalesce((v_context.category in (
    'public_lighting', 'power_distribution', 'smoke_or_environmental_trace'
  )
  and v_context.case_state <> 'withdrawn'
  and v_context.report_withdrawn_at is null
    and v_context.urgency <> 'emergency'
    and v_context.privacy_class in ('public_safe', 'public_after_sanitization')
    and v_context.location_ready), false);

  if not v_eligible and p_active then
    return query select false, false, null::text, false, false,
      'RELATA_PUBLIC_OPT_IN_NOT_AVAILABLE'::text;
    return;
  end if;

  if p_active then
    insert into private.comun_relata_public_projection_consents(
      case_id, consent_version, scope, active, declared_at, withdrawn_at
    ) values (
      v_context.case_id, 'relata-public-projection-v1', 'collective_projection',
      true, v_now, null
    )
    on conflict (case_id) do update set
      consent_version = excluded.consent_version,
      scope = excluded.scope,
      active = true,
      declared_at = coalesce(
        private.comun_relata_public_projection_consents.declared_at,
        excluded.declared_at
      ),
      withdrawn_at = null;

    select m.collective_case_id into v_collective_id
      from public.comun_relata_case_memberships m
     where m.individual_case_id = v_context.case_id
       and m.active
     order by m.created_at desc
     limit 1
     for update;

    if v_collective_id is null then
      insert into public.comun_relata_collective_cases(
        category, collective_urgency, state, match_rule, match_rule_version,
        active_members_count, first_report_at, last_report_at,
        confidence_level, future_map_eligibility, review_state
      ) values (
        v_context.category, v_context.urgency, 'active',
        'explicit_opt_in_seed', 'relata-match-v1', 0, v_now, v_now,
        'low', false, 'not_requested'
      ) returning id into v_collective_id;

      insert into public.comun_relata_case_memberships(
        collective_case_id, individual_case_id, membership_role,
        association_method, confidence, match_rule_version
      ) values (
        v_collective_id, v_context.case_id, 'seed', 'new_collective_case',
        0.250, 'relata-match-v1'
      );

      update public.comun_relata_collective_cases
         set active_members_count = 1,
             updated_at = v_now
       where id = v_collective_id;
    end if;

    insert into private.comun_participation_wallet_events(
      wallet_id, item_id, event_type, result_code
    ) values (
      v_context.wallet_id, p_wallet_item_id, 'item_updated',
      'WALLET_PUBLIC_PROJECTION_CONSENT_GRANTED'
    );
  else
    update private.comun_relata_public_projection_consents
       set active = false,
           withdrawn_at = coalesce(withdrawn_at, v_now)
     where case_id = v_context.case_id;

    select m.collective_case_id into v_collective_id
      from public.comun_relata_case_memberships m
     where m.individual_case_id = v_context.case_id
       and m.active
     order by m.created_at desc
     limit 1;

    if v_collective_id is not null then
      perform 1 from private.comun_relata_public_projection_recompute(v_collective_id);
    end if;

    insert into private.comun_participation_wallet_events(
      wallet_id, item_id, event_type, result_code
    ) values (
      v_context.wallet_id, p_wallet_item_id, 'item_updated',
      'WALLET_PUBLIC_PROJECTION_CONSENT_REVOKED'
    );
  end if;

  return query select * from public.comun_relata_public_projection_consent_status(
    p_token_hash_hex, p_wallet_item_id
  );
end;
$$;

revoke all on function public.comun_relata_public_projection_consent_status(text, uuid)
  from public, anon, authenticated;
revoke all on function public.comun_relata_public_projection_consent_set(text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.comun_relata_public_projection_consent_status(text, uuid)
  to service_role;
grant execute on function public.comun_relata_public_projection_consent_set(text, uuid, boolean)
  to service_role;

-- Withdrawal of a canonical report must immediately make it stop supporting
-- any existing projection. This does not delete the report or membership.
create or replace function private.comun_relata_recompute_public_projection_after_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_collective_id uuid;
begin
  if new.state = 'withdrawn' and old.state is distinct from new.state then
    for v_collective_id in
      select distinct m.collective_case_id
        from public.comun_relata_case_memberships m
       where m.individual_case_id = new.id
         and m.active
    loop
      perform 1 from private.comun_relata_public_projection_recompute(v_collective_id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists comun_relata_public_projection_withdrawal_recompute
  on public.comun_relata_cases;
create trigger comun_relata_public_projection_withdrawal_recompute
after update of state, withdrawn_at on public.comun_relata_cases
for each row
execute function private.comun_relata_recompute_public_projection_after_withdrawal();

comment on function public.comun_relata_public_projection_consent_set(text, uuid, boolean)
  is '48.6-B1 holder-owned explicit map opt-in; no public map activation or auto-publication.';

commit;
