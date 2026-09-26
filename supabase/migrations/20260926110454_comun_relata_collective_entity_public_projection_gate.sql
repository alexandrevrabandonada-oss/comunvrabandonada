begin;

-- COMUN 49.2-A0-R5. Public-ready sanitized entity projection with a dedicated
-- publisher gate. R4 eligibility is necessary but never sufficient by itself.
do $$
begin
  if to_regclass('private.comun_relata_collective_entity_candidate_reviews') is null
     or to_regclass('private.comun_relata_collective_entity_projection_decisions') is not null
     or to_regclass('public.comun_relata_collective_entity_public_projections') is not null
     or to_regprocedure('public.comun_relata_collective_entity_server_projection_review_queue(uuid)') is not null
     or to_regprocedure('public.comun_relata_collective_entity_server_projection_decide(uuid,uuid,uuid,text,text)') is not null
     or to_regprocedure('public.comun_relata_collective_entity_server_public_projection_list()') is not null then
    raise exception using errcode='P0001',
      message='COMUN_49_2_R5_PROJECTION_SCHEMA_DRIFT';
  end if;
end;
$$;

create table private.comun_relata_collective_entity_projection_decisions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  decision_order bigint generated always as identity unique,
  decision_request_id uuid not null unique,
  candidate_id uuid not null
    references private.comun_relata_collective_entity_candidates(id)
    on delete restrict,
  decision text not null
    check (decision in ('publish','hold','reject')),
  rationale_private text not null
    check (pg_catalog.char_length(pg_catalog.btrim(rationale_private)) between 3 and 1000),
  publisher_profile_id uuid not null
    references public.comun_admin_profiles(id)
    on delete restrict,
  publisher_auth_user_id uuid not null
    references auth.users(id)
    on delete restrict,
  publisher_role text not null
    check (publisher_role='publisher'),
  created_at timestamptz not null default pg_catalog.now()
);

create index comun_relata_projection_decisions_candidate_idx
  on private.comun_relata_collective_entity_projection_decisions(
    candidate_id, decision_order desc
  );

alter table private.comun_relata_collective_entity_projection_decisions
  enable row level security;
alter table private.comun_relata_collective_entity_projection_decisions
  force row level security;
revoke all on table private.comun_relata_collective_entity_projection_decisions
  from public,anon,authenticated,service_role;

create function private.comun_relata_projection_decision_append_only()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  raise exception using errcode='42501',
    message='COMUN_RELATA_PROJECTION_DECISION_APPEND_ONLY';
end;
$$;

create trigger comun_relata_projection_decision_append_only
before update or delete
on private.comun_relata_collective_entity_projection_decisions
for each row execute function private.comun_relata_projection_decision_append_only();

create table public.comun_relata_collective_entity_public_projections (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  candidate_id uuid not null unique
    references private.comun_relata_collective_entity_candidates(id)
    on delete restrict,
  entity_id uuid not null
    references private.comun_relata_collective_entities(id)
    on delete restrict,
  projection_version text not null default 'sanitized-collective-entity-v1'
    check (projection_version='sanitized-collective-entity-v1'),
  public_name text not null
    check (pg_catalog.char_length(pg_catalog.btrim(public_name)) between 3 and 160),
  entity_type text not null
    check (entity_type in ('association','collective','community_group','informal_group','other')),
  projection_state text not null default 'active'
    check (projection_state in ('active','suppressed')),
  activation_decision_id uuid not null
    references private.comun_relata_collective_entity_projection_decisions(id)
    on delete restrict,
  published_at timestamptz not null default pg_catalog.now(),
  state_changed_at timestamptz not null default pg_catalog.now(),
  suppressed_at timestamptz,
  suppression_reason text,
  constraint comun_relata_public_entity_projection_state_shape check (
    (
      projection_state='active'
      and suppressed_at is null
      and suppression_reason is null
    )
    or (
      projection_state='suppressed'
      and suppressed_at is not null
      and suppression_reason in (
        'CANDIDATE_INVALIDATED',
        'LEGITIMACY_CONTESTED',
        'LEGITIMACY_BLOCKED',
        'LEGITIMACY_NEEDS_EVIDENCE',
        'LEGITIMACY_REVIEW_CHANGED',
        'PUBLISHER_HOLD',
        'PUBLISHER_REJECT'
      )
    )
  )
);

create unique index comun_relata_public_entity_one_active_projection
  on public.comun_relata_collective_entity_public_projections(entity_id)
  where projection_state='active';

alter table public.comun_relata_collective_entity_public_projections
  enable row level security;
alter table public.comun_relata_collective_entity_public_projections
  force row level security;
revoke all on table public.comun_relata_collective_entity_public_projections
  from public,anon,authenticated,service_role;

create function private.comun_relata_projection_row_guard()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  if tg_op='DELETE' then
    raise exception using errcode='42501',
      message='COMUN_RELATA_PUBLIC_PROJECTION_DELETE_FORBIDDEN';
  end if;

  if new.id is distinct from old.id
     or new.candidate_id is distinct from old.candidate_id
     or new.entity_id is distinct from old.entity_id
     or new.projection_version is distinct from old.projection_version
     or new.public_name is distinct from old.public_name
     or new.entity_type is distinct from old.entity_type
     or new.published_at is distinct from old.published_at then
    raise exception using errcode='42501',
      message='COMUN_RELATA_PUBLIC_PROJECTION_IMMUTABLE';
  end if;

  if new.projection_state is not distinct from old.projection_state then
    if new.activation_decision_id is distinct from old.activation_decision_id
       or new.state_changed_at is distinct from old.state_changed_at
       or new.suppressed_at is distinct from old.suppressed_at
       or new.suppression_reason is distinct from old.suppression_reason then
      raise exception using errcode='42501',
        message='COMUN_RELATA_PUBLIC_PROJECTION_STATE_CHANGE_REQUIRED';
    end if;
    return new;
  end if;

  if old.projection_state='active' and new.projection_state='suppressed' then
    if new.activation_decision_id is distinct from old.activation_decision_id
       or new.suppressed_at is null
       or new.suppression_reason not in (
         'CANDIDATE_INVALIDATED',
         'LEGITIMACY_CONTESTED',
         'LEGITIMACY_BLOCKED',
         'LEGITIMACY_NEEDS_EVIDENCE',
         'LEGITIMACY_REVIEW_CHANGED',
         'PUBLISHER_HOLD',
         'PUBLISHER_REJECT'
       ) then
      raise exception using errcode='42501',
        message='COMUN_RELATA_PUBLIC_PROJECTION_SUPPRESSION_INVALID';
    end if;
    new.state_changed_at:=pg_catalog.now();
    return new;
  end if;

  if old.projection_state='suppressed' and new.projection_state='active' then
    if new.activation_decision_id is not distinct from old.activation_decision_id
       or new.suppressed_at is not null
       or new.suppression_reason is not null then
      raise exception using errcode='42501',
        message='COMUN_RELATA_PUBLIC_PROJECTION_REACTIVATION_INVALID';
    end if;
    new.state_changed_at:=pg_catalog.now();
    return new;
  end if;

  raise exception using errcode='42501',
    message='COMUN_RELATA_PUBLIC_PROJECTION_TRANSITION_INVALID';
end;
$$;

create trigger comun_relata_public_entity_projection_guard
before update or delete
on public.comun_relata_collective_entity_public_projections
for each row execute function private.comun_relata_projection_row_guard();

create function private.comun_relata_candidate_publisher_profile(
  p_publisher_user_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_profile_id uuid;
begin
  if p_publisher_user_id is null then
    raise exception using errcode='42501',
      message='COMUN_RELATA_CANDIDATE_PUBLISHER_REQUIRED';
  end if;

  select profile.id
    into v_profile_id
    from public.comun_admin_profiles profile
    join public.comun_admin_users admin_user
      on admin_user.user_id=p_publisher_user_id
     and admin_user.is_active
   where profile.auth_user_id=p_publisher_user_id
     and profile.active
     and profile.role='publisher'
   limit 1;

  if v_profile_id is null then
    raise exception using errcode='42501',
      message='COMUN_RELATA_CANDIDATE_PUBLISHER_FORBIDDEN';
  end if;

  return v_profile_id;
end;
$$;

create function private.comun_relata_projection_suppress_if_ineligible(
  p_candidate_id uuid
)
returns void
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_eligibility text;
  v_reason text;
begin
  select snapshot.eligibility_state
    into v_eligibility
    from private.comun_relata_candidate_legitimacy_snapshot(p_candidate_id) snapshot;

  if found and v_eligibility='eligible_for_projection_review' then
    return;
  end if;

  v_reason:=case
    when not found or v_eligibility='invalidated'
      then 'CANDIDATE_INVALIDATED'
    when v_eligibility='contested'
      then 'LEGITIMACY_CONTESTED'
    when v_eligibility='blocked'
      then 'LEGITIMACY_BLOCKED'
    when v_eligibility='needs_evidence'
      then 'LEGITIMACY_NEEDS_EVIDENCE'
    else 'LEGITIMACY_REVIEW_CHANGED'
  end;

  update public.comun_relata_collective_entity_public_projections projection
     set projection_state='suppressed',
         suppressed_at=pg_catalog.now(),
         suppression_reason=v_reason
   where projection.candidate_id=p_candidate_id
     and projection.projection_state='active';
end;
$$;

create function private.comun_relata_projection_review_guard()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  perform private.comun_relata_projection_suppress_if_ineligible(
    new.candidate_id
  );
  return new;
end;
$$;

create trigger comun_relata_projection_suppress_after_review
after insert
on private.comun_relata_collective_entity_candidate_reviews
for each row execute function private.comun_relata_projection_review_guard();

create function private.comun_relata_projection_candidate_guard()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  if new.candidate_state is distinct from old.candidate_state then
    perform private.comun_relata_projection_suppress_if_ineligible(new.id);
  end if;
  return new;
end;
$$;

create trigger comun_relata_projection_suppress_after_candidate_change
after update of candidate_state
on private.comun_relata_collective_entity_candidates
for each row execute function private.comun_relata_projection_candidate_guard();

create function public.comun_relata_collective_entity_server_projection_review_queue(
  p_publisher_user_id uuid
)
returns table(
  candidate_id uuid,
  public_name text,
  entity_type text,
  generated_at timestamptz,
  projection_decision_state text,
  projection_state text
)
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
begin
  perform private.comun_relata_candidate_publisher_profile(
    p_publisher_user_id
  );

  return query
    select candidate.id,candidate.public_name,candidate.entity_type,
      candidate.generated_at,
      coalesce(latest_decision.decision,'pending')::text,
      coalesce(projection.projection_state,'not_published')::text
      from private.comun_relata_collective_entity_candidates candidate
      cross join private.comun_relata_candidate_legitimacy_snapshot(candidate.id)
        snapshot
      left join lateral (
        select decision.decision
          from private.comun_relata_collective_entity_projection_decisions decision
         where decision.candidate_id=candidate.id
         order by decision.decision_order desc
         limit 1
      ) latest_decision on true
      left join lateral (
        select public_projection.projection_state
          from public.comun_relata_collective_entity_public_projections public_projection
         where public_projection.candidate_id=candidate.id
         order by public_projection.published_at desc,public_projection.id desc
         limit 1
      ) projection on true
     where candidate.candidate_state='pending_legitimacy'
       and snapshot.eligibility_state='eligible_for_projection_review'
     order by candidate.generated_at asc,candidate.id asc;
end;
$$;

create function public.comun_relata_collective_entity_server_projection_decide(
  p_request_id uuid,
  p_publisher_user_id uuid,
  p_candidate_id uuid,
  p_decision text,
  p_rationale_private text
)
returns table(
  candidate_id uuid,
  decision text,
  public_projection_id uuid,
  projection_state text,
  public_name text,
  entity_type text
)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_profile_id uuid;
  v_rationale text:=nullif(
    pg_catalog.btrim(coalesce(p_rationale_private,'')),
    ''
  );
  v_candidate private.comun_relata_collective_entity_candidates%rowtype;
  v_existing private.comun_relata_collective_entity_projection_decisions%rowtype;
  v_decision private.comun_relata_collective_entity_projection_decisions%rowtype;
  v_projection public.comun_relata_collective_entity_public_projections%rowtype;
  v_eligibility text;
begin
  if p_request_id is null
     or p_candidate_id is null
     or p_decision not in ('publish','hold','reject')
     or v_rationale is null
     or pg_catalog.char_length(v_rationale) not between 3 and 1000 then
    raise exception using errcode='22023',
      message='COMUN_RELATA_PROJECTION_DECISION_INPUT_INVALID';
  end if;

  v_profile_id:=private.comun_relata_candidate_publisher_profile(
    p_publisher_user_id
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text,4921007)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_candidate_id::text,4921008)
  );

  select decision_row.*
    into v_existing
    from private.comun_relata_collective_entity_projection_decisions decision_row
   where decision_row.decision_request_id=p_request_id
   for update;

  if found then
    if v_existing.candidate_id<>p_candidate_id
       or v_existing.decision<>p_decision
       or v_existing.rationale_private<>v_rationale
       or v_existing.publisher_profile_id<>v_profile_id
       or v_existing.publisher_auth_user_id<>p_publisher_user_id
       or v_existing.publisher_role<>'publisher' then
      raise exception using errcode='22023',
        message='COMUN_RELATA_PROJECTION_DECISION_REQUEST_CONFLICT';
    end if;

    select candidate_row.*
      into v_candidate
      from private.comun_relata_collective_entity_candidates candidate_row
     where candidate_row.id=p_candidate_id;

    select public_projection.*
      into v_projection
      from public.comun_relata_collective_entity_public_projections public_projection
     where public_projection.candidate_id=p_candidate_id
     order by public_projection.published_at desc,public_projection.id desc
     limit 1;

    return query select
      p_candidate_id,
      v_existing.decision,
      v_projection.id,
      coalesce(v_projection.projection_state,'not_published')::text,
      v_candidate.public_name,
      v_candidate.entity_type;
    return;
  end if;

  select candidate_row.*
    into v_candidate
    from private.comun_relata_collective_entity_candidates candidate_row
   where candidate_row.id=p_candidate_id
   for update;

  if not found or v_candidate.candidate_state<>'pending_legitimacy' then
    raise exception using errcode='42501',
      message='COMUN_RELATA_PROJECTION_REVIEW_UNAVAILABLE';
  end if;

  if exists (
    select 1
      from private.comun_relata_collective_entity_representations representation
     where representation.id=v_candidate.source_representation_id
       and representation.user_id=p_publisher_user_id
  ) then
    raise exception using errcode='42501',
      message='COMUN_RELATA_PROJECTION_SELF_PUBLISH_FORBIDDEN';
  end if;

  select snapshot.eligibility_state
    into v_eligibility
    from private.comun_relata_candidate_legitimacy_snapshot(
      p_candidate_id
    ) snapshot;

  if v_eligibility is distinct from 'eligible_for_projection_review' then
    raise exception using errcode='42501',
      message='COMUN_RELATA_PROJECTION_REVIEW_UNAVAILABLE';
  end if;

  insert into private.comun_relata_collective_entity_projection_decisions(
    decision_request_id,candidate_id,decision,rationale_private,
    publisher_profile_id,publisher_auth_user_id,publisher_role
  ) values(
    p_request_id,p_candidate_id,p_decision,v_rationale,
    v_profile_id,p_publisher_user_id,'publisher'
  ) returning * into v_decision;

  select public_projection.*
    into v_projection
    from public.comun_relata_collective_entity_public_projections public_projection
   where public_projection.candidate_id=p_candidate_id
   order by public_projection.published_at desc,public_projection.id desc
   limit 1
   for update;

  if p_decision='publish' then
    if v_projection.id is null then
      insert into public.comun_relata_collective_entity_public_projections(
        candidate_id,entity_id,public_name,entity_type,activation_decision_id
      ) values(
        v_candidate.id,v_candidate.entity_id,v_candidate.public_name,
        v_candidate.entity_type,v_decision.id
      ) returning * into v_projection;
    elsif v_projection.projection_state='suppressed' then
      update public.comun_relata_collective_entity_public_projections
         set projection_state='active',
             activation_decision_id=v_decision.id,
             suppressed_at=null,
             suppression_reason=null
       where id=v_projection.id
       returning * into v_projection;
    end if;
  else
    if v_projection.id is not null
       and v_projection.projection_state='active' then
      update public.comun_relata_collective_entity_public_projections
         set projection_state='suppressed',
             suppressed_at=pg_catalog.now(),
             suppression_reason=case
               when p_decision='hold' then 'PUBLISHER_HOLD'
               else 'PUBLISHER_REJECT'
             end
       where id=v_projection.id
       returning * into v_projection;
    end if;
  end if;

  return query select
    p_candidate_id,
    v_decision.decision,
    v_projection.id,
    coalesce(v_projection.projection_state,'not_published')::text,
    v_candidate.public_name,
    v_candidate.entity_type;
end;
$$;

create function public.comun_relata_collective_entity_server_public_projection_list()
returns table(
  projection_id uuid,
  public_name text,
  entity_type text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path=pg_catalog
as $$
  select projection.id,projection.public_name,projection.entity_type,
    projection.published_at
    from public.comun_relata_collective_entity_public_projections projection
    cross join private.comun_relata_candidate_legitimacy_snapshot(
      projection.candidate_id
    ) snapshot
   where projection.projection_state='active'
     and snapshot.eligibility_state='eligible_for_projection_review'
   order by projection.public_name asc,projection.id asc;
$$;

alter function private.comun_relata_projection_decision_append_only()
  owner to postgres;
alter function private.comun_relata_projection_row_guard()
  owner to postgres;
alter function private.comun_relata_candidate_publisher_profile(uuid)
  owner to postgres;
alter function private.comun_relata_projection_suppress_if_ineligible(uuid)
  owner to postgres;
alter function private.comun_relata_projection_review_guard()
  owner to postgres;
alter function private.comun_relata_projection_candidate_guard()
  owner to postgres;
alter function public.comun_relata_collective_entity_server_projection_review_queue(uuid)
  owner to postgres;
alter function public.comun_relata_collective_entity_server_projection_decide(
  uuid,uuid,uuid,text,text
) owner to postgres;
alter function public.comun_relata_collective_entity_server_public_projection_list()
  owner to postgres;

revoke all on function
  private.comun_relata_projection_decision_append_only(),
  private.comun_relata_projection_row_guard(),
  private.comun_relata_candidate_publisher_profile(uuid),
  private.comun_relata_projection_suppress_if_ineligible(uuid),
  private.comun_relata_projection_review_guard(),
  private.comun_relata_projection_candidate_guard()
from public,anon,authenticated,service_role;

revoke all on function
  public.comun_relata_collective_entity_server_projection_review_queue(uuid),
  public.comun_relata_collective_entity_server_projection_decide(
    uuid,uuid,uuid,text,text
  ),
  public.comun_relata_collective_entity_server_public_projection_list()
from public,anon,authenticated;

grant execute on function
  public.comun_relata_collective_entity_server_projection_review_queue(uuid),
  public.comun_relata_collective_entity_server_projection_decide(
    uuid,uuid,uuid,text,text
  ),
  public.comun_relata_collective_entity_server_public_projection_list()
to service_role;

comment on table private.comun_relata_collective_entity_projection_decisions is
  'R5 append-only publisher decisions. R4 eligibility alone never publishes.';
comment on table public.comun_relata_collective_entity_public_projections is
  'R5 sanitized entity projection storage. No direct client grants and no map authority.';
comment on function public.comun_relata_collective_entity_server_projection_review_queue(uuid) is
  'R5 publisher-only queue. It exposes only sanitized candidates already eligible for projection review.';
comment on function public.comun_relata_collective_entity_server_projection_decide(uuid,uuid,uuid,text,text) is
  'R5 publisher-only decision bridge. Publisher identity is server-derived; self-publication is forbidden.';
comment on function public.comun_relata_collective_entity_server_public_projection_list() is
  'R5 server-only sanitized public-ready projection list. It returns no candidate, entity, reviewer, consent, evidence, report or location identifiers.';

commit;
