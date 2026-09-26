begin;

-- COMUN 49.2-A0-R5. Explicit public projection gate for a sanitized collective
-- entity candidate that has already reached R4 eligible_for_projection_review.
-- R5 publishes only name + entity type + projection id + publication time.
-- It never opens the public map and never links reports, evidence or locations.
do $$
begin
  if to_regclass('private.comun_relata_collective_entity_candidates') is null
     or to_regclass('private.comun_relata_collective_entity_candidate_reviews') is null
     or to_regprocedure('private.comun_relata_candidate_legitimacy_snapshot(uuid)') is null
     or to_regclass('private.comun_relata_collective_entity_projection_decisions') is not null
     or to_regclass('private.comun_relata_collective_entity_projection_registry') is not null
     or to_regclass('private.comun_relata_collective_entity_projection_events') is not null
     or to_regclass('public.comun_relata_collective_entity_public_projections') is not null
     or to_regprocedure('public.comun_relata_collective_entity_server_projection_review_queue(uuid)') is not null
     or to_regprocedure('public.comun_relata_collective_entity_server_projection_decide(uuid,uuid,uuid,text,text)') is not null
     or to_regprocedure('public.comun_relata_entity_server_projection_list_own(uuid)') is not null then
    raise exception using errcode='P0001',
      message='COMUN_49_2_R5_PUBLIC_PROJECTION_SCHEMA_DRIFT';
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
    check (decision in ('approved','needs_changes','rejected','withdrawn')),
  note_private text
    check (
      note_private is null
      or pg_catalog.char_length(pg_catalog.btrim(note_private)) between 3 and 2000
    ),
  publisher_profile_id uuid not null
    references public.comun_admin_profiles(id)
    on delete restrict,
  publisher_auth_user_id uuid not null
    references auth.users(id)
    on delete restrict,
  publisher_role text not null
    check (publisher_role in ('admin','publisher')),
  created_at timestamptz not null default pg_catalog.now(),
  constraint comun_relata_projection_decision_note_shape check (
    decision='approved'
    or (
      decision in ('needs_changes','rejected','withdrawn')
      and note_private is not null
    )
  )
);

create index comun_relata_projection_decisions_candidate_idx
  on private.comun_relata_collective_entity_projection_decisions(
    candidate_id, decision_order desc
  );

create table private.comun_relata_collective_entity_projection_registry (
  candidate_id uuid primary key
    references private.comun_relata_collective_entity_candidates(id)
    on delete restrict,
  projection_id uuid not null unique,
  state text not null
    check (state in ('active','withdrawn')),
  published_at timestamptz not null,
  last_decision_request_id uuid not null
    references private.comun_relata_collective_entity_projection_decisions(
      decision_request_id
    )
    on delete restrict,
  withdrawn_at timestamptz,
  withdrawal_reason text
    check (
      withdrawal_reason is null
      or pg_catalog.char_length(pg_catalog.btrim(withdrawal_reason))
        between 3 and 2000
    ),
  constraint comun_relata_projection_registry_state_shape check (
    (
      state='active'
      and withdrawn_at is null
      and withdrawal_reason is null
    )
    or (
      state='withdrawn'
      and withdrawn_at is not null
      and withdrawal_reason is not null
    )
  )
);

create table private.comun_relata_collective_entity_projection_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  event_order bigint generated always as identity unique,
  candidate_id uuid not null
    references private.comun_relata_collective_entity_candidates(id)
    on delete restrict,
  projection_id uuid not null,
  event_type text not null
    check (event_type in ('published','withdrawn')),
  decision_request_id uuid
    references private.comun_relata_collective_entity_projection_decisions(
      decision_request_id
    )
    on delete restrict,
  actor_profile_id uuid
    references public.comun_admin_profiles(id)
    on delete restrict,
  actor_auth_user_id uuid
    references auth.users(id)
    on delete restrict,
  actor_role text
    check (actor_role is null or actor_role in ('admin','publisher')),
  reason_private text
    check (
      reason_private is null
      or pg_catalog.char_length(pg_catalog.btrim(reason_private))
        between 3 and 2000
    ),
  occurred_at timestamptz not null default pg_catalog.now(),
  constraint comun_relata_projection_event_shape check (
    (
      event_type='published'
      and decision_request_id is not null
      and actor_profile_id is not null
      and actor_auth_user_id is not null
      and actor_role is not null
      and reason_private is null
    )
    or (
      event_type='withdrawn'
      and reason_private is not null
      and (
        (
          decision_request_id is not null
          and actor_profile_id is not null
          and actor_auth_user_id is not null
          and actor_role is not null
        )
        or (
          decision_request_id is null
          and actor_profile_id is null
          and actor_auth_user_id is null
          and actor_role is null
        )
      )
    )
  )
);

create index comun_relata_projection_events_candidate_idx
  on private.comun_relata_collective_entity_projection_events(
    candidate_id, event_order desc
  );

alter table private.comun_relata_collective_entity_projection_decisions
  enable row level security;
alter table private.comun_relata_collective_entity_projection_decisions
  force row level security;
alter table private.comun_relata_collective_entity_projection_registry
  enable row level security;
alter table private.comun_relata_collective_entity_projection_registry
  force row level security;
alter table private.comun_relata_collective_entity_projection_events
  enable row level security;
alter table private.comun_relata_collective_entity_projection_events
  force row level security;

revoke all on table
  private.comun_relata_collective_entity_projection_decisions,
  private.comun_relata_collective_entity_projection_registry,
  private.comun_relata_collective_entity_projection_events
from public,anon,authenticated,service_role;

create table public.comun_relata_collective_entity_public_projections (
  projection_id uuid primary key,
  public_name text not null
    check (pg_catalog.char_length(pg_catalog.btrim(public_name)) between 3 and 160),
  entity_type text not null
    check (
      entity_type in (
        'association','collective','community_group','informal_group','other'
      )
    ),
  published_at timestamptz not null
);

alter table public.comun_relata_collective_entity_public_projections
  enable row level security;
alter table public.comun_relata_collective_entity_public_projections
  force row level security;
revoke all on table public.comun_relata_collective_entity_public_projections
  from public,anon,authenticated,service_role;
grant select on table public.comun_relata_collective_entity_public_projections
  to anon,authenticated,service_role;

create policy comun_relata_collective_entity_public_projection_read
on public.comun_relata_collective_entity_public_projections
for select
to anon,authenticated
using (true);

create function private.comun_relata_projection_append_only()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  raise exception using errcode='42501',
    message='COMUN_RELATA_ENTITY_PROJECTION_AUDIT_APPEND_ONLY';
end;
$$;

create trigger comun_relata_projection_decisions_append_only
before update or delete
on private.comun_relata_collective_entity_projection_decisions
for each row execute function private.comun_relata_projection_append_only();

create trigger comun_relata_projection_events_append_only
before update or delete
on private.comun_relata_collective_entity_projection_events
for each row execute function private.comun_relata_projection_append_only();

create function private.comun_relata_projection_publisher_profile(
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
      message='COMUN_RELATA_ENTITY_PUBLISHER_REQUIRED';
  end if;

  select profile.id
    into v_profile_id
    from public.comun_admin_profiles profile
    join public.comun_admin_users admin_user
      on admin_user.user_id=p_publisher_user_id
     and admin_user.is_active
   where profile.auth_user_id=p_publisher_user_id
     and profile.active
     and profile.role in ('admin','publisher')
   limit 1;

  if v_profile_id is null then
    raise exception using errcode='42501',
      message='COMUN_RELATA_ENTITY_PUBLISHER_FORBIDDEN';
  end if;

  return v_profile_id;
end;
$$;

create function private.comun_relata_candidate_latest_reviewer_profiles(
  p_candidate_id uuid
)
returns table(
  entity_reviewer_profile_id uuid,
  representation_reviewer_profile_id uuid
)
language sql
stable
security definer
set search_path=pg_catalog
as $$
  select
    (
      select review.reviewer_profile_id
        from private.comun_relata_collective_entity_candidate_reviews review
       where review.candidate_id=p_candidate_id
         and review.review_stage='entity_existence'
       order by review.review_order desc
       limit 1
    ),
    (
      select review.reviewer_profile_id
        from private.comun_relata_collective_entity_candidate_reviews review
       where review.candidate_id=p_candidate_id
         and review.review_stage='representation_legitimacy'
       order by review.review_order desc
       limit 1
    );
$$;

create function private.comun_relata_collective_entity_projection_reconcile_candidate(
  p_candidate_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_registry private.comun_relata_collective_entity_projection_registry%rowtype;
  v_eligibility text;
  v_reason text:=nullif(pg_catalog.btrim(coalesce(p_reason,'')),'');
begin
  select registry.*
    into v_registry
    from private.comun_relata_collective_entity_projection_registry registry
   where registry.candidate_id=p_candidate_id
     and registry.state='active'
   for update;

  if not found then
    return;
  end if;

  select snapshot.eligibility_state
    into v_eligibility
    from private.comun_relata_candidate_legitimacy_snapshot(p_candidate_id)
      snapshot;

  if v_eligibility='eligible_for_projection_review' then
    return;
  end if;

  if v_reason is null then
    v_reason:='ELIGIBILITY_LOST';
  end if;
  v_reason:=pg_catalog.substr(
    v_reason || ':' || coalesce(v_eligibility,'missing_candidate'),
    1,2000
  );

  delete from public.comun_relata_collective_entity_public_projections
   where projection_id=v_registry.projection_id;

  update private.comun_relata_collective_entity_projection_registry
     set state='withdrawn',
         withdrawn_at=pg_catalog.now(),
         withdrawal_reason=v_reason
   where candidate_id=p_candidate_id;

  insert into private.comun_relata_collective_entity_projection_events(
    candidate_id,projection_id,event_type,reason_private
  ) values(
    p_candidate_id,v_registry.projection_id,'withdrawn',v_reason
  );
end;
$$;

create function private.comun_relata_projection_reconcile_from_review()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  perform private.comun_relata_collective_entity_projection_reconcile_candidate(
    new.candidate_id,
    'LEGITIMACY_REVIEW_CHANGED'
  );
  return new;
end;
$$;

create trigger comun_relata_projection_reconcile_after_review
after insert
on private.comun_relata_collective_entity_candidate_reviews
for each row execute function private.comun_relata_projection_reconcile_from_review();

create function private.comun_relata_projection_reconcile_from_candidate()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  if old.candidate_state is distinct from new.candidate_state then
    perform private.comun_relata_collective_entity_projection_reconcile_candidate(
      new.id,
      coalesce(new.invalidation_reason,'CANDIDATE_STATE_CHANGED')
    );
  end if;
  return new;
end;
$$;

create trigger comun_relata_projection_reconcile_after_candidate
after update of candidate_state
on private.comun_relata_collective_entity_candidates
for each row execute function private.comun_relata_projection_reconcile_from_candidate();

create function public.comun_relata_collective_entity_server_projection_review_queue(
  p_publisher_user_id uuid
)
returns table(
  candidate_id uuid,
  public_name text,
  entity_type text,
  generated_at timestamptz,
  eligibility_state text,
  projection_state text,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id:=private.comun_relata_projection_publisher_profile(
    p_publisher_user_id
  );

  return query
    select candidate.id,candidate.public_name,candidate.entity_type,
      candidate.generated_at,snapshot.eligibility_state,
      coalesce(registry.state,'not_published')::text,
      registry.published_at
      from private.comun_relata_collective_entity_candidates candidate
      join private.comun_relata_collective_entity_representations representation
        on representation.id=candidate.source_representation_id
      cross join private.comun_relata_candidate_legitimacy_snapshot(candidate.id)
        snapshot
      cross join private.comun_relata_candidate_latest_reviewer_profiles(
        candidate.id
      ) reviewers
      left join private.comun_relata_collective_entity_projection_registry
        registry on registry.candidate_id=candidate.id
     where candidate.candidate_state='pending_legitimacy'
       and snapshot.eligibility_state='eligible_for_projection_review'
       and representation.user_id<>p_publisher_user_id
       and reviewers.entity_reviewer_profile_id<>v_profile_id
       and reviewers.representation_reviewer_profile_id<>v_profile_id
       and coalesce(registry.state,'withdrawn')<>'active'
     order by candidate.generated_at asc,candidate.id asc;
end;
$$;

create function public.comun_relata_collective_entity_server_projection_decide(
  p_request_id uuid,
  p_publisher_user_id uuid,
  p_candidate_id uuid,
  p_decision text,
  p_note_private text
)
returns table(
  candidate_id uuid,
  decision text,
  projection_id uuid,
  projection_state text,
  published_at timestamptz,
  withdrawn_at timestamptz
)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_profile_id uuid;
  v_publisher_role text;
  v_note text:=nullif(pg_catalog.btrim(coalesce(p_note_private,'')),'');
  v_candidate private.comun_relata_collective_entity_candidates%rowtype;
  v_existing private.comun_relata_collective_entity_projection_decisions%rowtype;
  v_registry private.comun_relata_collective_entity_projection_registry%rowtype;
  v_eligibility text;
  v_entity_reviewer uuid;
  v_representation_reviewer uuid;
  v_now timestamptz:=pg_catalog.now();
  v_projection_id uuid;
begin
  if p_request_id is null
     or p_candidate_id is null
     or p_decision not in ('approved','needs_changes','rejected','withdrawn')
     or (v_note is not null and pg_catalog.char_length(v_note) not between 3 and 2000)
     or (p_decision in ('needs_changes','rejected','withdrawn') and v_note is null) then
    raise exception using errcode='22023',
      message='COMUN_RELATA_ENTITY_PROJECTION_DECISION_INPUT_INVALID';
  end if;

  v_profile_id:=private.comun_relata_projection_publisher_profile(
    p_publisher_user_id
  );
  select profile.role
    into v_publisher_role
    from public.comun_admin_profiles profile
   where profile.id=v_profile_id;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text,4921007)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_candidate_id::text,4921008)
  );

  select existing.*
    into v_existing
    from private.comun_relata_collective_entity_projection_decisions existing
   where existing.decision_request_id=p_request_id
   for update;

  if found then
    if v_existing.candidate_id<>p_candidate_id
       or v_existing.decision<>p_decision
       or coalesce(v_existing.note_private,'')<>coalesce(v_note,'')
       or v_existing.publisher_profile_id<>v_profile_id
       or v_existing.publisher_auth_user_id<>p_publisher_user_id
       or v_existing.publisher_role<>v_publisher_role then
      raise exception using errcode='22023',
        message='COMUN_RELATA_ENTITY_PROJECTION_REQUEST_CONFLICT';
    end if;

    select registry.*
      into v_registry
      from private.comun_relata_collective_entity_projection_registry registry
     where registry.candidate_id=p_candidate_id;

    return query select
      p_candidate_id,v_existing.decision,v_registry.projection_id,
      coalesce(v_registry.state,'not_published')::text,
      v_registry.published_at,v_registry.withdrawn_at;
    return;
  end if;

  select candidate.*
    into v_candidate
    from private.comun_relata_collective_entity_candidates candidate
   where candidate.id=p_candidate_id
   for update;

  if not found then
    raise exception using errcode='42501',
      message='COMUN_RELATA_ENTITY_PROJECTION_CANDIDATE_UNAVAILABLE';
  end if;

  if exists (
    select 1
      from private.comun_relata_collective_entity_representations representation
     where representation.id=v_candidate.source_representation_id
       and representation.user_id=p_publisher_user_id
  ) then
    raise exception using errcode='42501',
      message='COMUN_RELATA_ENTITY_SELF_PUBLICATION_FORBIDDEN';
  end if;

  select reviewers.entity_reviewer_profile_id,
         reviewers.representation_reviewer_profile_id
    into v_entity_reviewer,v_representation_reviewer
    from private.comun_relata_candidate_latest_reviewer_profiles(
      p_candidate_id
    ) reviewers;

  if v_profile_id=v_entity_reviewer
     or v_profile_id=v_representation_reviewer then
    raise exception using errcode='42501',
      message='COMUN_RELATA_ENTITY_PROJECTION_SEPARATION_REQUIRED';
  end if;

  select snapshot.eligibility_state
    into v_eligibility
    from private.comun_relata_candidate_legitimacy_snapshot(p_candidate_id)
      snapshot;

  select registry.*
    into v_registry
    from private.comun_relata_collective_entity_projection_registry registry
   where registry.candidate_id=p_candidate_id
   for update;

  if p_decision='withdrawn' then
    if v_registry.candidate_id is null or v_registry.state<>'active' then
      raise exception using errcode='42501',
        message='COMUN_RELATA_ENTITY_PROJECTION_WITHDRAW_UNAVAILABLE';
    end if;
  else
    if v_candidate.candidate_state<>'pending_legitimacy'
       or v_eligibility<>'eligible_for_projection_review' then
      raise exception using errcode='42501',
        message='COMUN_RELATA_ENTITY_PROJECTION_NOT_ELIGIBLE';
    end if;
    if v_registry.state='active' then
      raise exception using errcode='42501',
        message='COMUN_RELATA_ENTITY_PROJECTION_ALREADY_ACTIVE';
    end if;
  end if;

  insert into private.comun_relata_collective_entity_projection_decisions(
    decision_request_id,candidate_id,decision,note_private,
    publisher_profile_id,publisher_auth_user_id,publisher_role
  ) values(
    p_request_id,p_candidate_id,p_decision,v_note,
    v_profile_id,p_publisher_user_id,v_publisher_role
  );

  if p_decision='approved' then
    if v_registry.candidate_id is null then
      v_projection_id:=pg_catalog.gen_random_uuid();
      insert into private.comun_relata_collective_entity_projection_registry(
        candidate_id,projection_id,state,published_at,last_decision_request_id
      ) values(
        p_candidate_id,v_projection_id,'active',v_now,p_request_id
      );
    else
      v_projection_id:=v_registry.projection_id;
      update private.comun_relata_collective_entity_projection_registry
         set state='active',
             published_at=v_now,
             last_decision_request_id=p_request_id,
             withdrawn_at=null,
             withdrawal_reason=null
       where candidate_id=p_candidate_id;
    end if;

    insert into public.comun_relata_collective_entity_public_projections(
      projection_id,public_name,entity_type,published_at
    ) values(
      v_projection_id,v_candidate.public_name,v_candidate.entity_type,v_now
    )
    on conflict (projection_id) do update
      set public_name=excluded.public_name,
          entity_type=excluded.entity_type,
          published_at=excluded.published_at;

    insert into private.comun_relata_collective_entity_projection_events(
      candidate_id,projection_id,event_type,decision_request_id,
      actor_profile_id,actor_auth_user_id,actor_role
    ) values(
      p_candidate_id,v_projection_id,'published',p_request_id,
      v_profile_id,p_publisher_user_id,v_publisher_role
    );
  elsif p_decision='withdrawn' then
    v_projection_id:=v_registry.projection_id;
    delete from public.comun_relata_collective_entity_public_projections
     where projection_id=v_projection_id;

    update private.comun_relata_collective_entity_projection_registry
       set state='withdrawn',
           last_decision_request_id=p_request_id,
           withdrawn_at=v_now,
           withdrawal_reason=v_note
     where candidate_id=p_candidate_id;

    insert into private.comun_relata_collective_entity_projection_events(
      candidate_id,projection_id,event_type,decision_request_id,
      actor_profile_id,actor_auth_user_id,actor_role,reason_private
    ) values(
      p_candidate_id,v_projection_id,'withdrawn',p_request_id,
      v_profile_id,p_publisher_user_id,v_publisher_role,v_note
    );
  end if;

  select registry.*
    into v_registry
    from private.comun_relata_collective_entity_projection_registry registry
   where registry.candidate_id=p_candidate_id;

  return query select
    p_candidate_id,p_decision,v_registry.projection_id,
    coalesce(v_registry.state,'not_published')::text,
    v_registry.published_at,v_registry.withdrawn_at;
end;
$$;

create function public.comun_relata_entity_server_projection_list_own(
  p_actor_user_id uuid
)
returns table(
  candidate_id uuid,
  projection_id uuid,
  projection_state text,
  published_at timestamptz,
  withdrawn_at timestamptz
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
    select candidate.id,registry.projection_id,
      coalesce(registry.state,'not_published')::text,
      registry.published_at,registry.withdrawn_at
      from private.comun_relata_collective_entity_candidates candidate
      join private.comun_relata_collective_entity_representations representation
        on representation.id=candidate.source_representation_id
       and representation.user_id=p_actor_user_id
      left join private.comun_relata_collective_entity_projection_registry
        registry on registry.candidate_id=candidate.id
     order by candidate.generated_at desc,candidate.id desc;
end;
$$;

alter function private.comun_relata_projection_append_only()
  owner to postgres;
alter function private.comun_relata_projection_publisher_profile(uuid)
  owner to postgres;
alter function private.comun_relata_candidate_latest_reviewer_profiles(uuid)
  owner to postgres;
alter function private.comun_relata_collective_entity_projection_reconcile_candidate(
  uuid,text
) owner to postgres;
alter function private.comun_relata_projection_reconcile_from_review()
  owner to postgres;
alter function private.comun_relata_projection_reconcile_from_candidate()
  owner to postgres;
alter function public.comun_relata_collective_entity_server_projection_review_queue(
  uuid
) owner to postgres;
alter function public.comun_relata_collective_entity_server_projection_decide(
  uuid,uuid,uuid,text,text
) owner to postgres;
alter function public.comun_relata_entity_server_projection_list_own(uuid)
  owner to postgres;

revoke all on function
  private.comun_relata_projection_append_only(),
  private.comun_relata_projection_publisher_profile(uuid),
  private.comun_relata_candidate_latest_reviewer_profiles(uuid),
  private.comun_relata_collective_entity_projection_reconcile_candidate(uuid,text),
  private.comun_relata_projection_reconcile_from_review(),
  private.comun_relata_projection_reconcile_from_candidate()
from public,anon,authenticated,service_role;

revoke all on function
  public.comun_relata_collective_entity_server_projection_review_queue(uuid),
  public.comun_relata_collective_entity_server_projection_decide(
    uuid,uuid,uuid,text,text
  ),
  public.comun_relata_entity_server_projection_list_own(uuid)
from public,anon,authenticated;

grant execute on function
  public.comun_relata_collective_entity_server_projection_review_queue(uuid),
  public.comun_relata_collective_entity_server_projection_decide(
    uuid,uuid,uuid,text,text
  ),
  public.comun_relata_entity_server_projection_list_own(uuid)
to service_role;

comment on table public.comun_relata_collective_entity_public_projections is
  'R5 sanitized entity directory. It contains no owner identity, report, evidence, contact or location and carries no map authority.';
comment on table private.comun_relata_collective_entity_projection_decisions is
  'R5 append-only publisher decisions. Approval is separate from R4 legitimacy review.';
comment on table private.comun_relata_collective_entity_projection_events is
  'R5 append-only publication and withdrawal audit, including automatic eligibility-loss withdrawals.';
comment on function public.comun_relata_collective_entity_server_projection_decide(
  uuid,uuid,uuid,text,text
) is
  'R5 service-only projection gate. Publisher/admin must be distinct from owner and latest R4 reviewers.';
comment on function public.comun_relata_collective_entity_server_projection_review_queue(uuid) is
  'R5 service-only queue of R4-eligible sanitized candidates that still require an independent publisher decision.';
comment on function public.comun_relata_entity_server_projection_list_own(uuid) is
  'R5 owner-only private projection status. Public projection id is returned only to the owning representation.';

commit;
