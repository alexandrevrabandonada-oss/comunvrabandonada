alter table public.comun_territorial_need_interests
  alter column contact_private drop not null,
  add column member_user_id uuid references auth.users(id) on delete cascade,
  add column create_request_id uuid,
  add column consent_version text,
  add column consented_at timestamptz,
  add column reviewed_by_access_id uuid references private.comun_solidarity_organization_access(id) on delete set null,
  add column reviewed_at timestamptz,
  add column accepted_at timestamptz,
  add column rejected_at timestamptz,
  add column withdrawn_at timestamptz,
  add column updated_at timestamptz not null default now();

alter table public.comun_territorial_need_interests
  drop constraint if exists comun_territorial_need_interests_status_check;
alter table public.comun_territorial_need_interests
  add constraint comun_territorial_need_interests_status_check
  check (status in ('pending','contacted','accepted','rejected','withdrawn','archived'));
alter table public.comun_territorial_need_interests
  add constraint comun_territorial_need_interests_a5_shape_check
  check (
    member_user_id is null
    or (
      create_request_id is not null
      and public_alias is null
      and char_length(btrim(coalesce(offer_private, ''))) between 10 and 600
      and status <> 'contacted'
      and consent_version is not null
      and consented_at is not null
      and (
        (consent_to_contact and contact_private is not null and char_length(btrim(contact_private)) between 3 and 200)
        or (not consent_to_contact and contact_private is null)
      )
    )
  );

create unique index comun_territorial_need_interests_request_idx
  on public.comun_territorial_need_interests(create_request_id)
  where create_request_id is not null;
create unique index comun_territorial_need_interests_live_member_idx
  on public.comun_territorial_need_interests(need_id, member_user_id)
  where member_user_id is not null and status in ('pending','accepted');
create index comun_territorial_need_interests_member_idx
  on public.comun_territorial_need_interests(member_user_id, updated_at desc)
  where member_user_id is not null;

create trigger comun_territorial_need_interests_updated_at
before update on public.comun_territorial_need_interests
for each row execute function public.set_updated_at();
alter table public.comun_territorial_need_interests force row level security;
revoke all on table public.comun_territorial_need_interests from public, anon, authenticated;
grant select, insert, update, delete on table public.comun_territorial_need_interests to service_role;

create table private.comun_solidarity_offer_interests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.comun_solidarity_offers(id) on delete restrict,
  organization_territory_id uuid not null references public.comun_territorial_organizations(territory_id) on delete restrict,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  create_request_id uuid not null unique,
  message_private text not null check (char_length(btrim(message_private)) between 10 and 600),
  contact_private text check (contact_private is null or char_length(btrim(contact_private)) between 3 and 200),
  consent_to_contact boolean not null default false,
  consent_version text not null,
  consented_at timestamptz not null,
  state text not null default 'pending' check (state in ('pending','accepted','rejected','withdrawn','archived')),
  reviewed_by_access_id uuid references private.comun_solidarity_organization_access(id) on delete set null,
  reviewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_solidarity_offer_interests_consent_shape check (
    (consent_to_contact and contact_private is not null and consent_version is not null and consented_at is not null)
    or (not consent_to_contact and contact_private is null)
  )
);

comment on table private.comun_solidarity_offer_interests is
  'Interesse privado e consentido em oferta; não representa pedido, reserva, compra, contrato, chat ou troca concluída.';

create unique index comun_solidarity_offer_interests_live_member_idx
  on private.comun_solidarity_offer_interests(offer_id, member_user_id)
  where state in ('pending','accepted');
create index comun_solidarity_offer_interests_member_idx
  on private.comun_solidarity_offer_interests(member_user_id, updated_at desc);
create index comun_solidarity_offer_interests_organization_idx
  on private.comun_solidarity_offer_interests(organization_territory_id, state, created_at);

create trigger comun_solidarity_offer_interests_updated_at
before update on private.comun_solidarity_offer_interests
for each row execute function public.set_updated_at();

alter table private.comun_solidarity_offer_interests enable row level security;
alter table private.comun_solidarity_offer_interests force row level security;
revoke all on table private.comun_solidarity_offer_interests from public, anon, authenticated;
grant select, insert, update, delete on table private.comun_solidarity_offer_interests to service_role;

create or replace function public.comun_create_solidarity_offer_interest_v1(
  p_request_id uuid,
  p_offer_id uuid,
  p_member_user_id uuid,
  p_message_private text,
  p_contact_private text,
  p_consent_version text,
  p_consent_to_contact boolean
)
returns table(interest_id uuid, connection_state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_existing private.comun_solidarity_offer_interests%rowtype;
  v_offer public.comun_solidarity_offers%rowtype;
  v_now timestamptz := clock_timestamp();
  v_recent_count integer;
begin
  if p_request_id is null or p_offer_id is null or p_member_user_id is null
    or not exists(select 1 from auth.users where id = p_member_user_id) then
    raise exception 'COMUN_SOLIDARITY_CONNECTION_REQUEST_INVALID';
  end if;
  p_message_private := btrim(coalesce(p_message_private, ''));
  p_contact_private := btrim(coalesce(p_contact_private, ''));
  if char_length(p_message_private) not between 10 and 600 then
    raise exception 'COMUN_SOLIDARITY_CONNECTION_MESSAGE_INVALID';
  end if;
  if p_consent_to_contact is not true or p_consent_version <> 'comun.solidarity-contact-consent.v1'
    or char_length(p_contact_private) not between 3 and 200 then
    raise exception 'COMUN_SOLIDARITY_CONNECTION_CONSENT_INVALID';
  end if;

  select * into v_existing from private.comun_solidarity_offer_interests where create_request_id = p_request_id;
  if found then
    if v_existing.offer_id <> p_offer_id or v_existing.member_user_id <> p_member_user_id then
      raise exception 'COMUN_SOLIDARITY_CONNECTION_IDEMPOTENCY_CONFLICT';
    end if;
    return query select v_existing.id, v_existing.state, true;
    return;
  end if;
  select * into v_existing from private.comun_solidarity_offer_interests
    where offer_id = p_offer_id and member_user_id = p_member_user_id and state in ('pending','accepted')
    order by created_at desc limit 1;
  if found then
    return query select v_existing.id, v_existing.state, true;
    return;
  end if;
  if exists(select 1 from private.comun_solidarity_offer_interests where offer_id=p_offer_id and member_user_id=p_member_user_id and state='rejected' and rejected_at >= v_now-interval '24 hours') then
    raise exception 'COMUN_SOLIDARITY_CONNECTION_COOLDOWN';
  end if;
  if (select count(*) from (
    select id from private.comun_solidarity_offer_interests where member_user_id=p_member_user_id and state='pending'
    union all select id from public.comun_territorial_need_interests where member_user_id=p_member_user_id and status='pending'
  ) pending) >= 10 then raise exception 'COMUN_SOLIDARITY_CONNECTION_PENDING_LIMIT'; end if;
  select count(*) into v_recent_count from (
    select id from private.comun_solidarity_offer_interests where member_user_id=p_member_user_id and created_at >= v_now-interval '24 hours'
    union all select id from public.comun_territorial_need_interests where member_user_id=p_member_user_id and created_at >= v_now-interval '24 hours'
  ) recent;
  if v_recent_count >= 20 then raise exception 'COMUN_SOLIDARITY_CONNECTION_DAILY_LIMIT'; end if;

  select * into v_offer from public.comun_solidarity_offers where id=p_offer_id;
  if not found or v_offer.status <> 'published' or v_offer.reviewed_at is null or v_offer.published_at is null or v_offer.valid_until <= v_now then
    raise exception 'COMUN_SOLIDARITY_CONNECTION_SUBJECT_UNAVAILABLE';
  end if;
  if not exists(
    select 1 from public.comun_territorial_organizations organization
    join public.comun_hub_territories territory on territory.id=organization.territory_id
    where organization.territory_id=v_offer.organization_territory_id
      and organization.status in ('active','forming') and organization.verification_status in ('source_checked','verified')
      and territory.visibility='public' and territory.status in ('active','monitoring') and territory.verification_status in ('source_checked','verified')
  ) then raise exception 'COMUN_SOLIDARITY_CONNECTION_ORGANIZATION_INELIGIBLE'; end if;

  insert into private.comun_solidarity_offer_interests(
    offer_id,organization_territory_id,member_user_id,create_request_id,message_private,contact_private,
    consent_to_contact,consent_version,consented_at,state
  ) values(
    p_offer_id,v_offer.organization_territory_id,p_member_user_id,p_request_id,p_message_private,p_contact_private,
    true,p_consent_version,v_now,'pending'
  ) returning * into v_existing;
  return query select v_existing.id, v_existing.state, false;
end;
$$;

create or replace function public.comun_create_solidarity_need_interest_v1(
  p_request_id uuid,
  p_need_id uuid,
  p_member_user_id uuid,
  p_message_private text,
  p_contact_private text,
  p_consent_version text,
  p_consent_to_contact boolean
)
returns table(interest_id uuid, connection_state text, idempotent boolean)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_existing public.comun_territorial_need_interests%rowtype;
  v_need public.comun_territorial_needs%rowtype;
  v_now timestamptz := clock_timestamp();
  v_recent_count integer;
begin
  if p_request_id is null or p_need_id is null or p_member_user_id is null
    or not exists(select 1 from auth.users where id = p_member_user_id) then
    raise exception 'COMUN_SOLIDARITY_CONNECTION_REQUEST_INVALID';
  end if;
  p_message_private := btrim(coalesce(p_message_private, ''));
  p_contact_private := btrim(coalesce(p_contact_private, ''));
  if char_length(p_message_private) not between 10 and 600 then raise exception 'COMUN_SOLIDARITY_CONNECTION_MESSAGE_INVALID'; end if;
  if p_consent_to_contact is not true or p_consent_version <> 'comun.solidarity-contact-consent.v1'
    or char_length(p_contact_private) not between 3 and 200 then
    raise exception 'COMUN_SOLIDARITY_CONNECTION_CONSENT_INVALID';
  end if;
  select * into v_existing from public.comun_territorial_need_interests where create_request_id=p_request_id;
  if found then
    if v_existing.need_id<>p_need_id or v_existing.member_user_id<>p_member_user_id then raise exception 'COMUN_SOLIDARITY_CONNECTION_IDEMPOTENCY_CONFLICT'; end if;
    return query select v_existing.id, v_existing.status, true; return;
  end if;
  select * into v_existing from public.comun_territorial_need_interests where need_id=p_need_id and member_user_id=p_member_user_id and status in ('pending','accepted') order by created_at desc limit 1;
  if found then return query select v_existing.id, v_existing.status, true; return; end if;
  if exists(select 1 from public.comun_territorial_need_interests where need_id=p_need_id and member_user_id=p_member_user_id and status='rejected' and rejected_at>=v_now-interval '24 hours') then raise exception 'COMUN_SOLIDARITY_CONNECTION_COOLDOWN'; end if;
  if (select count(*) from (
    select id from private.comun_solidarity_offer_interests where member_user_id=p_member_user_id and state='pending'
    union all select id from public.comun_territorial_need_interests where member_user_id=p_member_user_id and status='pending'
  ) pending) >= 10 then raise exception 'COMUN_SOLIDARITY_CONNECTION_PENDING_LIMIT'; end if;
  select count(*) into v_recent_count from (
    select id from private.comun_solidarity_offer_interests where member_user_id=p_member_user_id and created_at>=v_now-interval '24 hours'
    union all select id from public.comun_territorial_need_interests where member_user_id=p_member_user_id and created_at>=v_now-interval '24 hours'
  ) recent;
  if v_recent_count>=20 then raise exception 'COMUN_SOLIDARITY_CONNECTION_DAILY_LIMIT'; end if;
  select * into v_need from public.comun_territorial_needs where id=p_need_id;
  if not found or v_need.visibility<>'public' or v_need.status not in ('open','partially_met') or v_need.organization_territory_id is null then raise exception 'COMUN_SOLIDARITY_CONNECTION_SUBJECT_UNAVAILABLE'; end if;
  if not exists(
    select 1 from public.comun_territorial_organizations organization join public.comun_hub_territories territory on territory.id=organization.territory_id
    where organization.territory_id=v_need.organization_territory_id and organization.status in ('active','forming') and organization.verification_status in ('source_checked','verified')
      and territory.visibility='public' and territory.status in ('active','monitoring') and territory.verification_status in ('source_checked','verified')
  ) then raise exception 'COMUN_SOLIDARITY_CONNECTION_ORGANIZATION_INELIGIBLE'; end if;
  insert into public.comun_territorial_need_interests(need_id,public_alias,contact_private,offer_private,consent_to_contact,status,member_user_id,create_request_id,consent_version,consented_at)
    values(p_need_id,null,p_contact_private,p_message_private,true,'pending',p_member_user_id,p_request_id,p_consent_version,v_now)
    returning * into v_existing;
  return query select v_existing.id,v_existing.status,false;
end;
$$;

create or replace function public.comun_review_solidarity_connection_v1(
  p_subject_kind text,
  p_interest_id uuid,
  p_expected_organization_territory_id uuid,
  p_actor_user_id uuid,
  p_decision text
)
returns table(connection_state text)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_access private.comun_solidarity_organization_access%rowtype;
  v_org uuid;
  v_subject_archived boolean;
  v_now timestamptz:=clock_timestamp();
begin
  if p_subject_kind not in ('offer','need') or p_decision not in ('accept','reject') then raise exception 'COMUN_SOLIDARITY_CONNECTION_REVIEW_INVALID'; end if;
  select * into v_access from private.comun_solidarity_organization_access
    where organization_territory_id=p_expected_organization_territory_id and member_user_id=p_actor_user_id and state='active' and role in ('editor','facilitator')
    order by activated_at desc limit 1;
  if not found then raise exception 'COMUN_SOLIDARITY_CONNECTION_REVIEW_FORBIDDEN'; end if;
  if p_subject_kind='offer' then
    select interest.organization_territory_id,(offer.status='archived') into v_org,v_subject_archived
      from private.comun_solidarity_offer_interests interest join public.comun_solidarity_offers offer on offer.id=interest.offer_id
      where interest.id=p_interest_id and interest.state='pending' for update of interest;
  else
    select need.organization_territory_id,(need.status='archived') into v_org,v_subject_archived
      from public.comun_territorial_need_interests interest join public.comun_territorial_needs need on need.id=interest.need_id
      where interest.id=p_interest_id and interest.status in ('pending','contacted') for update of interest;
  end if;
  if not found then raise exception 'COMUN_SOLIDARITY_CONNECTION_NOT_PENDING'; end if;
  if v_org is null or v_org<>p_expected_organization_territory_id then raise exception 'COMUN_SOLIDARITY_CONNECTION_ORGANIZATION_MISMATCH'; end if;
  if p_decision='accept' then
    if v_subject_archived then raise exception 'COMUN_SOLIDARITY_CONNECTION_SUBJECT_ARCHIVED'; end if;
    if not exists(
      select 1 from public.comun_territorial_organizations organization join public.comun_hub_territories territory on territory.id=organization.territory_id
      where organization.territory_id=v_org and organization.status in ('active','forming') and organization.verification_status in ('source_checked','verified')
        and territory.visibility='public' and territory.status in ('active','monitoring') and territory.verification_status in ('source_checked','verified')
    ) then raise exception 'COMUN_SOLIDARITY_CONNECTION_ORGANIZATION_INELIGIBLE'; end if;
    if p_subject_kind='offer' then
      update private.comun_solidarity_offer_interests set state='accepted',reviewed_by_access_id=v_access.id,reviewed_at=v_now,accepted_at=v_now where id=p_interest_id;
    else
      update public.comun_territorial_need_interests set status='accepted',reviewed_by_access_id=v_access.id,reviewed_at=v_now,accepted_at=v_now where id=p_interest_id;
    end if;
    return query select 'accepted'::text;
  else
    if p_subject_kind='offer' then
      update private.comun_solidarity_offer_interests set state='rejected',contact_private=null,consent_to_contact=false,reviewed_by_access_id=v_access.id,reviewed_at=v_now,rejected_at=v_now where id=p_interest_id;
    else
      update public.comun_territorial_need_interests set status='rejected',contact_private=null,consent_to_contact=false,reviewed_by_access_id=v_access.id,reviewed_at=v_now,rejected_at=v_now where id=p_interest_id;
    end if;
    return query select 'rejected'::text;
  end if;
end;
$$;

create or replace function public.comun_withdraw_solidarity_connection_v1(
  p_subject_kind text,
  p_interest_id uuid,
  p_member_user_id uuid
)
returns table(connection_state text)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare v_now timestamptz:=clock_timestamp();
begin
  if p_subject_kind='offer' then
    update private.comun_solidarity_offer_interests set state='withdrawn',contact_private=null,consent_to_contact=false,withdrawn_at=v_now
      where id=p_interest_id and member_user_id=p_member_user_id and state in ('pending','accepted');
  elsif p_subject_kind='need' then
    update public.comun_territorial_need_interests set status='withdrawn',contact_private=null,consent_to_contact=false,withdrawn_at=v_now
      where id=p_interest_id and member_user_id=p_member_user_id and status in ('pending','accepted');
  else raise exception 'COMUN_SOLIDARITY_CONNECTION_SUBJECT_INVALID'; end if;
  if not found then raise exception 'COMUN_SOLIDARITY_CONNECTION_WITHDRAW_FORBIDDEN'; end if;
  return query select 'withdrawn'::text;
end;
$$;

create or replace function public.comun_list_my_solidarity_connections_v1(p_member_user_id uuid)
returns table(interest_id uuid,subject_kind text,subject_id uuid,subject_slug text,subject_title text,organization_slug text,organization_name text,connection_state text,created_at timestamptz,updated_at timestamptz,reviewed_at timestamptz,accepted_at timestamptz,withdrawn_at timestamptz)
language sql stable security definer set search_path=pg_catalog,private,public
as $$
  select * from (
    select interest.id,'offer',offer.id,offer.slug,offer.title,territory.slug,organization.public_name,interest.state,interest.created_at,interest.updated_at,interest.reviewed_at,interest.accepted_at,interest.withdrawn_at
    from private.comun_solidarity_offer_interests interest join public.comun_solidarity_offers offer on offer.id=interest.offer_id
    join public.comun_territorial_organizations organization on organization.territory_id=interest.organization_territory_id join public.comun_hub_territories territory on territory.id=organization.territory_id
    where interest.member_user_id=p_member_user_id
    union all
    select interest.id,'need',need.id,need.slug,need.title,territory.slug,organization.public_name,interest.status,interest.created_at,interest.updated_at,interest.reviewed_at,interest.accepted_at,interest.withdrawn_at
    from public.comun_territorial_need_interests interest join public.comun_territorial_needs need on need.id=interest.need_id
    join public.comun_territorial_organizations organization on organization.territory_id=need.organization_territory_id join public.comun_hub_territories territory on territory.id=organization.territory_id
    where interest.member_user_id=p_member_user_id
  ) connection
  order by connection.updated_at desc limit 100
$$;

create or replace function public.comun_list_solidarity_organization_connections_v1(p_organization_territory_id uuid,p_actor_user_id uuid)
returns table(interest_id uuid,subject_kind text,subject_id uuid,subject_slug text,subject_title text,member_label text,message_private text,contact_private text,connection_state text,subject_is_public boolean,created_at timestamptz,updated_at timestamptz,reviewed_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog,private,public
as $$
begin
  if not exists(select 1 from private.comun_solidarity_organization_access where organization_territory_id=p_organization_territory_id and member_user_id=p_actor_user_id and state='active' and role in ('editor','facilitator')) then
    raise exception 'COMUN_SOLIDARITY_CONNECTION_READ_FORBIDDEN';
  end if;
  return query select connection.* from (
    select interest.id,'offer',offer.id,offer.slug,offer.title,
      case when profile.status='active' and char_length(btrim(profile.display_name)) between 1 and 80 then btrim(profile.display_name) else 'Pessoa autenticada' end,
      interest.message_private,case when interest.state='accepted' then interest.contact_private else null end,interest.state,
      (offer.status='published' and offer.valid_until>now()),interest.created_at,interest.updated_at,interest.reviewed_at
    from private.comun_solidarity_offer_interests interest join public.comun_solidarity_offers offer on offer.id=interest.offer_id
    left join public.comun_member_profiles profile on profile.user_id=interest.member_user_id
    where interest.organization_territory_id=p_organization_territory_id and interest.state in ('pending','accepted')
    union all
    select interest.id,'need',need.id,need.slug,need.title,
      case when profile.status='active' and char_length(btrim(profile.display_name)) between 1 and 80 then btrim(profile.display_name) else 'Pessoa autenticada' end,
      interest.offer_private,case when interest.status='accepted' then interest.contact_private else null end,interest.status,
      (need.visibility='public' and need.status in ('open','partially_met')),interest.created_at,interest.updated_at,interest.reviewed_at
    from public.comun_territorial_need_interests interest join public.comun_territorial_needs need on need.id=interest.need_id
    left join public.comun_member_profiles profile on profile.user_id=interest.member_user_id
    where need.organization_territory_id=p_organization_territory_id and interest.member_user_id is not null and interest.status in ('pending','contacted','accepted')
  ) connection
  order by connection.created_at desc limit 100;
end;
$$;

revoke all on function public.comun_create_solidarity_offer_interest_v1(uuid,uuid,uuid,text,text,text,boolean) from public,anon,authenticated;
revoke all on function public.comun_create_solidarity_need_interest_v1(uuid,uuid,uuid,text,text,text,boolean) from public,anon,authenticated;
revoke all on function public.comun_review_solidarity_connection_v1(text,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.comun_withdraw_solidarity_connection_v1(text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.comun_list_my_solidarity_connections_v1(uuid) from public,anon,authenticated;
revoke all on function public.comun_list_solidarity_organization_connections_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.comun_create_solidarity_offer_interest_v1(uuid,uuid,uuid,text,text,text,boolean) to service_role;
grant execute on function public.comun_create_solidarity_need_interest_v1(uuid,uuid,uuid,text,text,text,boolean) to service_role;
grant execute on function public.comun_review_solidarity_connection_v1(text,uuid,uuid,uuid,text) to service_role;
grant execute on function public.comun_withdraw_solidarity_connection_v1(text,uuid,uuid) to service_role;
grant execute on function public.comun_list_my_solidarity_connections_v1(uuid) to service_role;
grant execute on function public.comun_list_solidarity_organization_connections_v1(uuid,uuid) to service_role;
