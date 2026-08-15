create schema if not exists private;

create table private.comun_solidarity_organization_access (
  id uuid primary key default gen_random_uuid(),
  organization_territory_id uuid not null
    references public.comun_territorial_organizations(territory_id) on delete restrict,
  member_user_id uuid not null references auth.users(id) on delete restrict,
  requested_role text not null check (requested_role in ('facilitator','editor')),
  role text check (role is null or role in ('facilitator','editor')),
  state text not null default 'pending'
    check (state in ('pending','active','rejected','withdrawn','revoked','left')),
  review_scope text not null check (review_scope in ('platform','organization')),
  request_note_private text not null
    check (char_length(btrim(request_note_private)) between 10 and 600),
  reviewed_by_user_id uuid references auth.users(id) on delete restrict,
  review_note_private text check (
    review_note_private is null or char_length(btrim(review_note_private)) between 1 and 600
  ),
  transition_history_private jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(transition_history_private) = 'array'
      and octet_length(transition_history_private::text) <= 20000
    ),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  activated_at timestamptz,
  revoked_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_solidarity_organization_access_state_shape check (
    (state = 'pending' and role is null and activated_at is null and revoked_at is null and left_at is null)
    or (state = 'active' and role is not null and activated_at is not null and revoked_at is null and left_at is null)
    or (state in ('rejected','withdrawn') and role is null and activated_at is null and revoked_at is null and left_at is null)
    or (state = 'revoked' and role is not null and activated_at is not null and revoked_at is not null and left_at is null)
    or (state = 'left' and role is not null and activated_at is not null and revoked_at is null and left_at is not null)
  ),
  constraint comun_solidarity_organization_access_review_shape check (
    (state in ('pending','withdrawn') and reviewed_at is null and reviewed_by_user_id is null)
    or (state in ('active','rejected','revoked','left'))
  )
);

comment on table private.comun_solidarity_organization_access is
  'Vínculo privado, auditável e revogável para agir no COMUN por uma organização; não comprova propriedade, vínculo jurídico, relação de trabalho ou associação no mundo real.';
comment on column private.comun_solidarity_organization_access.role is
  'Papel operacional dentro do COMUN. Não representa dono, titular, representante legal ou seller account.';
comment on column private.comun_solidarity_organization_access.transition_history_private is
  'Trilha privada bounded das transições de acesso; nunca integra DTO ou HTML público.';

create unique index comun_solidarity_organization_access_live_identity_idx
  on private.comun_solidarity_organization_access(organization_territory_id, member_user_id)
  where state in ('pending','active');
create index comun_solidarity_organization_access_member_idx
  on private.comun_solidarity_organization_access(member_user_id, requested_at desc);
create index comun_solidarity_organization_access_platform_queue_idx
  on private.comun_solidarity_organization_access(requested_at, organization_territory_id)
  where state = 'pending' and review_scope = 'platform';
create index comun_solidarity_organization_access_organization_queue_idx
  on private.comun_solidarity_organization_access(organization_territory_id, requested_at)
  where state = 'pending' and review_scope = 'organization';
create index comun_solidarity_organization_access_active_facilitator_idx
  on private.comun_solidarity_organization_access(organization_territory_id, member_user_id)
  where state = 'active' and role = 'facilitator';

create trigger comun_solidarity_organization_access_updated_at
before update on private.comun_solidarity_organization_access
for each row execute function public.set_updated_at();

alter table private.comun_solidarity_organization_access enable row level security;
alter table private.comun_solidarity_organization_access force row level security;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
revoke all on table private.comun_solidarity_organization_access from public, anon, authenticated;
grant select, insert, update, delete on table private.comun_solidarity_organization_access to service_role;

create or replace function public.comun_request_solidarity_organization_access(
  p_organization_territory_id uuid,
  p_member_user_id uuid,
  p_request_note_private text
)
returns table(
  access_id uuid,
  requested_role text,
  review_scope text,
  state text,
  idempotent boolean
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_existing private.comun_solidarity_organization_access%rowtype;
  v_role text;
  v_scope text;
  v_now timestamptz := clock_timestamp();
begin
  if p_member_user_id is null or not exists(select 1 from auth.users u where u.id = p_member_user_id) then
    raise exception 'COMUN_SOLIDARITY_ACCESS_AUTH_REQUIRED';
  end if;
  p_request_note_private := btrim(coalesce(p_request_note_private, ''));
  if char_length(p_request_note_private) not between 10 and 600 then
    raise exception 'COMUN_SOLIDARITY_ACCESS_NOTE_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('comun-solidarity-organization:' || p_organization_territory_id::text, 0));

  if not exists (
    select 1
    from public.comun_territorial_organizations organization
    join public.comun_hub_territories territory on territory.id = organization.territory_id
    where organization.territory_id = p_organization_territory_id
      and organization.status in ('active','forming')
      and organization.verification_status in ('source_checked','verified')
      and territory.visibility = 'public'
      and territory.status in ('active','monitoring')
      and territory.verification_status in ('source_checked','verified')
  ) then
    raise exception 'COMUN_SOLIDARITY_ACCESS_ORGANIZATION_INELIGIBLE';
  end if;

  select access.* into v_existing
  from private.comun_solidarity_organization_access access
  where access.organization_territory_id = p_organization_territory_id
    and access.member_user_id = p_member_user_id
    and access.state in ('pending','active')
  order by access.requested_at desc
  limit 1;
  if found then
    return query select v_existing.id, v_existing.requested_role, v_existing.review_scope, v_existing.state, true;
    return;
  end if;

  if exists (
    select 1 from private.comun_solidarity_organization_access access
    where access.organization_territory_id = p_organization_territory_id
      and access.member_user_id = p_member_user_id
      and access.state in ('rejected','revoked')
      and access.updated_at > v_now - interval '24 hours'
  ) then
    raise exception 'COMUN_SOLIDARITY_ACCESS_COOLDOWN';
  end if;
  if (select count(*) from private.comun_solidarity_organization_access access
      where access.member_user_id = p_member_user_id and access.state = 'pending') >= 5 then
    raise exception 'COMUN_SOLIDARITY_ACCESS_PENDING_LIMIT';
  end if;
  if (select count(*) from private.comun_solidarity_organization_access access
      where access.member_user_id = p_member_user_id and access.requested_at >= v_now - interval '24 hours') >= 10 then
    raise exception 'COMUN_SOLIDARITY_ACCESS_DAILY_LIMIT';
  end if;

  if exists (
    select 1 from private.comun_solidarity_organization_access access
    where access.organization_territory_id = p_organization_territory_id
      and access.state = 'active' and access.role = 'facilitator'
  ) then
    v_role := 'editor';
    v_scope := 'organization';
  else
    v_role := 'facilitator';
    v_scope := 'platform';
  end if;

  insert into private.comun_solidarity_organization_access(
    organization_territory_id,
    member_user_id,
    requested_role,
    review_scope,
    request_note_private,
    transition_history_private
  ) values (
    p_organization_territory_id,
    p_member_user_id,
    v_role,
    v_scope,
    p_request_note_private,
    jsonb_build_array(jsonb_build_object(
      'event', 'requested',
      'actorUserId', p_member_user_id,
      'requestedRole', v_role,
      'reviewScope', v_scope,
      'at', v_now
    ))
  ) returning id into access_id;
  requested_role := v_role;
  review_scope := v_scope;
  state := 'pending';
  idempotent := false;
  return next;
end;
$$;

create or replace function public.comun_review_solidarity_organization_access(
  p_access_id uuid,
  p_expected_organization_territory_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_review_note_private text default null
)
returns table(access_id uuid, organization_territory_id uuid, state text, role text)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_access private.comun_solidarity_organization_access%rowtype;
  v_now timestamptz := clock_timestamp();
  v_platform_actor boolean := false;
begin
  if p_decision not in ('approve','reject') then
    raise exception 'COMUN_SOLIDARITY_ACCESS_DECISION_INVALID';
  end if;
  p_review_note_private := nullif(btrim(coalesce(p_review_note_private, '')), '');
  if p_review_note_private is not null and char_length(p_review_note_private) > 600 then
    raise exception 'COMUN_SOLIDARITY_ACCESS_REVIEW_NOTE_INVALID';
  end if;

  select access.* into v_access
  from private.comun_solidarity_organization_access access
  where access.id = p_access_id
  for update;
  if not found or v_access.state <> 'pending' then
    raise exception 'COMUN_SOLIDARITY_ACCESS_NOT_PENDING';
  end if;
  if v_access.organization_territory_id <> p_expected_organization_territory_id then
    raise exception 'COMUN_SOLIDARITY_ACCESS_ORGANIZATION_MISMATCH';
  end if;

  select exists(
    select 1 from public.comun_admin_users admin_user
    where admin_user.user_id = p_actor_user_id
      and admin_user.is_active = true
      and admin_user.role in ('admin','editor')
  ) into v_platform_actor;

  if v_access.review_scope = 'platform' then
    if not v_platform_actor then
      raise exception 'COMUN_SOLIDARITY_ACCESS_PLATFORM_REVIEW_FORBIDDEN';
    end if;
  elsif not exists (
    select 1 from private.comun_solidarity_organization_access actor_access
    where actor_access.organization_territory_id = v_access.organization_territory_id
      and actor_access.member_user_id = p_actor_user_id
      and actor_access.state = 'active'
      and actor_access.role = 'facilitator'
  ) then
    raise exception 'COMUN_SOLIDARITY_ACCESS_ORGANIZATION_REVIEW_FORBIDDEN';
  end if;

  update private.comun_solidarity_organization_access access
  set state = case when p_decision = 'approve' then 'active' else 'rejected' end,
      role = case when p_decision = 'approve' then access.requested_role else null end,
      reviewed_by_user_id = p_actor_user_id,
      review_note_private = p_review_note_private,
      reviewed_at = v_now,
      activated_at = case when p_decision = 'approve' then v_now else null end,
      transition_history_private = access.transition_history_private || jsonb_build_array(jsonb_build_object(
        'event', case when p_decision = 'approve' then 'approved' else 'rejected' end,
        'actorUserId', p_actor_user_id,
        'at', v_now
      ))
  where access.id = p_access_id
  returning access.id, access.organization_territory_id, access.state, access.role
  into access_id, organization_territory_id, state, role;
  return next;
end;
$$;

create or replace function public.comun_govern_solidarity_organization_access(
  p_access_id uuid,
  p_expected_organization_territory_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_review_note_private text default null
)
returns table(access_id uuid, organization_territory_id uuid, state text, role text)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_target private.comun_solidarity_organization_access%rowtype;
  v_now timestamptz := clock_timestamp();
  v_platform_actor boolean := false;
  v_facilitator_actor boolean := false;
begin
  if p_action not in ('promote','revoke') then
    raise exception 'COMUN_SOLIDARITY_ACCESS_GOVERNANCE_ACTION_INVALID';
  end if;
  p_review_note_private := nullif(btrim(coalesce(p_review_note_private, '')), '');
  if p_review_note_private is not null and char_length(p_review_note_private) > 600 then
    raise exception 'COMUN_SOLIDARITY_ACCESS_REVIEW_NOTE_INVALID';
  end if;

  select access.* into v_target
  from private.comun_solidarity_organization_access access
  where access.id = p_access_id
  for update;
  if not found or v_target.state <> 'active' then
    raise exception 'COMUN_SOLIDARITY_ACCESS_TARGET_NOT_ACTIVE';
  end if;
  if v_target.organization_territory_id <> p_expected_organization_territory_id then
    raise exception 'COMUN_SOLIDARITY_ACCESS_ORGANIZATION_MISMATCH';
  end if;

  select exists(
    select 1 from public.comun_admin_users admin_user
    where admin_user.user_id = p_actor_user_id
      and admin_user.is_active = true
      and admin_user.role in ('admin','editor')
  ) into v_platform_actor;
  select exists(
    select 1 from private.comun_solidarity_organization_access actor_access
    where actor_access.organization_territory_id = v_target.organization_territory_id
      and actor_access.member_user_id = p_actor_user_id
      and actor_access.state = 'active'
      and actor_access.role = 'facilitator'
  ) into v_facilitator_actor;

  if p_action = 'promote' then
    if not v_facilitator_actor or v_target.role <> 'editor' or v_target.member_user_id = p_actor_user_id then
      raise exception 'COMUN_SOLIDARITY_ACCESS_PROMOTION_FORBIDDEN';
    end if;
    update private.comun_solidarity_organization_access access
    set role = 'facilitator',
        reviewed_by_user_id = p_actor_user_id,
        reviewed_at = v_now,
        review_note_private = p_review_note_private,
        transition_history_private = access.transition_history_private || jsonb_build_array(jsonb_build_object(
          'event', 'promoted_to_facilitator', 'actorUserId', p_actor_user_id, 'at', v_now
        ))
    where access.id = p_access_id;
  else
    if not v_platform_actor and (
      not v_facilitator_actor or v_target.role <> 'editor' or v_target.member_user_id = p_actor_user_id
    ) then
      raise exception 'COMUN_SOLIDARITY_ACCESS_REVOCATION_FORBIDDEN';
    end if;
    update private.comun_solidarity_organization_access access
    set state = 'revoked',
        revoked_at = v_now,
        reviewed_by_user_id = p_actor_user_id,
        reviewed_at = v_now,
        review_note_private = p_review_note_private,
        transition_history_private = access.transition_history_private || jsonb_build_array(jsonb_build_object(
          'event', 'revoked', 'actorUserId', p_actor_user_id, 'at', v_now
        ))
    where access.id = p_access_id;
  end if;

  select access.id, access.organization_territory_id, access.state, access.role
  into access_id, organization_territory_id, state, role
  from private.comun_solidarity_organization_access access where access.id = p_access_id;
  return next;
end;
$$;

create or replace function public.comun_leave_solidarity_organization_access(
  p_organization_territory_id uuid,
  p_member_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  update private.comun_solidarity_organization_access access
  set state = 'left',
      left_at = v_now,
      transition_history_private = access.transition_history_private || jsonb_build_array(jsonb_build_object(
        'event', 'left', 'actorUserId', p_member_user_id, 'at', v_now
      ))
  where access.organization_territory_id = p_organization_territory_id
    and access.member_user_id = p_member_user_id
    and access.state = 'active';
  return found;
end;
$$;

create or replace function public.comun_withdraw_solidarity_organization_access(
  p_organization_territory_id uuid,
  p_member_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  update private.comun_solidarity_organization_access access
  set state = 'withdrawn',
      transition_history_private = access.transition_history_private || jsonb_build_array(jsonb_build_object(
        'event', 'withdrawn', 'actorUserId', p_member_user_id, 'at', v_now
      ))
  where access.organization_territory_id = p_organization_territory_id
    and access.member_user_id = p_member_user_id
    and access.state = 'pending';
  return found;
end;
$$;

create or replace function public.comun_list_my_solidarity_organization_access(p_member_user_id uuid)
returns table(
  access_id uuid,
  organization_territory_id uuid,
  requested_role text,
  role text,
  state text,
  review_scope text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  activated_at timestamptz,
  revoked_at timestamptz,
  left_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, private, public
as $$
  select access.id, access.organization_territory_id, access.requested_role, access.role,
    access.state, access.review_scope, access.requested_at, access.reviewed_at,
    access.activated_at, access.revoked_at, access.left_at
  from private.comun_solidarity_organization_access access
  where access.member_user_id = p_member_user_id
  order by access.requested_at desc
  limit 50
$$;

create or replace function public.comun_list_solidarity_organization_governance(
  p_organization_territory_id uuid,
  p_actor_user_id uuid
)
returns table(
  access_id uuid,
  member_label text,
  request_note_private text,
  requested_role text,
  role text,
  state text,
  review_scope text,
  requested_at timestamptz,
  activated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, private, public
as $$
begin
  if not exists (
    select 1 from private.comun_solidarity_organization_access actor_access
    where actor_access.organization_territory_id = p_organization_territory_id
      and actor_access.member_user_id = p_actor_user_id
      and actor_access.state = 'active'
      and actor_access.role = 'facilitator'
  ) then
    raise exception 'COMUN_SOLIDARITY_ACCESS_GOVERNANCE_FORBIDDEN';
  end if;
  return query
  select access.id,
    case when profile.status = 'active' and char_length(btrim(profile.display_name)) between 1 and 80
      then btrim(profile.display_name) else 'Pessoa autenticada' end,
    access.request_note_private, access.requested_role, access.role, access.state, access.review_scope,
    access.requested_at, access.activated_at
  from private.comun_solidarity_organization_access access
  left join public.comun_member_profiles profile on profile.user_id = access.member_user_id
  where access.organization_territory_id = p_organization_territory_id
    and (access.state = 'active' or (access.state = 'pending' and access.review_scope = 'organization'))
  order by case when access.state = 'pending' then 0 else 1 end, access.requested_at;
end;
$$;

create or replace function public.comun_list_platform_solidarity_organization_access(p_actor_user_id uuid)
returns table(
  access_id uuid,
  organization_territory_id uuid,
  organization_name text,
  member_label text,
  request_note_private text,
  requested_role text,
  role text,
  state text,
  review_scope text,
  requested_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, private, public
as $$
begin
  if not exists (
    select 1 from public.comun_admin_users admin_user
    where admin_user.user_id = p_actor_user_id
      and admin_user.is_active = true
      and admin_user.role in ('admin','editor')
  ) then
    raise exception 'COMUN_SOLIDARITY_ACCESS_PLATFORM_QUEUE_FORBIDDEN';
  end if;
  return query
  select access.id, access.organization_territory_id, organization.public_name,
    case when profile.status = 'active' and char_length(btrim(profile.display_name)) between 1 and 80
      then btrim(profile.display_name) else 'Pessoa autenticada' end,
    access.request_note_private, access.requested_role, access.role, access.state, access.review_scope,
    access.requested_at
  from private.comun_solidarity_organization_access access
  join public.comun_territorial_organizations organization
    on organization.territory_id = access.organization_territory_id
  left join public.comun_member_profiles profile on profile.user_id = access.member_user_id
  where (access.state = 'pending' and access.review_scope = 'platform') or access.state = 'active'
  order by case when access.state = 'pending' then 0 else 1 end, access.requested_at
  limit 100;
end;
$$;

revoke all on function public.comun_request_solidarity_organization_access(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.comun_review_solidarity_organization_access(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.comun_govern_solidarity_organization_access(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.comun_leave_solidarity_organization_access(uuid, uuid) from public, anon, authenticated;
revoke all on function public.comun_withdraw_solidarity_organization_access(uuid, uuid) from public, anon, authenticated;
revoke all on function public.comun_list_my_solidarity_organization_access(uuid) from public, anon, authenticated;
revoke all on function public.comun_list_solidarity_organization_governance(uuid, uuid) from public, anon, authenticated;
revoke all on function public.comun_list_platform_solidarity_organization_access(uuid) from public, anon, authenticated;

grant execute on function public.comun_request_solidarity_organization_access(uuid, uuid, text) to service_role;
grant execute on function public.comun_review_solidarity_organization_access(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.comun_govern_solidarity_organization_access(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.comun_leave_solidarity_organization_access(uuid, uuid) to service_role;
grant execute on function public.comun_withdraw_solidarity_organization_access(uuid, uuid) to service_role;
grant execute on function public.comun_list_my_solidarity_organization_access(uuid) to service_role;
grant execute on function public.comun_list_solidarity_organization_governance(uuid, uuid) to service_role;
grant execute on function public.comun_list_platform_solidarity_organization_access(uuid) to service_role;
