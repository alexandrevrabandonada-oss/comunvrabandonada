begin;

-- COMUN 49.2-A0-R4. Private legitimacy and eligibility review only.
-- R4 never mutates the R3 candidate snapshot and never publishes anything.
do $$
begin
  if to_regclass('private.comun_relata_collective_entity_candidates') is null
     or to_regclass('public.comun_admin_profiles') is null
     or to_regclass('private.comun_relata_collective_entity_candidate_reviews') is not null
     or to_regprocedure('public.comun_relata_collective_entity_server_candidate_review(uuid,uuid,uuid,text,text,text,text)') is not null
     or to_regprocedure('public.comun_relata_collective_entity_server_candidate_review_queue(uuid)') is not null
     or to_regprocedure('public.comun_relata_entity_server_candidate_legitimacy_list_own(uuid)') is not null then
    raise exception using errcode='P0001',
      message='COMUN_49_2_R4_LEGITIMACY_SCHEMA_DRIFT';
  end if;
end;
$$;

create table private.comun_relata_collective_entity_candidate_reviews (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  review_request_id uuid not null unique,
  candidate_id uuid not null
    references private.comun_relata_collective_entity_candidates(id)
    on delete restrict,
  review_stage text not null
    check (review_stage in ('entity_existence','representation_legitimacy')),
  decision text not null
    check (decision in ('supported','needs_evidence','contested','unsupported')),
  basis_kind text not null
    check (basis_kind in (
      'public_source',
      'existing_comun_record',
      'operational_confirmation',
      'community_confirmation',
      'insufficient_or_conflicting'
    )),
  basis_reference_private text
    check (
      basis_reference_private is null
      or pg_catalog.char_length(pg_catalog.btrim(basis_reference_private))
        between 3 and 1000
    ),
  reviewer_profile_id uuid not null
    references public.comun_admin_profiles(id)
    on delete restrict,
  reviewer_auth_user_id uuid not null
    references auth.users(id)
    on delete restrict,
  reviewer_role text not null
    check (reviewer_role in ('admin','editor','factual_reviewer')),
  created_at timestamptz not null default pg_catalog.now(),
  constraint comun_relata_candidate_review_basis_shape check (
    (
      decision='supported'
      and basis_kind<>'insufficient_or_conflicting'
      and basis_reference_private is not null
    )
    or (
      decision='needs_evidence'
      and basis_kind='insufficient_or_conflicting'
    )
    or (
      decision='contested'
      and basis_kind='insufficient_or_conflicting'
      and basis_reference_private is not null
    )
    or (
      decision='unsupported'
      and basis_reference_private is not null
    )
  )
);

create index comun_relata_candidate_reviews_candidate_stage_idx
  on private.comun_relata_collective_entity_candidate_reviews(
    candidate_id, review_stage, created_at desc, id desc
  );

create index comun_relata_candidate_reviews_reviewer_idx
  on private.comun_relata_collective_entity_candidate_reviews(
    reviewer_profile_id, created_at desc
  );

alter table private.comun_relata_collective_entity_candidate_reviews
  enable row level security;
alter table private.comun_relata_collective_entity_candidate_reviews
  force row level security;
revoke all on table private.comun_relata_collective_entity_candidate_reviews
  from public,anon,authenticated,service_role;

create function private.comun_relata_candidate_review_append_only()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  raise exception using errcode='42501',
    message='COMUN_RELATA_CANDIDATE_REVIEW_APPEND_ONLY';
end;
$$;

create trigger comun_relata_candidate_review_append_only
before update or delete
on private.comun_relata_collective_entity_candidate_reviews
for each row execute function private.comun_relata_candidate_review_append_only();

create function private.comun_relata_candidate_reviewer_profile(
  p_reviewer_user_id uuid
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
  if p_reviewer_user_id is null then
    raise exception using errcode='42501',
      message='COMUN_RELATA_CANDIDATE_REVIEWER_REQUIRED';
  end if;

  select profile.id
    into v_profile_id
    from public.comun_admin_profiles profile
    join public.comun_admin_users admin_user
      on admin_user.user_id=p_reviewer_user_id
     and admin_user.is_active
   where profile.auth_user_id=p_reviewer_user_id
     and profile.active
     and profile.role in ('admin','editor','factual_reviewer')
   limit 1;

  if v_profile_id is null then
    raise exception using errcode='42501',
      message='COMUN_RELATA_CANDIDATE_REVIEWER_FORBIDDEN';
  end if;

  return v_profile_id;
end;
$$;

create function private.comun_relata_candidate_legitimacy_snapshot(
  p_candidate_id uuid
)
returns table(
  candidate_id uuid,
  entity_existence_state text,
  representation_legitimacy_state text,
  eligibility_state text
)
language sql
stable
security definer
set search_path=pg_catalog
as $$
  with entity_review as (
    select review.decision,review.reviewer_profile_id
      from private.comun_relata_collective_entity_candidate_reviews review
     where review.candidate_id=p_candidate_id
       and review.review_stage='entity_existence'
     order by review.created_at desc,review.id desc
     limit 1
  ),
  representation_review as (
    select review.decision,review.reviewer_profile_id
      from private.comun_relata_collective_entity_candidate_reviews review
     where review.candidate_id=p_candidate_id
       and review.review_stage='representation_legitimacy'
     order by review.created_at desc,review.id desc
     limit 1
  )
  select
    candidate.id,
    coalesce(entity_review.decision,'pending')::text,
    coalesce(representation_review.decision,'pending')::text,
    case
      when candidate.candidate_state<>'pending_legitimacy'
        then 'invalidated'
      when entity.state<>'active'
        or representation.status='revoked'
        or consent.id is null
        or not consent.active
        or consent.consent_version<>'relata-collective-public-projection-v1'
        or consent.consent_scope<>'sanitized_entity_projection'
        or consent.consent_notice_sha256<>'0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae'
        then 'blocked'
      when entity_review.decision='contested'
        or representation_review.decision='contested'
        then 'contested'
      when entity_review.decision='unsupported'
        or representation_review.decision='unsupported'
        then 'blocked'
      when entity_review.decision='needs_evidence'
        or representation_review.decision='needs_evidence'
        then 'needs_evidence'
      when entity_review.decision='supported'
        and representation_review.decision='supported'
        and entity_review.reviewer_profile_id=
          representation_review.reviewer_profile_id
        then 'needs_independent_review'
      when entity_review.decision='supported'
        and representation_review.decision='supported'
        then 'eligible_for_projection_review'
      else 'pending_review'
    end::text
  from private.comun_relata_collective_entity_candidates candidate
  join private.comun_relata_collective_entities entity
    on entity.id=candidate.entity_id
  join private.comun_relata_collective_entity_representations representation
    on representation.id=candidate.source_representation_id
   and representation.entity_id=candidate.entity_id
  left join private.comun_relata_collective_entity_consents consent
    on consent.id=candidate.source_consent_id
   and consent.entity_id=candidate.entity_id
   and consent.representation_id=candidate.source_representation_id
  left join entity_review on true
  left join representation_review on true
  where candidate.id=p_candidate_id;
$$;

create function public.comun_relata_collective_entity_server_candidate_review(
  p_request_id uuid,
  p_reviewer_user_id uuid,
  p_candidate_id uuid,
  p_review_stage text,
  p_decision text,
  p_basis_kind text,
  p_basis_reference_private text
)
returns table(
  candidate_id uuid,
  entity_existence_state text,
  representation_legitimacy_state text,
  eligibility_state text
)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_profile_id uuid;
  v_reviewer_role text;
  v_reference text:=nullif(pg_catalog.btrim(coalesce(p_basis_reference_private,'')),'');
  v_candidate private.comun_relata_collective_entity_candidates%rowtype;
  v_existing private.comun_relata_collective_entity_candidate_reviews%rowtype;
begin
  if p_request_id is null or p_candidate_id is null
     or p_review_stage not in ('entity_existence','representation_legitimacy')
     or p_decision not in ('supported','needs_evidence','contested','unsupported')
     or p_basis_kind not in (
       'public_source','existing_comun_record','operational_confirmation',
       'community_confirmation','insufficient_or_conflicting'
     )
     or (v_reference is not null and pg_catalog.char_length(v_reference) not between 3 and 1000)
     or (p_decision='supported' and
       (p_basis_kind='insufficient_or_conflicting' or v_reference is null))
     or (p_decision='needs_evidence' and p_basis_kind<>'insufficient_or_conflicting')
     or (p_decision='contested' and
       (p_basis_kind<>'insufficient_or_conflicting' or v_reference is null))
     or (p_decision='unsupported' and v_reference is null) then
    raise exception using errcode='22023',
      message='COMUN_RELATA_CANDIDATE_REVIEW_INPUT_INVALID';
  end if;

  v_profile_id:=private.comun_relata_candidate_reviewer_profile(
    p_reviewer_user_id
  );
  select profile.role
    into v_reviewer_role
    from public.comun_admin_profiles profile
   where profile.id=v_profile_id;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text,4921005)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_candidate_id::text,4921006)
  );

  select review.*
    into v_existing
    from private.comun_relata_collective_entity_candidate_reviews review
   where review.review_request_id=p_request_id
   for update;

  if found then
    if v_existing.candidate_id<>p_candidate_id
       or v_existing.review_stage<>p_review_stage
       or v_existing.decision<>p_decision
       or v_existing.basis_kind<>p_basis_kind
       or pg_catalog.coalesce(v_existing.basis_reference_private,'')<>
          pg_catalog.coalesce(v_reference,'')
       or v_existing.reviewer_profile_id<>v_profile_id
       or v_existing.reviewer_auth_user_id<>p_reviewer_user_id
       or v_existing.reviewer_role<>v_reviewer_role then
      raise exception using errcode='22023',
        message='COMUN_RELATA_CANDIDATE_REVIEW_REQUEST_CONFLICT';
    end if;

    return query
      select snapshot.candidate_id,snapshot.entity_existence_state,
        snapshot.representation_legitimacy_state,snapshot.eligibility_state
        from private.comun_relata_candidate_legitimacy_snapshot(
          p_candidate_id
        ) snapshot;
    return;
  end if;

  select candidate.*
    into v_candidate
    from private.comun_relata_collective_entity_candidates candidate
   where candidate.id=p_candidate_id
   for update;

  if not found or v_candidate.candidate_state<>'pending_legitimacy' then
    raise exception using errcode='42501',
      message='COMUN_RELATA_CANDIDATE_REVIEW_UNAVAILABLE';
  end if;

  if exists (
    select 1
      from private.comun_relata_collective_entity_representations representation
     where representation.id=v_candidate.source_representation_id
       and representation.user_id=p_reviewer_user_id
  ) then
    raise exception using errcode='42501',
      message='COMUN_RELATA_CANDIDATE_SELF_REVIEW_FORBIDDEN';
  end if;

  insert into private.comun_relata_collective_entity_candidate_reviews(
    review_request_id,candidate_id,review_stage,decision,basis_kind,
    basis_reference_private,reviewer_profile_id,reviewer_auth_user_id,
    reviewer_role
  ) values(
    p_request_id,p_candidate_id,p_review_stage,p_decision,p_basis_kind,
    v_reference,v_profile_id,p_reviewer_user_id,v_reviewer_role
  );

  return query
    select snapshot.candidate_id,snapshot.entity_existence_state,
      snapshot.representation_legitimacy_state,snapshot.eligibility_state
      from private.comun_relata_candidate_legitimacy_snapshot(
        p_candidate_id
      ) snapshot;
end;
$$;

create function public.comun_relata_collective_entity_server_candidate_review_queue(
  p_reviewer_user_id uuid
)
returns table(
  candidate_id uuid,
  public_name text,
  entity_type text,
  candidate_state text,
  generated_at timestamptz,
  entity_existence_state text,
  representation_legitimacy_state text,
  eligibility_state text
)
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
begin
  perform private.comun_relata_candidate_reviewer_profile(
    p_reviewer_user_id
  );

  return query
    select candidate.id,candidate.public_name,candidate.entity_type,
      candidate.candidate_state,candidate.generated_at,
      snapshot.entity_existence_state,
      snapshot.representation_legitimacy_state,
      snapshot.eligibility_state
      from private.comun_relata_collective_entity_candidates candidate
      cross join lateral
        private.comun_relata_candidate_legitimacy_snapshot(candidate.id)
        snapshot
     where candidate.candidate_state='pending_legitimacy'
     order by candidate.generated_at asc,candidate.id asc;
end;
$$;

create function public.comun_relata_entity_server_candidate_legitimacy_list_own(
  p_actor_user_id uuid
)
returns table(
  candidate_id uuid,
  entity_id uuid,
  public_name text,
  entity_type text,
  candidate_state text,
  generated_at timestamptz,
  invalidated_at timestamptz,
  invalidation_reason text,
  entity_existence_state text,
  representation_legitimacy_state text,
  eligibility_state text
)
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
begin
  perform private.comun_relata_entity_assert_internal_actor(
    p_actor_user_id
  );

  return query
    select candidate.id,candidate.entity_id,candidate.public_name,
      candidate.entity_type,candidate.candidate_state,candidate.generated_at,
      candidate.invalidated_at,candidate.invalidation_reason,
      snapshot.entity_existence_state,
      snapshot.representation_legitimacy_state,
      snapshot.eligibility_state
      from private.comun_relata_collective_entity_candidates candidate
      join private.comun_relata_collective_entity_representations representation
        on representation.id=candidate.source_representation_id
       and representation.user_id=p_actor_user_id
      cross join lateral
        private.comun_relata_candidate_legitimacy_snapshot(candidate.id)
        snapshot
     order by candidate.generated_at desc,candidate.id desc;
end;
$$;

alter function private.comun_relata_candidate_review_append_only()
  owner to postgres;
alter function private.comun_relata_candidate_reviewer_profile(uuid)
  owner to postgres;
alter function private.comun_relata_candidate_legitimacy_snapshot(uuid)
  owner to postgres;
alter function public.comun_relata_collective_entity_server_candidate_review(
  uuid,uuid,uuid,text,text,text,text
) owner to postgres;
alter function public.comun_relata_collective_entity_server_candidate_review_queue(
  uuid
) owner to postgres;
alter function public.comun_relata_entity_server_candidate_legitimacy_list_own(
  uuid
) owner to postgres;

revoke all on function
  private.comun_relata_candidate_review_append_only(),
  private.comun_relata_candidate_reviewer_profile(uuid),
  private.comun_relata_candidate_legitimacy_snapshot(uuid)
from public,anon,authenticated,service_role;

revoke all on function
  public.comun_relata_collective_entity_server_candidate_review(
    uuid,uuid,uuid,text,text,text,text
  ),
  public.comun_relata_collective_entity_server_candidate_review_queue(uuid),
  public.comun_relata_entity_server_candidate_legitimacy_list_own(uuid)
from public,anon,authenticated;

grant execute on function
  public.comun_relata_collective_entity_server_candidate_review(
    uuid,uuid,uuid,text,text,text,text
  ),
  public.comun_relata_collective_entity_server_candidate_review_queue(uuid),
  public.comun_relata_entity_server_candidate_legitimacy_list_own(uuid)
to service_role;

comment on table private.comun_relata_collective_entity_candidate_reviews is
  'R4 append-only private legitimacy reviews. They never publish a candidate.';
comment on function public.comun_relata_collective_entity_server_candidate_review(
  uuid,uuid,uuid,text,text,text,text
) is
  'R4 service-only review bridge. Reviewer identity comes from the authenticated server session and self-review is forbidden.';
comment on function public.comun_relata_collective_entity_server_candidate_review_queue(uuid) is
  'R4 service-only private queue. It exposes sanitized candidate snapshots and derived review states only.';
comment on function public.comun_relata_entity_server_candidate_legitimacy_list_own(uuid) is
  'R4 owner-only private status bridge. Eligibility means only eligible_for_projection_review and is not publication authority.';

commit;
