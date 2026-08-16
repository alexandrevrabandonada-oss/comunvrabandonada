create table private.comun_solidarity_economic_content_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  organization_territory_id uuid not null
    references public.comun_territorial_organizations(territory_id) on delete restrict,
  actor_access_id uuid not null
    references private.comun_solidarity_organization_access(id) on delete restrict,
  actor_member_user_id uuid not null references auth.users(id) on delete restrict,
  subject_type text not null check (subject_type in ('offer','need')),
  subject_id uuid not null,
  operation text not null check (operation in (
    'offer.create','offer.edit','offer.pause','offer.resume','offer.renew','offer.archive',
    'need.create','need.edit','need.partially_met','need.met','need.cancel','need.reopen'
  )),
  from_state text,
  to_state text not null,
  occurred_at timestamptz not null default now(),
  constraint comun_solidarity_economic_event_operation_subject check (
    operation like subject_type || '.%'
  )
);

comment on table private.comun_solidarity_economic_content_events is
  'Auditoria operacional privada e idempotente de conteúdo econômico. Não representa ownership, seller account, pedido, pagamento ou autoria pública.';
comment on column private.comun_solidarity_economic_content_events.actor_member_user_id is
  'Identidade privada usada somente para autorização, auditoria e rate limit; nunca integra DTO ou HTML público.';

create index comun_solidarity_economic_events_actor_rate_idx
  on private.comun_solidarity_economic_content_events(actor_member_user_id, occurred_at desc);
create index comun_solidarity_economic_events_subject_idx
  on private.comun_solidarity_economic_content_events(subject_type, subject_id, occurred_at desc);
create index comun_solidarity_economic_events_organization_idx
  on private.comun_solidarity_economic_content_events(organization_territory_id, occurred_at desc);

alter table private.comun_solidarity_economic_content_events enable row level security;
alter table private.comun_solidarity_economic_content_events force row level security;
revoke all on table private.comun_solidarity_economic_content_events from public, anon, authenticated;
grant select, insert on table private.comun_solidarity_economic_content_events to service_role;

create or replace function private.comun_solidarity_economic_content_is_safe(p_text text)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select
    coalesce(p_text, '') !~* '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}'
    and coalesce(p_text, '') !~ '\m[0-9]{3}[. -]?[0-9]{3}[. -]?[0-9]{3}[-. ]?[0-9]{2}\M'
    and coalesce(p_text, '') !~* '(\+?55[[:space:]]*)?(\(?[0-9]{2}\)?[[:space:]]*)?(9[[:space:]]*)?[0-9]{4}[-[:space:]]?[0-9]{4}'
    and coalesce(p_text, '') !~* '(localhost|127\.0\.0\.1|[?&](token|key|secret|password)=|bearer[[:space:]]+[a-z0-9._~\-]+|eyJ[a-zA-Z0-9_\-]{12,}\.)'
    and coalesce(p_text, '') !~* '\m(arma|armas|munição|munições|explosivo|explosivos|cocaína|crack|droga ilícita|drogas ilícitas|medicamento controlado|medicamentos controlados|receita falsa|documento falso|tráfico de pessoas)\M'
    and coalesce(p_text, '') !~* '((abuso|exploração)[[:space:]]+(sexual[[:space:]]+)?(de[[:space:]]+)?(criança|crianças|menor|menores))'
$$;

create or replace function private.comun_require_solidarity_economic_access(
  p_organization_territory_id uuid,
  p_member_user_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_access_id uuid;
begin
  select access.id into v_access_id
  from private.comun_solidarity_organization_access access
  where access.organization_territory_id = p_organization_territory_id
    and access.member_user_id = p_member_user_id
    and access.state = 'active'
    and access.role in ('editor','facilitator')
  for key share;
  if v_access_id is null then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_ACCESS_FORBIDDEN';
  end if;

  perform 1
  from public.comun_territorial_organizations organization
  join public.comun_hub_territories territory on territory.id = organization.territory_id
  where organization.territory_id = p_organization_territory_id
    and organization.status in ('active','forming')
    and organization.verification_status in ('source_checked','verified')
    and territory.visibility = 'public'
    and territory.status in ('active','monitoring')
    and territory.verification_status in ('source_checked','verified')
  for key share of organization, territory;
  if not found then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_ORGANIZATION_INELIGIBLE';
  end if;
  return v_access_id;
end;
$$;

revoke all on function private.comun_solidarity_economic_content_is_safe(text) from public, anon, authenticated;
revoke all on function private.comun_require_solidarity_economic_access(uuid, uuid) from public, anon, authenticated;
grant execute on function private.comun_solidarity_economic_content_is_safe(text) to service_role;
grant execute on function private.comun_require_solidarity_economic_access(uuid, uuid) to service_role;

create or replace function public.comun_create_solidarity_offer_by_access_v1(
  p_request_id uuid,
  p_organization_territory_id uuid,
  p_actor_user_id uuid,
  p_slug_base text,
  p_title text,
  p_public_summary text,
  p_modalities text[],
  p_offer_kind text default 'other',
  p_price_amount_cents bigint default null,
  p_price_note_public text default null,
  p_availability_public text default null,
  p_validity_days integer default 30
)
returns table(subject_id uuid, subject_slug text, state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_event private.comun_solidarity_economic_content_events%rowtype;
  v_access_id uuid;
  v_subject_id uuid;
  v_slug text;
  v_now timestamptz := clock_timestamp();
  v_modalities text[];
begin
  if p_request_id is null then raise exception 'COMUN_SOLIDARITY_ECONOMIC_REQUEST_ID_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comun-economic-request:' || p_request_id::text, 0));
  select event.* into v_event from private.comun_solidarity_economic_content_events event where event.request_id = p_request_id;
  if found then
    if v_event.actor_member_user_id <> p_actor_user_id
      or v_event.organization_territory_id <> p_organization_territory_id
      or v_event.operation <> 'offer.create' then
      raise exception 'COMUN_SOLIDARITY_ECONOMIC_IDEMPOTENCY_CONFLICT';
    end if;
    select offer.slug, offer.status into v_slug, state
      from public.comun_solidarity_offers offer where offer.id = v_event.subject_id;
    return query select v_event.subject_id, v_slug, state, true;
    return;
  end if;

  v_access_id := private.comun_require_solidarity_economic_access(p_organization_territory_id, p_actor_user_id);
  if (select count(*) from private.comun_solidarity_economic_content_events event
      where event.actor_member_user_id = p_actor_user_id
        and event.operation in ('offer.create','need.create')
        and event.occurred_at >= v_now - interval '24 hours') >= 20 then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_CREATE_RATE_LIMIT';
  end if;

  p_title := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_title, ''), '[[:space:]]+', ' ', 'g'));
  p_public_summary := pg_catalog.btrim(coalesce(p_public_summary, ''));
  p_price_note_public := nullif(pg_catalog.btrim(coalesce(p_price_note_public, '')), '');
  p_availability_public := nullif(pg_catalog.btrim(coalesce(p_availability_public, '')), '');
  p_offer_kind := coalesce(nullif(p_offer_kind, ''), 'other');
  select pg_catalog.array_agg(distinct modality order by modality) into v_modalities
    from pg_catalog.unnest(coalesce(p_modalities, array[]::text[])) modality;
  if pg_catalog.char_length(p_title) not between 3 and 140
    or pg_catalog.char_length(p_public_summary) not between 10 and 1200
    or p_offer_kind not in ('good','service','resource','space','skill','support','other')
    or pg_catalog.cardinality(coalesce(v_modalities, array[]::text[])) not between 1 and 8
    or not coalesce(v_modalities, array[]::text[]) <@ array['sale','exchange','donation','loan','cession','mutual_aid','cooperation','other']::text[]
    or (p_price_amount_cents is not null and p_price_amount_cents not between 1 and 9007199254740991)
    or (p_price_note_public is not null and pg_catalog.char_length(p_price_note_public) > 300)
    or (p_availability_public is not null and pg_catalog.char_length(p_availability_public) > 500)
    or p_validity_days not between 1 and 180 then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_OFFER_INVALID';
  end if;
  if not private.comun_solidarity_economic_content_is_safe(
    p_title || E'\n' || p_public_summary || E'\n' || coalesce(p_price_note_public, '') || E'\n' || coalesce(p_availability_public, '')
  ) then raise exception 'COMUN_SOLIDARITY_ECONOMIC_CONTENT_BLOCKED'; end if;

  p_slug_base := pg_catalog.lower(pg_catalog.regexp_replace(coalesce(p_slug_base, ''), '[^a-z0-9]+', '-', 'g'));
  p_slug_base := pg_catalog.btrim(pg_catalog.left(p_slug_base, 72), '-');
  if pg_catalog.char_length(p_slug_base) < 3 then p_slug_base := 'oferta-solidaria'; end if;
  v_slug := p_slug_base;
  if exists(select 1 from public.comun_solidarity_offers offer where offer.slug = v_slug) then
    v_slug := pg_catalog.left(p_slug_base, 62) || '-' || pg_catalog.left(pg_catalog.replace(gen_random_uuid()::text, '-', ''), 8);
  end if;

  insert into public.comun_solidarity_offers(
    slug, organization_territory_id, title, public_summary, offer_kind, modalities,
    price_amount_cents, price_currency, price_note_public, availability_public,
    status, reviewed_at, published_at, valid_until
  ) values (
    v_slug, p_organization_territory_id, p_title, p_public_summary, p_offer_kind, v_modalities,
    p_price_amount_cents, case when p_price_amount_cents is null then null else 'BRL' end,
    p_price_note_public, p_availability_public, 'published', v_now, v_now,
    v_now + pg_catalog.make_interval(days => p_validity_days)
  ) returning id into v_subject_id;

  insert into private.comun_solidarity_economic_content_events(
    request_id, organization_territory_id, actor_access_id, actor_member_user_id,
    subject_type, subject_id, operation, from_state, to_state, occurred_at
  ) values (p_request_id, p_organization_territory_id, v_access_id, p_actor_user_id,
    'offer', v_subject_id, 'offer.create', null, 'published', v_now);
  return query select v_subject_id, v_slug, 'published'::text, false;
end;
$$;

create or replace function public.comun_mutate_solidarity_offer_by_access_v1(
  p_request_id uuid,
  p_organization_territory_id uuid,
  p_actor_user_id uuid,
  p_offer_id uuid,
  p_operation text,
  p_title text default null,
  p_public_summary text default null,
  p_modalities text[] default null,
  p_offer_kind text default null,
  p_price_amount_cents bigint default null,
  p_price_note_public text default null,
  p_availability_public text default null,
  p_validity_days integer default null
)
returns table(subject_id uuid, subject_slug text, state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_event private.comun_solidarity_economic_content_events%rowtype;
  v_access_id uuid;
  v_offer public.comun_solidarity_offers%rowtype;
  v_now timestamptz := clock_timestamp();
  v_modalities text[];
  v_operation text;
  v_to_state text;
begin
  if p_request_id is null or p_offer_id is null then raise exception 'COMUN_SOLIDARITY_ECONOMIC_REQUEST_INVALID'; end if;
  v_operation := 'offer.' || coalesce(p_operation, '');
  if v_operation not in ('offer.edit','offer.pause','offer.resume','offer.renew','offer.archive') then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_OPERATION_INVALID';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comun-economic-request:' || p_request_id::text, 0));
  select event.* into v_event from private.comun_solidarity_economic_content_events event where event.request_id = p_request_id;
  if found then
    if v_event.actor_member_user_id <> p_actor_user_id or v_event.organization_territory_id <> p_organization_territory_id
      or v_event.operation <> v_operation or v_event.subject_id <> p_offer_id then
      raise exception 'COMUN_SOLIDARITY_ECONOMIC_IDEMPOTENCY_CONFLICT';
    end if;
    select offer.slug, offer.status into subject_slug, state from public.comun_solidarity_offers offer where offer.id = p_offer_id;
    return query select p_offer_id, subject_slug, state, true;
    return;
  end if;

  v_access_id := private.comun_require_solidarity_economic_access(p_organization_territory_id, p_actor_user_id);
  if (select count(*) from private.comun_solidarity_economic_content_events event
      where event.actor_member_user_id = p_actor_user_id and event.operation not in ('offer.create','need.create')
        and event.occurred_at >= v_now - interval '1 hour') >= 100 then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_MUTATION_RATE_LIMIT';
  end if;
  select offer.* into v_offer from public.comun_solidarity_offers offer where offer.id = p_offer_id for update;
  if not found or v_offer.organization_territory_id <> p_organization_territory_id then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_OFFER_NOT_FOUND';
  end if;

  if p_operation = 'edit' then
    if v_offer.status = 'archived' then raise exception 'COMUN_SOLIDARITY_ECONOMIC_OFFER_ARCHIVED'; end if;
    p_title := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_title, ''), '[[:space:]]+', ' ', 'g'));
    p_public_summary := pg_catalog.btrim(coalesce(p_public_summary, ''));
    p_price_note_public := nullif(pg_catalog.btrim(coalesce(p_price_note_public, '')), '');
    p_availability_public := nullif(pg_catalog.btrim(coalesce(p_availability_public, '')), '');
    p_offer_kind := coalesce(nullif(p_offer_kind, ''), 'other');
    select pg_catalog.array_agg(distinct modality order by modality) into v_modalities
      from pg_catalog.unnest(coalesce(p_modalities, array[]::text[])) modality;
    if pg_catalog.char_length(p_title) not between 3 and 140
      or pg_catalog.char_length(p_public_summary) not between 10 and 1200
      or p_offer_kind not in ('good','service','resource','space','skill','support','other')
      or pg_catalog.cardinality(coalesce(v_modalities, array[]::text[])) not between 1 and 8
      or not coalesce(v_modalities, array[]::text[]) <@ array['sale','exchange','donation','loan','cession','mutual_aid','cooperation','other']::text[]
      or (p_price_amount_cents is not null and p_price_amount_cents not between 1 and 9007199254740991)
      or (p_price_note_public is not null and pg_catalog.char_length(p_price_note_public) > 300)
      or (p_availability_public is not null and pg_catalog.char_length(p_availability_public) > 500)
      or not private.comun_solidarity_economic_content_is_safe(p_title || E'\n' || p_public_summary || E'\n' || coalesce(p_price_note_public, '') || E'\n' || coalesce(p_availability_public, '')) then
      raise exception 'COMUN_SOLIDARITY_ECONOMIC_OFFER_INVALID';
    end if;
    update public.comun_solidarity_offers offer set title = p_title, public_summary = p_public_summary,
      offer_kind = p_offer_kind, modalities = v_modalities, price_amount_cents = p_price_amount_cents,
      price_currency = case when p_price_amount_cents is null then null else 'BRL' end,
      price_note_public = p_price_note_public, availability_public = p_availability_public, reviewed_at = v_now
      where offer.id = p_offer_id;
    v_to_state := v_offer.status;
  elsif p_operation = 'pause' then
    if v_offer.status <> 'published' then raise exception 'COMUN_SOLIDARITY_ECONOMIC_OFFER_TRANSITION_INVALID'; end if;
    update public.comun_solidarity_offers offer set status = 'paused' where offer.id = p_offer_id;
    v_to_state := 'paused';
  elsif p_operation = 'resume' then
    if v_offer.status <> 'paused' or v_offer.valid_until <= v_now
      or not private.comun_solidarity_economic_content_is_safe(v_offer.title || E'\n' || v_offer.public_summary || E'\n' || coalesce(v_offer.price_note_public, '') || E'\n' || coalesce(v_offer.availability_public, '')) then
      raise exception 'COMUN_SOLIDARITY_ECONOMIC_OFFER_TRANSITION_INVALID';
    end if;
    update public.comun_solidarity_offers offer set status = 'published', reviewed_at = v_now where offer.id = p_offer_id;
    v_to_state := 'published';
  elsif p_operation = 'renew' then
    if v_offer.status = 'archived' or coalesce(p_validity_days, 30) not between 1 and 180
      or not private.comun_solidarity_economic_content_is_safe(v_offer.title || E'\n' || v_offer.public_summary || E'\n' || coalesce(v_offer.price_note_public, '') || E'\n' || coalesce(v_offer.availability_public, '')) then
      raise exception 'COMUN_SOLIDARITY_ECONOMIC_OFFER_TRANSITION_INVALID';
    end if;
    update public.comun_solidarity_offers offer set status = 'published', reviewed_at = v_now,
      published_at = coalesce(offer.published_at, v_now), valid_until = v_now + pg_catalog.make_interval(days => coalesce(p_validity_days, 30))
      where offer.id = p_offer_id;
    v_to_state := 'published';
  else
    if v_offer.status = 'archived' then raise exception 'COMUN_SOLIDARITY_ECONOMIC_OFFER_TRANSITION_INVALID'; end if;
    update public.comun_solidarity_offers offer set status = 'archived' where offer.id = p_offer_id;
    v_to_state := 'archived';
  end if;

  insert into private.comun_solidarity_economic_content_events(
    request_id, organization_territory_id, actor_access_id, actor_member_user_id,
    subject_type, subject_id, operation, from_state, to_state, occurred_at
  ) values (p_request_id, p_organization_territory_id, v_access_id, p_actor_user_id,
    'offer', p_offer_id, v_operation, v_offer.status, v_to_state, v_now);
  return query select p_offer_id, v_offer.slug, v_to_state, false;
end;
$$;

create or replace function public.comun_create_solidarity_need_by_access_v1(
  p_request_id uuid,
  p_organization_territory_id uuid,
  p_actor_user_id uuid,
  p_slug_base text,
  p_title text,
  p_public_summary text,
  p_need_type text default 'other',
  p_due_at timestamptz default null
)
returns table(subject_id uuid, subject_slug text, state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_event private.comun_solidarity_economic_content_events%rowtype;
  v_access_id uuid;
  v_subject_id uuid;
  v_slug text;
  v_now timestamptz := clock_timestamp();
begin
  if p_request_id is null then raise exception 'COMUN_SOLIDARITY_ECONOMIC_REQUEST_ID_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comun-economic-request:' || p_request_id::text, 0));
  select event.* into v_event from private.comun_solidarity_economic_content_events event where event.request_id = p_request_id;
  if found then
    if v_event.actor_member_user_id <> p_actor_user_id or v_event.organization_territory_id <> p_organization_territory_id
      or v_event.operation <> 'need.create' then raise exception 'COMUN_SOLIDARITY_ECONOMIC_IDEMPOTENCY_CONFLICT'; end if;
    select need.slug, need.status into v_slug, state from public.comun_territorial_needs need where need.id = v_event.subject_id;
    return query select v_event.subject_id, v_slug, state, true;
    return;
  end if;
  v_access_id := private.comun_require_solidarity_economic_access(p_organization_territory_id, p_actor_user_id);
  if (select count(*) from private.comun_solidarity_economic_content_events event
      where event.actor_member_user_id = p_actor_user_id and event.operation in ('offer.create','need.create')
        and event.occurred_at >= v_now - interval '24 hours') >= 20 then raise exception 'COMUN_SOLIDARITY_ECONOMIC_CREATE_RATE_LIMIT'; end if;

  p_title := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_title, ''), '[[:space:]]+', ' ', 'g'));
  p_public_summary := pg_catalog.btrim(coalesce(p_public_summary, ''));
  p_need_type := coalesce(nullif(p_need_type, ''), 'other');
  if pg_catalog.char_length(p_title) not between 3 and 160 or pg_catalog.char_length(p_public_summary) not between 10 and 1200
    or p_need_type not in ('equipment','vehicle','space','input','training','technical_support','partnership','volunteering','donation','hiring','infrastructure','communication','other')
    or (p_due_at is not null and p_due_at <= v_now)
    or not private.comun_solidarity_economic_content_is_safe(p_title || E'\n' || p_public_summary) then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_NEED_INVALID';
  end if;
  p_slug_base := pg_catalog.lower(pg_catalog.regexp_replace(coalesce(p_slug_base, ''), '[^a-z0-9]+', '-', 'g'));
  p_slug_base := pg_catalog.btrim(pg_catalog.left(p_slug_base, 72), '-');
  if pg_catalog.char_length(p_slug_base) < 3 then p_slug_base := 'necessidade-solidaria'; end if;
  v_slug := p_slug_base;
  if exists(select 1 from public.comun_territorial_needs need where need.slug = v_slug) then
    v_slug := pg_catalog.left(p_slug_base, 62) || '-' || pg_catalog.left(pg_catalog.replace(gen_random_uuid()::text, '-', ''), 8);
  end if;

  insert into public.comun_territorial_needs(
    slug, title, public_summary, need_type, status, territory_id, organization_territory_id,
    project_id, pauta_id, action_id, task_id, responsible_internal, due_at, visibility, internal_notes
  ) values (v_slug, p_title, p_public_summary, p_need_type, 'open', p_organization_territory_id,
    p_organization_territory_id, null, null, null, null, null, p_due_at, 'public', null)
  returning id into v_subject_id;
  insert into private.comun_solidarity_economic_content_events(
    request_id, organization_territory_id, actor_access_id, actor_member_user_id,
    subject_type, subject_id, operation, from_state, to_state, occurred_at
  ) values (p_request_id, p_organization_territory_id, v_access_id, p_actor_user_id,
    'need', v_subject_id, 'need.create', null, 'open', v_now);
  return query select v_subject_id, v_slug, 'open'::text, false;
end;
$$;

create or replace function public.comun_mutate_solidarity_need_by_access_v1(
  p_request_id uuid,
  p_organization_territory_id uuid,
  p_actor_user_id uuid,
  p_need_id uuid,
  p_operation text,
  p_title text default null,
  p_public_summary text default null,
  p_need_type text default null,
  p_due_at timestamptz default null
)
returns table(subject_id uuid, subject_slug text, state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_event private.comun_solidarity_economic_content_events%rowtype;
  v_access_id uuid;
  v_need public.comun_territorial_needs%rowtype;
  v_now timestamptz := clock_timestamp();
  v_operation text;
  v_to_state text;
begin
  if p_request_id is null or p_need_id is null then raise exception 'COMUN_SOLIDARITY_ECONOMIC_REQUEST_INVALID'; end if;
  v_operation := 'need.' || coalesce(p_operation, '');
  if v_operation not in ('need.edit','need.partially_met','need.met','need.cancel','need.reopen') then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_OPERATION_INVALID';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comun-economic-request:' || p_request_id::text, 0));
  select event.* into v_event from private.comun_solidarity_economic_content_events event where event.request_id = p_request_id;
  if found then
    if v_event.actor_member_user_id <> p_actor_user_id or v_event.organization_territory_id <> p_organization_territory_id
      or v_event.operation <> v_operation or v_event.subject_id <> p_need_id then raise exception 'COMUN_SOLIDARITY_ECONOMIC_IDEMPOTENCY_CONFLICT'; end if;
    select need.slug, need.status into subject_slug, state from public.comun_territorial_needs need where need.id = p_need_id;
    return query select p_need_id, subject_slug, state, true;
    return;
  end if;
  v_access_id := private.comun_require_solidarity_economic_access(p_organization_territory_id, p_actor_user_id);
  if (select count(*) from private.comun_solidarity_economic_content_events event
      where event.actor_member_user_id = p_actor_user_id and event.operation not in ('offer.create','need.create')
        and event.occurred_at >= v_now - interval '1 hour') >= 100 then raise exception 'COMUN_SOLIDARITY_ECONOMIC_MUTATION_RATE_LIMIT'; end if;
  select need.* into v_need from public.comun_territorial_needs need where need.id = p_need_id for update;
  if not found or v_need.organization_territory_id <> p_organization_territory_id then
    raise exception 'COMUN_SOLIDARITY_ECONOMIC_NEED_NOT_FOUND';
  end if;

  if p_operation = 'edit' then
    if v_need.status = 'archived' then raise exception 'COMUN_SOLIDARITY_ECONOMIC_NEED_ARCHIVED'; end if;
    p_title := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_title, ''), '[[:space:]]+', ' ', 'g'));
    p_public_summary := pg_catalog.btrim(coalesce(p_public_summary, ''));
    p_need_type := coalesce(nullif(p_need_type, ''), 'other');
    if pg_catalog.char_length(p_title) not between 3 and 160 or pg_catalog.char_length(p_public_summary) not between 10 and 1200
      or p_need_type not in ('equipment','vehicle','space','input','training','technical_support','partnership','volunteering','donation','hiring','infrastructure','communication','other')
      or (p_due_at is not null and p_due_at <= v_now)
      or not private.comun_solidarity_economic_content_is_safe(p_title || E'\n' || p_public_summary) then
      raise exception 'COMUN_SOLIDARITY_ECONOMIC_NEED_INVALID';
    end if;
    update public.comun_territorial_needs need set title = p_title, public_summary = p_public_summary,
      need_type = p_need_type, due_at = p_due_at where need.id = p_need_id;
    v_to_state := v_need.status;
  elsif p_operation = 'partially_met' then
    if v_need.status <> 'open' then raise exception 'COMUN_SOLIDARITY_ECONOMIC_NEED_TRANSITION_INVALID'; end if;
    update public.comun_territorial_needs need set status = 'partially_met' where need.id = p_need_id;
    v_to_state := 'partially_met';
  elsif p_operation = 'met' then
    if v_need.status not in ('open','partially_met') then raise exception 'COMUN_SOLIDARITY_ECONOMIC_NEED_TRANSITION_INVALID'; end if;
    update public.comun_territorial_needs need set status = 'met' where need.id = p_need_id;
    v_to_state := 'met';
  elsif p_operation = 'cancel' then
    if v_need.status not in ('open','partially_met') then raise exception 'COMUN_SOLIDARITY_ECONOMIC_NEED_TRANSITION_INVALID'; end if;
    update public.comun_territorial_needs need set status = 'cancelled' where need.id = p_need_id;
    v_to_state := 'cancelled';
  else
    if v_need.status not in ('met','cancelled') then raise exception 'COMUN_SOLIDARITY_ECONOMIC_NEED_TRANSITION_INVALID'; end if;
    update public.comun_territorial_needs need set status = 'open' where need.id = p_need_id;
    v_to_state := 'open';
  end if;

  insert into private.comun_solidarity_economic_content_events(
    request_id, organization_territory_id, actor_access_id, actor_member_user_id,
    subject_type, subject_id, operation, from_state, to_state, occurred_at
  ) values (p_request_id, p_organization_territory_id, v_access_id, p_actor_user_id,
    'need', p_need_id, v_operation, v_need.status, v_to_state, v_now);
  return query select p_need_id, v_need.slug, v_to_state, false;
end;
$$;

revoke all on function public.comun_create_solidarity_offer_by_access_v1(uuid, uuid, uuid, text, text, text, text[], text, bigint, text, text, integer) from public, anon, authenticated;
revoke all on function public.comun_mutate_solidarity_offer_by_access_v1(uuid, uuid, uuid, uuid, text, text, text, text[], text, bigint, text, text, integer) from public, anon, authenticated;
revoke all on function public.comun_create_solidarity_need_by_access_v1(uuid, uuid, uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.comun_mutate_solidarity_need_by_access_v1(uuid, uuid, uuid, uuid, text, text, text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.comun_create_solidarity_offer_by_access_v1(uuid, uuid, uuid, text, text, text, text[], text, bigint, text, text, integer) to service_role;
grant execute on function public.comun_mutate_solidarity_offer_by_access_v1(uuid, uuid, uuid, uuid, text, text, text, text[], text, bigint, text, text, integer) to service_role;
grant execute on function public.comun_create_solidarity_need_by_access_v1(uuid, uuid, uuid, text, text, text, text, timestamptz) to service_role;
grant execute on function public.comun_mutate_solidarity_need_by_access_v1(uuid, uuid, uuid, uuid, text, text, text, text, timestamptz) to service_role;
