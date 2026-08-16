create table private.comun_solidarity_organization_onboarding (
  id uuid primary key default gen_random_uuid(),
  continuation_token uuid not null unique default gen_random_uuid(),
  create_request_id uuid not null unique,
  last_mutation_request_id uuid unique,
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  organization_name_candidate text not null
    check (char_length(btrim(organization_name_candidate)) between 3 and 160),
  normalized_name_candidate text not null,
  organization_type_candidate text check (
    organization_type_candidate is null or organization_type_candidate in (
      'cooperative','association','collective','informal_group',
      'solidarity_enterprise','network','other'
    )
  ),
  presentation_candidate text check (
    presentation_candidate is null or char_length(btrim(presentation_candidate)) between 10 and 1200
  ),
  service_territory_candidate text check (
    service_territory_candidate is null or char_length(btrim(service_territory_candidate)) between 2 and 300
  ),
  public_contact_candidate text check (
    public_contact_candidate is null or char_length(btrim(public_contact_candidate)) between 3 and 300
  ),
  public_contact_publication_authorized boolean not null default false,
  public_source_url_candidate text check (
    public_source_url_candidate is null or char_length(btrim(public_source_url_candidate)) between 10 and 1000
  ),
  participation_note_private text check (
    participation_note_private is null or char_length(btrim(participation_note_private)) between 10 and 600
  ),
  state text not null default 'draft'
    check (state in ('draft','submitted','needs_changes','approved','rejected','withdrawn')),
  review_message_private text check (
    review_message_private is null or char_length(btrim(review_message_private)) between 3 and 600
  ),
  reviewed_by_user_id uuid references auth.users(id) on delete restrict,
  approved_territory_id uuid references public.comun_hub_territories(id) on delete restrict,
  approved_access_id uuid references private.comun_solidarity_organization_access(id) on delete restrict,
  approved_source_id uuid references public.comun_territorial_sources(id) on delete restrict,
  transition_history_private jsonb not null default '[]'::jsonb check (
    jsonb_typeof(transition_history_private) = 'array'
    and octet_length(transition_history_private::text) <= 30000
  ),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_solidarity_organization_onboarding_state_shape check (
    (state = 'draft' and submitted_at is null and approved_at is null and withdrawn_at is null)
    or (state = 'submitted' and submitted_at is not null and approved_at is null and withdrawn_at is null)
    or (state = 'needs_changes' and submitted_at is not null and reviewed_at is not null and approved_at is null and withdrawn_at is null)
    or (state = 'approved' and submitted_at is not null and reviewed_at is not null and approved_at is not null
      and withdrawn_at is null and approved_territory_id is not null and approved_access_id is not null)
    or (state = 'rejected' and submitted_at is not null and reviewed_at is not null and approved_at is null and withdrawn_at is null)
    or (state = 'withdrawn' and approved_at is null and withdrawn_at is not null)
  ),
  constraint comun_solidarity_organization_onboarding_contact_consent check (
    public_contact_publication_authorized = false or public_contact_candidate is not null
  )
);

comment on table private.comun_solidarity_organization_onboarding is
  'Workflow privado de entrada de organizações na Feirinha. Um draft não cria território, organização, acesso ou conteúdo econômico.';
comment on column private.comun_solidarity_organization_onboarding.public_contact_candidate is
  'Contato candidato só pode ser promovido quando a autorização explícita de publicação estiver registrada.';

create index comun_solidarity_onboarding_applicant_idx
  on private.comun_solidarity_organization_onboarding(applicant_user_id, updated_at desc);
create index comun_solidarity_onboarding_review_queue_idx
  on private.comun_solidarity_organization_onboarding(submitted_at, created_at)
  where state = 'submitted';
create index comun_solidarity_onboarding_normalized_name_idx
  on private.comun_solidarity_organization_onboarding(normalized_name_candidate)
  where state in ('draft','submitted','needs_changes');

create trigger comun_solidarity_organization_onboarding_updated_at
before update on private.comun_solidarity_organization_onboarding
for each row execute function public.set_updated_at();

alter table private.comun_solidarity_organization_onboarding enable row level security;
alter table private.comun_solidarity_organization_onboarding force row level security;
revoke all on table private.comun_solidarity_organization_onboarding from public, anon, authenticated;
grant select, insert, update on table private.comun_solidarity_organization_onboarding to service_role;

create or replace function private.comun_normalize_solidarity_organization_name(p_value text)
returns text
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select pg_catalog.lower(
    pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_value, '')), '[[:space:]]+', ' ', 'g')
  )
$$;

create or replace function private.comun_solidarity_onboarding_assert_admin(p_actor_user_id uuid)
returns void
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1 from public.comun_admin_users admin_user
    where admin_user.user_id = p_actor_user_id
      and admin_user.is_active = true
      and admin_user.role = 'admin'
  ) then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_ADMIN_FORBIDDEN';
  end if;
end;
$$;

revoke all on function private.comun_normalize_solidarity_organization_name(text) from public, anon, authenticated;
revoke all on function private.comun_solidarity_onboarding_assert_admin(uuid) from public, anon, authenticated;
grant execute on function private.comun_normalize_solidarity_organization_name(text) to service_role;
grant execute on function private.comun_solidarity_onboarding_assert_admin(uuid) to service_role;

create or replace function public.comun_create_solidarity_organization_onboarding_draft_v1(
  p_request_id uuid,
  p_applicant_user_id uuid,
  p_organization_name_candidate text
)
returns table(
  onboarding_id uuid,
  continuation_token uuid,
  state text,
  idempotent boolean,
  existing_organization_territory_id uuid,
  existing_organization_slug text,
  existing_organization_name text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_existing private.comun_solidarity_organization_onboarding%rowtype;
  v_normalized_name text;
  v_name text;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_request_id is null then raise exception 'COMUN_SOLIDARITY_ONBOARDING_REQUEST_ID_REQUIRED'; end if;
  if p_applicant_user_id is null or not exists(select 1 from auth.users u where u.id = p_applicant_user_id) then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_AUTH_REQUIRED';
  end if;
  v_name := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_organization_name_candidate, ''), '[[:space:]]+', ' ', 'g'));
  if pg_catalog.char_length(v_name) not between 3 and 160 then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NAME_INVALID';
  end if;
  v_normalized_name := private.comun_normalize_solidarity_organization_name(v_name);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comun-solidarity-onboarding-request:' || p_request_id::text, 0));
  select onboarding.* into v_existing
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.create_request_id = p_request_id;
  if found then
    if v_existing.applicant_user_id <> p_applicant_user_id
      or v_existing.normalized_name_candidate <> v_normalized_name then
      raise exception 'COMUN_SOLIDARITY_ONBOARDING_IDEMPOTENCY_CONFLICT';
    end if;
    return query select v_existing.id, v_existing.continuation_token, v_existing.state, true,
      null::uuid, null::text, null::text;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comun-solidarity-name:' || v_normalized_name, 0));
  return query
  select null::uuid, null::uuid, 'existing_organization'::text, true,
    organization.territory_id, territory.slug, organization.public_name
  from public.comun_territorial_organizations organization
  join public.comun_hub_territories territory on territory.id = organization.territory_id
  where private.comun_normalize_solidarity_organization_name(organization.public_name) = v_normalized_name
    and organization.status in ('active','forming')
    and organization.verification_status in ('source_checked','verified')
    and territory.visibility = 'public'
    and territory.status in ('active','monitoring')
    and territory.verification_status in ('source_checked','verified')
  order by organization.updated_at desc
  limit 1;
  if found then return; end if;

  if (select pg_catalog.count(*) from private.comun_solidarity_organization_onboarding onboarding
      where onboarding.applicant_user_id = p_applicant_user_id
        and onboarding.state in ('draft','submitted','needs_changes')) >= 5 then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_ACTIVE_LIMIT';
  end if;
  if (select pg_catalog.count(*) from private.comun_solidarity_organization_onboarding onboarding
      where onboarding.applicant_user_id = p_applicant_user_id
        and onboarding.created_at >= v_now - interval '24 hours') >= 10 then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_RATE_LIMIT';
  end if;

  insert into private.comun_solidarity_organization_onboarding as created_onboarding(
    create_request_id, applicant_user_id, organization_name_candidate,
    normalized_name_candidate, transition_history_private
  ) values (
    p_request_id, p_applicant_user_id, v_name, v_normalized_name,
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'event', 'draft_saved', 'actorUserId', p_applicant_user_id, 'at', v_now
    ))
  ) returning created_onboarding.id, created_onboarding.continuation_token
    into onboarding_id, continuation_token;
  state := 'draft';
  idempotent := false;
  existing_organization_territory_id := null;
  existing_organization_slug := null;
  existing_organization_name := null;
  return next;
end;
$$;

create or replace function public.comun_update_solidarity_organization_onboarding_v1(
  p_request_id uuid,
  p_continuation_token uuid,
  p_applicant_user_id uuid,
  p_organization_name_candidate text,
  p_organization_type_candidate text,
  p_presentation_candidate text,
  p_service_territory_candidate text default null,
  p_public_contact_candidate text default null,
  p_public_contact_publication_authorized boolean default false,
  p_public_source_url_candidate text default null,
  p_participation_note_private text default null
)
returns table(onboarding_id uuid, state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_onboarding private.comun_solidarity_organization_onboarding%rowtype;
  v_name text;
  v_presentation text;
  v_service_territory text;
  v_public_contact text;
  v_source_url text;
  v_participation_note text;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_request_id is null then raise exception 'COMUN_SOLIDARITY_ONBOARDING_REQUEST_ID_REQUIRED'; end if;
  select onboarding.* into v_onboarding
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.continuation_token = p_continuation_token
  for update;
  if not found or v_onboarding.applicant_user_id <> p_applicant_user_id then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_FOUND';
  end if;
  if v_onboarding.last_mutation_request_id = p_request_id then
    return query select v_onboarding.id, v_onboarding.state, true;
    return;
  end if;
  if v_onboarding.state not in ('draft','needs_changes') then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_EDITABLE';
  end if;

  v_name := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_organization_name_candidate, ''), '[[:space:]]+', ' ', 'g'));
  v_presentation := nullif(pg_catalog.btrim(coalesce(p_presentation_candidate, '')), '');
  v_service_territory := nullif(pg_catalog.btrim(coalesce(p_service_territory_candidate, '')), '');
  v_public_contact := nullif(pg_catalog.btrim(coalesce(p_public_contact_candidate, '')), '');
  v_source_url := nullif(pg_catalog.btrim(coalesce(p_public_source_url_candidate, '')), '');
  v_participation_note := nullif(pg_catalog.btrim(coalesce(p_participation_note_private, '')), '');
  if pg_catalog.char_length(v_name) not between 3 and 160
    or p_organization_type_candidate not in ('cooperative','association','collective','informal_group','solidarity_enterprise','network','other')
    or v_presentation is null or pg_catalog.char_length(v_presentation) not between 10 and 1200
    or (v_service_territory is not null and pg_catalog.char_length(v_service_territory) not between 2 and 300)
    or (v_public_contact is not null and pg_catalog.char_length(v_public_contact) not between 3 and 300)
    or (v_source_url is not null and (pg_catalog.char_length(v_source_url) not between 10 and 1000 or v_source_url !~* '^https://'))
    or v_participation_note is null or pg_catalog.char_length(v_participation_note) not between 10 and 600
    or (p_public_contact_publication_authorized and v_public_contact is null) then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_DETAILS_INVALID';
  end if;

  update private.comun_solidarity_organization_onboarding onboarding set
    organization_name_candidate = v_name,
    normalized_name_candidate = private.comun_normalize_solidarity_organization_name(v_name),
    organization_type_candidate = p_organization_type_candidate,
    presentation_candidate = v_presentation,
    service_territory_candidate = v_service_territory,
    public_contact_candidate = v_public_contact,
    public_contact_publication_authorized = p_public_contact_publication_authorized,
    public_source_url_candidate = v_source_url,
    participation_note_private = v_participation_note,
    review_message_private = case when onboarding.state = 'needs_changes' then null else onboarding.review_message_private end,
    last_mutation_request_id = p_request_id,
    transition_history_private = onboarding.transition_history_private || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('event', 'details_saved', 'actorUserId', p_applicant_user_id, 'at', v_now)
    )
  where onboarding.id = v_onboarding.id
  returning onboarding.id, onboarding.state into onboarding_id, state;
  idempotent := false;
  return next;
end;
$$;

create or replace function public.comun_submit_solidarity_organization_onboarding_v1(
  p_request_id uuid,
  p_continuation_token uuid,
  p_applicant_user_id uuid
)
returns table(onboarding_id uuid, state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_onboarding private.comun_solidarity_organization_onboarding%rowtype;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  select onboarding.* into v_onboarding
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.continuation_token = p_continuation_token
  for update;
  if not found or v_onboarding.applicant_user_id <> p_applicant_user_id then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_FOUND';
  end if;
  if v_onboarding.last_mutation_request_id = p_request_id
    or (v_onboarding.state = 'submitted' and v_onboarding.applicant_user_id = p_applicant_user_id) then
    return query select v_onboarding.id, v_onboarding.state, true;
    return;
  end if;
  if v_onboarding.state not in ('draft','needs_changes') then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_SUBMITTABLE';
  end if;
  if v_onboarding.organization_type_candidate is null
    or v_onboarding.presentation_candidate is null
    or v_onboarding.participation_note_private is null then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_INCOMPLETE';
  end if;
  if exists (
    select 1 from public.comun_territorial_organizations organization
    join public.comun_hub_territories territory on territory.id = organization.territory_id
    where private.comun_normalize_solidarity_organization_name(organization.public_name) = v_onboarding.normalized_name_candidate
      and organization.status in ('active','forming')
      and organization.verification_status in ('source_checked','verified')
      and territory.visibility = 'public'
      and territory.status in ('active','monitoring')
      and territory.verification_status in ('source_checked','verified')
  ) then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_EXISTING_ORGANIZATION';
  end if;

  update private.comun_solidarity_organization_onboarding onboarding set
    state = 'submitted', submitted_at = v_now, reviewed_at = null, reviewed_by_user_id = null,
    review_message_private = null, last_mutation_request_id = p_request_id,
    transition_history_private = onboarding.transition_history_private || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('event', 'submitted', 'actorUserId', p_applicant_user_id, 'at', v_now)
    )
  where onboarding.id = v_onboarding.id
  returning onboarding.id, onboarding.state into onboarding_id, state;
  idempotent := false;
  return next;
end;
$$;

create or replace function public.comun_withdraw_solidarity_organization_onboarding_v1(
  p_request_id uuid,
  p_continuation_token uuid,
  p_applicant_user_id uuid
)
returns table(onboarding_id uuid, state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_onboarding private.comun_solidarity_organization_onboarding%rowtype;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  select onboarding.* into v_onboarding
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.continuation_token = p_continuation_token
  for update;
  if not found or v_onboarding.applicant_user_id <> p_applicant_user_id then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_FOUND';
  end if;
  if v_onboarding.last_mutation_request_id = p_request_id or v_onboarding.state = 'withdrawn' then
    return query select v_onboarding.id, v_onboarding.state, true;
    return;
  end if;
  if v_onboarding.state not in ('draft','submitted','needs_changes') then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_WITHDRAWABLE';
  end if;
  update private.comun_solidarity_organization_onboarding onboarding set
    state = 'withdrawn', withdrawn_at = v_now, last_mutation_request_id = p_request_id,
    transition_history_private = onboarding.transition_history_private || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('event', 'withdrawn', 'actorUserId', p_applicant_user_id, 'at', v_now)
    )
  where onboarding.id = v_onboarding.id
  returning onboarding.id, onboarding.state into onboarding_id, state;
  idempotent := false;
  return next;
end;
$$;

create or replace function public.comun_review_solidarity_organization_onboarding_v1(
  p_request_id uuid,
  p_onboarding_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_review_message_private text
)
returns table(onboarding_id uuid, state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_onboarding private.comun_solidarity_organization_onboarding%rowtype;
  v_message text;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  perform private.comun_solidarity_onboarding_assert_admin(p_actor_user_id);
  if p_decision not in ('needs_changes','reject') then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_REVIEW_DECISION_INVALID';
  end if;
  v_message := pg_catalog.btrim(coalesce(p_review_message_private, ''));
  if pg_catalog.char_length(v_message) not between 3 and 600 then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_REVIEW_MESSAGE_INVALID';
  end if;
  select onboarding.* into v_onboarding
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.id = p_onboarding_id
  for update;
  if not found then raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_FOUND'; end if;
  if v_onboarding.last_mutation_request_id = p_request_id then
    return query select v_onboarding.id, v_onboarding.state, true;
    return;
  end if;
  if v_onboarding.state <> 'submitted' then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_SUBMITTED';
  end if;
  update private.comun_solidarity_organization_onboarding onboarding set
    state = case when p_decision = 'needs_changes' then 'needs_changes' else 'rejected' end,
    review_message_private = v_message, reviewed_by_user_id = p_actor_user_id,
    reviewed_at = v_now, last_mutation_request_id = p_request_id,
    transition_history_private = onboarding.transition_history_private || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('event', p_decision, 'actorUserId', p_actor_user_id, 'at', v_now)
    )
  where onboarding.id = v_onboarding.id
  returning onboarding.id, onboarding.state into onboarding_id, state;
  idempotent := false;
  return next;
end;
$$;

create or replace function public.comun_approve_solidarity_organization_onboarding_v1(
  p_request_id uuid,
  p_onboarding_id uuid,
  p_actor_user_id uuid,
  p_confirmed_organization_type text,
  p_source_kind text,
  p_source_title text,
  p_source_url_public text default null,
  p_source_summary_public text default null,
  p_source_note_private text default null
)
returns table(
  onboarding_id uuid,
  state text,
  territory_id uuid,
  organization_slug text,
  access_id uuid,
  idempotent boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_onboarding private.comun_solidarity_organization_onboarding%rowtype;
  v_existing_territory_id uuid;
  v_territory_id uuid := gen_random_uuid();
  v_access_id uuid := gen_random_uuid();
  v_source_id uuid;
  v_slug text;
  v_slug_base text;
  v_source_title text;
  v_source_url text;
  v_source_summary text;
  v_source_note text;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  perform private.comun_solidarity_onboarding_assert_admin(p_actor_user_id);
  if p_request_id is null then raise exception 'COMUN_SOLIDARITY_ONBOARDING_REQUEST_ID_REQUIRED'; end if;
  if p_confirmed_organization_type not in ('cooperative','association','collective','informal_group','solidarity_enterprise','network','other') then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_TYPE_INVALID';
  end if;
  if p_source_kind not in ('public_url','platform_review','operational_confirmation') then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_SOURCE_KIND_INVALID';
  end if;
  v_source_title := pg_catalog.btrim(coalesce(p_source_title, ''));
  v_source_url := nullif(pg_catalog.btrim(coalesce(p_source_url_public, '')), '');
  v_source_summary := pg_catalog.btrim(coalesce(p_source_summary_public, ''));
  v_source_note := nullif(pg_catalog.btrim(coalesce(p_source_note_private, '')), '');
  if pg_catalog.char_length(v_source_title) not between 3 and 200
    or pg_catalog.char_length(v_source_summary) not between 10 and 600
    or (v_source_url is not null and (pg_catalog.char_length(v_source_url) > 1000 or v_source_url !~* '^https://'))
    or (p_source_kind = 'public_url' and v_source_url is null)
    or (v_source_note is not null and pg_catalog.char_length(v_source_note) > 600) then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_SOURCE_INVALID';
  end if;

  select onboarding.* into v_onboarding
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.id = p_onboarding_id
  for update;
  if not found then raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_FOUND'; end if;
  if v_onboarding.last_mutation_request_id = p_request_id and v_onboarding.state = 'approved' then
    select territory.slug into v_slug from public.comun_hub_territories territory where territory.id = v_onboarding.approved_territory_id;
    return query select v_onboarding.id, v_onboarding.state, v_onboarding.approved_territory_id,
      v_slug, v_onboarding.approved_access_id, true;
    return;
  end if;
  if v_onboarding.state <> 'submitted' then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_NOT_SUBMITTED';
  end if;
  if v_onboarding.organization_type_candidate is null
    or v_onboarding.presentation_candidate is null
    or v_onboarding.participation_note_private is null then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_INCOMPLETE';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comun-solidarity-name:' || v_onboarding.normalized_name_candidate, 0));
  select organization.territory_id into v_existing_territory_id
  from public.comun_territorial_organizations organization
  join public.comun_hub_territories territory on territory.id = organization.territory_id
  where private.comun_normalize_solidarity_organization_name(organization.public_name) = v_onboarding.normalized_name_candidate
    and organization.status in ('active','forming')
    and territory.status in ('active','monitoring')
  limit 1;
  if v_existing_territory_id is not null then
    raise exception 'COMUN_SOLIDARITY_ONBOARDING_EXISTING_ORGANIZATION';
  end if;

  v_slug_base := pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.lower(v_onboarding.organization_name_candidate), '[^a-z0-9]+', '-', 'g'
    ),
    '-'
  );
  if pg_catalog.char_length(v_slug_base) < 3 then v_slug_base := 'organizacao-solidaria'; end if;
  v_slug_base := pg_catalog.left(v_slug_base, 70);
  v_slug := v_slug_base;
  if exists(select 1 from public.comun_hub_territories territory where territory.slug = v_slug) then
    v_slug := v_slug_base || '-' || pg_catalog.left(v_territory_id::text, 8);
  end if;

  insert into public.comun_hub_territories(
    id, slug, name, territory_type, municipality, public_summary, status,
    geometry_type, location_precision, visibility, verification_status,
    source_summary_public, source_url_public, last_reviewed_at
  ) values (
    v_territory_id, v_slug, v_onboarding.organization_name_candidate,
    case when p_confirmed_organization_type = 'cooperative' then 'cooperative' else 'solidarity_collective' end,
    'Volta Redonda', v_onboarding.presentation_candidate, 'monitoring',
    'point', 'hidden', 'public', 'source_checked',
    v_source_summary, v_source_url, v_now
  );

  insert into public.comun_territorial_organizations(
    territory_id, public_name, organization_type, status, service_territory_public,
    presentation_public, services_public, public_contact_authorized, private_contact,
    verification_status, last_verified_at, internal_notes
  ) values (
    v_territory_id, v_onboarding.organization_name_candidate, p_confirmed_organization_type,
    'forming', v_onboarding.service_territory_candidate, v_onboarding.presentation_candidate,
    array[]::text[],
    case when v_onboarding.public_contact_publication_authorized then v_onboarding.public_contact_candidate else null end,
    null, 'source_checked', v_now, null
  );

  insert into public.comun_territorial_sources(
    territory_id, title, source_type, source_url_public, source_date,
    public_excerpt_summary, confidence_level, review_status, public_note, internal_note
  ) values (
    v_territory_id, v_source_title, 'solidarity_organization_' || p_source_kind,
    v_source_url, v_now::date, v_source_summary, 'medium', 'reviewed',
    'Fonte revisada para exibição da organização no diretório.', v_source_note
  ) returning id into v_source_id;

  insert into private.comun_solidarity_organization_access(
    id, organization_territory_id, member_user_id, requested_role, role, state,
    review_scope, request_note_private, reviewed_by_user_id, review_note_private,
    transition_history_private, requested_at, reviewed_at, activated_at
  ) values (
    v_access_id, v_territory_id, v_onboarding.applicant_user_id, 'facilitator', 'facilitator', 'active',
    'platform', v_onboarding.participation_note_private, p_actor_user_id,
    'Acesso inicial ativado atomicamente após a verificação do onboarding.',
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'event', 'approved_from_organization_onboarding',
      'actorUserId', p_actor_user_id, 'at', v_now
    )), v_now, v_now, v_now
  );

  update private.comun_solidarity_organization_onboarding onboarding set
    organization_type_candidate = p_confirmed_organization_type,
    state = 'approved', reviewed_by_user_id = p_actor_user_id,
    review_message_private = 'Organização verificada para exibição no diretório.',
    reviewed_at = v_now, approved_at = v_now,
    approved_territory_id = v_territory_id, approved_access_id = v_access_id,
    approved_source_id = v_source_id, last_mutation_request_id = p_request_id,
    transition_history_private = onboarding.transition_history_private || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('event', 'approved', 'actorUserId', p_actor_user_id, 'at', v_now)
    )
  where onboarding.id = v_onboarding.id;

  onboarding_id := v_onboarding.id;
  state := 'approved';
  territory_id := v_territory_id;
  organization_slug := v_slug;
  access_id := v_access_id;
  idempotent := false;
  return next;
end;
$$;

create or replace function public.comun_get_my_solidarity_organization_onboarding_v1(
  p_continuation_token uuid,
  p_applicant_user_id uuid
)
returns table(
  onboarding_id uuid,
  continuation_token uuid,
  organization_name_candidate text,
  organization_type_candidate text,
  presentation_candidate text,
  service_territory_candidate text,
  public_contact_candidate text,
  public_contact_publication_authorized boolean,
  public_source_url_candidate text,
  participation_note_private text,
  state text,
  review_message_private text,
  approved_territory_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select onboarding.id, onboarding.continuation_token, onboarding.organization_name_candidate,
    onboarding.organization_type_candidate, onboarding.presentation_candidate,
    onboarding.service_territory_candidate, onboarding.public_contact_candidate,
    onboarding.public_contact_publication_authorized, onboarding.public_source_url_candidate,
    onboarding.participation_note_private, onboarding.state, onboarding.review_message_private,
    onboarding.approved_territory_id, onboarding.created_at, onboarding.updated_at
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.continuation_token = p_continuation_token
    and onboarding.applicant_user_id = p_applicant_user_id
  limit 1
$$;

create or replace function public.comun_list_my_solidarity_organization_onboarding_v1(p_applicant_user_id uuid)
returns table(
  onboarding_id uuid,
  continuation_token uuid,
  organization_name_candidate text,
  state text,
  review_message_private text,
  approved_territory_id uuid,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select onboarding.id, onboarding.continuation_token, onboarding.organization_name_candidate,
    onboarding.state, onboarding.review_message_private, onboarding.approved_territory_id,
    onboarding.updated_at
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.applicant_user_id = p_applicant_user_id
  order by onboarding.updated_at desc
  limit 30
$$;

create or replace function public.comun_list_solidarity_organization_onboarding_review_queue_v1(p_actor_user_id uuid)
returns table(
  onboarding_id uuid,
  organization_name_candidate text,
  organization_type_candidate text,
  presentation_candidate text,
  service_territory_candidate text,
  public_contact_candidate text,
  public_contact_publication_authorized boolean,
  public_source_url_candidate text,
  participation_note_private text,
  state text,
  submitted_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  perform private.comun_solidarity_onboarding_assert_admin(p_actor_user_id);
  return query
  select onboarding.id, onboarding.organization_name_candidate,
    onboarding.organization_type_candidate, onboarding.presentation_candidate,
    onboarding.service_territory_candidate, onboarding.public_contact_candidate,
    onboarding.public_contact_publication_authorized, onboarding.public_source_url_candidate,
    onboarding.participation_note_private, onboarding.state, onboarding.submitted_at,
    onboarding.updated_at
  from private.comun_solidarity_organization_onboarding onboarding
  where onboarding.state = 'submitted'
  order by onboarding.submitted_at, onboarding.created_at
  limit 100;
end;
$$;

revoke all on function public.comun_create_solidarity_organization_onboarding_draft_v1(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.comun_update_solidarity_organization_onboarding_v1(uuid, uuid, uuid, text, text, text, text, text, boolean, text, text) from public, anon, authenticated;
revoke all on function public.comun_submit_solidarity_organization_onboarding_v1(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.comun_withdraw_solidarity_organization_onboarding_v1(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.comun_review_solidarity_organization_onboarding_v1(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.comun_approve_solidarity_organization_onboarding_v1(uuid, uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.comun_get_my_solidarity_organization_onboarding_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.comun_list_my_solidarity_organization_onboarding_v1(uuid) from public, anon, authenticated;
revoke all on function public.comun_list_solidarity_organization_onboarding_review_queue_v1(uuid) from public, anon, authenticated;

grant execute on function public.comun_create_solidarity_organization_onboarding_draft_v1(uuid, uuid, text) to service_role;
grant execute on function public.comun_update_solidarity_organization_onboarding_v1(uuid, uuid, uuid, text, text, text, text, text, boolean, text, text) to service_role;
grant execute on function public.comun_submit_solidarity_organization_onboarding_v1(uuid, uuid, uuid) to service_role;
grant execute on function public.comun_withdraw_solidarity_organization_onboarding_v1(uuid, uuid, uuid) to service_role;
grant execute on function public.comun_review_solidarity_organization_onboarding_v1(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.comun_approve_solidarity_organization_onboarding_v1(uuid, uuid, uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.comun_get_my_solidarity_organization_onboarding_v1(uuid, uuid) to service_role;
grant execute on function public.comun_list_my_solidarity_organization_onboarding_v1(uuid) to service_role;
grant execute on function public.comun_list_solidarity_organization_onboarding_review_queue_v1(uuid) to service_role;
