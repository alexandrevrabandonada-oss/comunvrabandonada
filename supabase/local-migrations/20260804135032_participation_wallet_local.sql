-- TIJOLO 48.0G. Carteira local-only, forward-only e dormente.
-- Nenhum token de capacidade, recibo ou recuperação é persistido em texto puro.

create table private.comun_participation_wallets (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  constraint comun_wallet_status check (status in ('active','revoked')),
  constraint comun_wallet_token_hash_length check (octet_length(token_hash) = 32)
);

create table private.comun_participation_wallet_items (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  item_type text not null,
  subject_ref text not null,
  subject_hash bytea not null,
  title_template text not null,
  category text,
  presentation_state text not null default 'Guardado',
  action_required text,
  protocol_masked text,
  source_domain text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  withdrawn_at timestamptz,
  constraint comun_wallet_item_type check (item_type in ('relata_report','legacy_report_follow','bus_observation','collective_case_follow','community_confirmation')),
  constraint comun_wallet_item_source check (source_domain in ('relata','legacy','onibus','collective_case','community')),
  constraint comun_wallet_item_subject_hash_length check (octet_length(subject_hash) = 32),
  constraint comun_wallet_item_metadata_object check (jsonb_typeof(metadata) = 'object'),
  unique (wallet_id, item_type, subject_hash)
);

create table private.comun_participation_wallet_events (
  id bigint generated always as identity primary key,
  wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  item_id uuid references private.comun_participation_wallet_items(id) on delete restrict,
  event_type text not null,
  result_code text not null,
  created_at timestamptz not null default now(),
  constraint comun_wallet_event_type check (event_type in ('item_added','item_updated','action_required','item_archived','recovery_performed','token_rotated','item_withdrawn')),
  constraint comun_wallet_event_code check (result_code ~ '^WALLET_[A-Z0-9_]{3,80}$')
);

create table private.comun_participation_wallet_recovery_credentials (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references private.comun_participation_wallets(id) on delete restrict,
  recovery_hash bytea not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  revoked_at timestamptz,
  constraint comun_wallet_recovery_hash_length check (octet_length(recovery_hash) = 32)
);

create table private.comun_participation_wallet_rate_limits (
  attempt_hash bytea primary key,
  attempts integer not null default 0 check (attempts between 0 and 20),
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint comun_wallet_rate_hash_length check (octet_length(attempt_hash) = 32)
);

create index comun_wallet_items_wallet_updated_idx
  on private.comun_participation_wallet_items(wallet_id, archived_at, updated_at desc);
create index comun_wallet_events_wallet_time_idx
  on private.comun_participation_wallet_events(wallet_id, created_at desc, id desc);

create or replace function public.comun_participation_wallet_create(
  p_token_hash_hex text,
  p_recovery_hash_hex text
)
returns table(wallet_id uuid)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare
  v_wallet uuid;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_recovery_hash_hex !~ '^[0-9a-f]{64}$' then return; end if;
  insert into private.comun_participation_wallets(token_hash)
    values (decode(p_token_hash_hex, 'hex'))
    on conflict (token_hash) do update set rotated_at = private.comun_participation_wallets.rotated_at
    returning id into v_wallet;
  if v_wallet is null then
    select id into v_wallet from private.comun_participation_wallets where token_hash = decode(p_token_hash_hex, 'hex') and status = 'active';
  end if;
  insert into private.comun_participation_wallet_recovery_credentials(wallet_id, recovery_hash)
    values (v_wallet, decode(p_recovery_hash_hex, 'hex'))
    on conflict (recovery_hash) do nothing;
  return query select v_wallet;
end;
$$;

create or replace function public.comun_participation_wallet_list(
  p_token_hash_hex text
)
returns table(
  item_id uuid,
  item_type text,
  title_template text,
  category text,
  presentation_state text,
  action_required text,
  protocol_masked text,
  source_domain text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql stable security definer set search_path = 'pg_catalog'
as $$
  select item.id, item.item_type, item.title_template, item.category,
    case when item.item_type = 'relata_report' then coalesce(relata.state, item.presentation_state) else item.presentation_state end,
    item.action_required,
    case when item.item_type = 'relata_report' and relata.protocol is not null
      then left(relata.protocol, 12) || '••••'
      else item.protocol_masked end,
    item.source_domain, item.metadata, item.created_at, item.updated_at
  from private.comun_participation_wallets wallet
  join private.comun_participation_wallet_items item on item.wallet_id = wallet.id
  left join public.comun_relata_cases relata on item.item_type = 'relata_report' and item.subject_ref = relata.id::text
  where wallet.token_hash = decode(p_token_hash_hex, 'hex')
    and wallet.status = 'active'
    and item.archived_at is null
  order by (item.action_required is not null) desc, item.updated_at desc;
$$;

create or replace function public.comun_participation_wallet_attach_relata(
  p_token_hash_hex text,
  p_protocol text,
  p_receipt_secret text
)
returns table(item_id uuid, recovery_needed boolean)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare
  v_wallet private.comun_participation_wallets%rowtype;
  v_case public.comun_relata_cases%rowtype;
  v_report private.comun_relata_reports%rowtype;
  v_item uuid;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_protocol !~ '^COMUN-RELATA-[A-F0-9]{16}$' or p_receipt_secret !~ '^[A-Za-z0-9_-]{32,160}$' then return; end if;
  select * into v_wallet from private.comun_participation_wallets where token_hash = decode(p_token_hash_hex, 'hex') and status = 'active';
  if not found then return; end if;
  select * into v_case from public.comun_relata_cases where protocol = p_protocol;
  if not found then return; end if;
  select * into v_report from private.comun_relata_reports where id = v_case.report_id and receipt_hash = extensions.digest('relata-receipt-v1:' || p_receipt_secret, 'sha256');
  if not found then return; end if;
  insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,category,presentation_state,action_required,protocol_masked,source_domain,metadata)
    values(v_wallet.id,'relata_report',v_case.id::text,extensions.digest('wallet-subject-v1:' || v_case.protocol,'sha256'),'Relato COMUN',v_case.category,case when v_case.state = 'captured_private' then 'Guardado' else 'Ainda não encaminhado' end,case when v_case.state = 'captured_private' then 'Precisa de informação' else null end,left(v_case.protocol,12) || '••••','relata',jsonb_build_object('hasLocation',exists(select 1 from private.comun_relata_private_locations where report_id=v_report.id),'photoCount',0,'collectiveCase','indisponível'))
    on conflict (wallet_id,item_type,subject_hash) do update set updated_at=now(), archived_at=null, withdrawn_at=null
    returning id into v_item;
  insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values(v_wallet.id,v_item,'item_added','WALLET_RELATA_ATTACHED');
  return query select v_item,false;
end;
$$;

create or replace function public.comun_participation_wallet_follow_legacy(
  p_token_hash_hex text,
  p_protocol text
)
returns table(item_id uuid)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_item uuid;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_protocol !~ '^COMUN-[A-Z0-9-]{6,80}$' then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null then return; end if;
  insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,presentation_state,protocol_masked,source_domain,metadata)
    values(v_wallet,'legacy_report_follow',p_protocol,extensions.digest('wallet-subject-v1:'||p_protocol,'sha256'),'Protocolo acompanhado','Acompanhando',left(p_protocol,12)||'••••','legacy','{}'::jsonb)
    on conflict(wallet_id,item_type,subject_hash) do update set archived_at=null,updated_at=now()
    returning id into v_item;
  insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values(v_wallet,v_item,'item_added','WALLET_LEGACY_FOLLOWED');
  return query select v_item;
end;
$$;

create or replace function public.comun_participation_wallet_follow_case(
  p_token_hash_hex text,
  p_public_case_id text,
  p_category text default null
)
returns table(item_id uuid)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_item uuid;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_public_case_id !~ '^[A-Za-z0-9_-]{8,120}$' then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null then return; end if;
  insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,category,presentation_state,protocol_masked,source_domain,metadata)
    values(v_wallet,'collective_case_follow',p_public_case_id,extensions.digest('wallet-subject-v1:'||p_public_case_id,'sha256'),'Caso coletivo acompanhado',p_category,'Acompanhando',null,'collective_case',jsonb_build_object('publicCaseId',p_public_case_id))
    on conflict(wallet_id,item_type,subject_hash) do update set archived_at=null,updated_at=now()
    returning id into v_item;
  insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values(v_wallet,v_item,'item_added','WALLET_CASE_FOLLOWED');
  return query select v_item;
end;
$$;

create or replace function public.comun_participation_wallet_claim_bus(
  p_token_hash_hex text,
  p_observation_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(item_id uuid)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_item uuid; v_meta jsonb;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_observation_id !~ '^[A-Za-z0-9_-]{8,120}$' or jsonb_typeof(coalesce(p_metadata,'{}'::jsonb)) <> 'object' then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null then return; end if;
  v_meta := jsonb_build_object(
    'line', case when jsonb_typeof(p_metadata->'line') = 'string' then p_metadata->>'line' else null end,
    'direction', case when jsonb_typeof(p_metadata->'direction') = 'string' then p_metadata->>'direction' else null end,
    'stop', case when jsonb_typeof(p_metadata->'stop') = 'string' then p_metadata->>'stop' else null end,
    'observedDelayBucket', case when jsonb_typeof(p_metadata->'observedDelayBucket') = 'string' then p_metadata->>'observedDelayBucket' else null end
  );
  insert into private.comun_participation_wallet_items(wallet_id,item_type,subject_ref,subject_hash,title_template,category,presentation_state,source_domain,metadata)
    values(v_wallet,'bus_observation',p_observation_id,extensions.digest('wallet-subject-v1:'||p_observation_id,'sha256'),'Observação de ônibus','public_transport','Observação registrada','onibus',v_meta)
    on conflict(wallet_id,item_type,subject_hash) do update set archived_at=null,updated_at=now(),metadata=excluded.metadata
    returning id into v_item;
  insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values(v_wallet,v_item,'item_added','WALLET_BUS_ATTACHED');
  return query select v_item;
end;
$$;

create or replace function public.comun_participation_wallet_remove_item(
  p_token_hash_hex text,
  p_item_id uuid
)
returns boolean
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid; v_item private.comun_participation_wallet_items%rowtype; v_case public.comun_relata_cases%rowtype; v_report private.comun_relata_reports%rowtype;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' then return false; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null then return false; end if;
  select * into v_item from private.comun_participation_wallet_items where id=p_item_id and wallet_id=v_wallet and archived_at is null;
  if not found then return false; end if;
  if v_item.item_type='relata_report' then
    select * into v_case from public.comun_relata_cases where id=v_item.subject_ref::uuid;
    if found and v_case.state <> 'withdrawn' then
      update public.comun_relata_cases set state='withdrawn',withdrawn_at=now(),updated_at=now() where id=v_case.id;
      update private.comun_relata_reports set withdrawn_at=now(),retention_class='withdrawn',review_after=now()+interval '30 days' where id=v_case.report_id returning * into v_report;
      insert into public.comun_relata_status_events(case_id,state,actor,result_code) values(v_case.id,'withdrawn','person','RELATA_WITHDRAWN_BY_WALLET');
    end if;
  end if;
  update private.comun_participation_wallet_items set archived_at=now(),withdrawn_at=case when v_item.item_type='relata_report' then now() else withdrawn_at end,updated_at=now() where id=v_item.id;
  insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values(v_wallet,v_item.id,'item_withdrawn','WALLET_ITEM_WITHDRAWN');
  return true;
end;
$$;

create or replace function public.comun_participation_wallet_redeem(
  p_recovery_code_hash_hex text,
  p_new_token_hash_hex text
)
returns table(wallet_id uuid, recovery_ok boolean)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_credential private.comun_participation_wallet_recovery_credentials%rowtype; v_wallet uuid;
  v_attempts integer; v_locked_until timestamptz;
begin
  if p_recovery_code_hash_hex !~ '^[0-9a-f]{64}$' or p_new_token_hash_hex !~ '^[0-9a-f]{64}$' then return query select null::uuid,false; return; end if;
  insert into private.comun_participation_wallet_rate_limits(attempt_hash, attempts)
    values (decode(p_recovery_code_hash_hex, 'hex'), 1)
    on conflict (attempt_hash) do update
      set attempts = least(private.comun_participation_wallet_rate_limits.attempts + 1, 20),
          locked_until = case when private.comun_participation_wallet_rate_limits.attempts + 1 >= 5
            then now() + interval '15 minutes' else private.comun_participation_wallet_rate_limits.locked_until end,
          updated_at = now()
    returning attempts, locked_until into v_attempts, v_locked_until;
  if v_locked_until is not null and v_locked_until > now() then return query select null::uuid,false; return; end if;
  select * into v_credential from private.comun_participation_wallet_recovery_credentials where recovery_hash=decode(p_recovery_code_hash_hex,'hex') and active=true and revoked_at is null and used_at is null;
  if not found then return query select null::uuid,false; return; end if;
  select id into v_wallet from private.comun_participation_wallets where id=v_credential.wallet_id and status='active';
  if v_wallet is null then return query select null::uuid,false; return; end if;
  update private.comun_participation_wallets set token_hash=decode(p_new_token_hash_hex,'hex'),rotated_at=now() where id=v_wallet;
  update private.comun_participation_wallet_recovery_credentials set used_at=now(),active=false where id=v_credential.id;
  delete from private.comun_participation_wallet_rate_limits where attempt_hash=decode(p_recovery_code_hash_hex, 'hex');
  insert into private.comun_participation_wallet_events(wallet_id,event_type,result_code) values(v_wallet,'recovery_performed','WALLET_RECOVERY_REDEEMED'),(v_wallet,'token_rotated','WALLET_TOKEN_ROTATED');
  return query select v_wallet,true;
end;
$$;

create or replace function public.comun_participation_wallet_rotate_recovery(
  p_token_hash_hex text,
  p_new_recovery_hash_hex text,
  p_new_token_hash_hex text
)
returns table(wallet_id uuid, rotated boolean)
language plpgsql security definer set search_path = 'pg_catalog'
as $$
declare v_wallet uuid;
begin
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' or p_new_recovery_hash_hex !~ '^[0-9a-f]{64}$' or p_new_token_hash_hex !~ '^[0-9a-f]{64}$' then return; end if;
  select id into v_wallet from private.comun_participation_wallets where token_hash=decode(p_token_hash_hex,'hex') and status='active';
  if v_wallet is null then return; end if;
  update private.comun_participation_wallet_recovery_credentials as credential set active=false,revoked_at=now() where credential.wallet_id=v_wallet and credential.active=true;
  update private.comun_participation_wallets set token_hash=decode(p_new_token_hash_hex,'hex'),rotated_at=now() where id=v_wallet;
  insert into private.comun_participation_wallet_recovery_credentials(wallet_id,recovery_hash) values(v_wallet,decode(p_new_recovery_hash_hex,'hex'));
  insert into private.comun_participation_wallet_events(wallet_id,event_type,result_code) values(v_wallet,'token_rotated','WALLET_TOKEN_ROTATED');
  return query select v_wallet,true;
end;
$$;

alter table private.comun_participation_wallets enable row level security;
alter table private.comun_participation_wallets force row level security;
alter table private.comun_participation_wallet_items enable row level security;
alter table private.comun_participation_wallet_items force row level security;
alter table private.comun_participation_wallet_events enable row level security;
alter table private.comun_participation_wallet_events force row level security;
alter table private.comun_participation_wallet_recovery_credentials enable row level security;
alter table private.comun_participation_wallet_recovery_credentials force row level security;
alter table private.comun_participation_wallet_rate_limits enable row level security;
alter table private.comun_participation_wallet_rate_limits force row level security;

revoke all on table private.comun_participation_wallets from public, anon, authenticated;
revoke all on table private.comun_participation_wallet_items from public, anon, authenticated;
revoke all on table private.comun_participation_wallet_events from public, anon, authenticated;
revoke all on table private.comun_participation_wallet_recovery_credentials from public, anon, authenticated;
revoke all on table private.comun_participation_wallet_rate_limits from public, anon, authenticated;

revoke all on function public.comun_participation_wallet_create(text,text) from public, anon, authenticated;
revoke all on function public.comun_participation_wallet_list(text) from public, anon, authenticated;
revoke all on function public.comun_participation_wallet_attach_relata(text,text,text) from public, anon, authenticated;
revoke all on function public.comun_participation_wallet_follow_legacy(text,text) from public, anon, authenticated;
revoke all on function public.comun_participation_wallet_follow_case(text,text,text) from public, anon, authenticated;
revoke all on function public.comun_participation_wallet_claim_bus(text,text,jsonb) from public, anon, authenticated;
revoke all on function public.comun_participation_wallet_remove_item(text,uuid) from public, anon, authenticated;
revoke all on function public.comun_participation_wallet_redeem(text,text) from public, anon, authenticated;
revoke all on function public.comun_participation_wallet_rotate_recovery(text,text,text) from public, anon, authenticated;

grant execute on function public.comun_participation_wallet_create(text,text) to service_role;
grant execute on function public.comun_participation_wallet_list(text) to service_role;
grant execute on function public.comun_participation_wallet_attach_relata(text,text,text) to service_role;
grant execute on function public.comun_participation_wallet_follow_legacy(text,text) to service_role;
grant execute on function public.comun_participation_wallet_follow_case(text,text,text) to service_role;
grant execute on function public.comun_participation_wallet_claim_bus(text,text,jsonb) to service_role;
grant execute on function public.comun_participation_wallet_remove_item(text,uuid) to service_role;
grant execute on function public.comun_participation_wallet_redeem(text,text) to service_role;
grant execute on function public.comun_participation_wallet_rotate_recovery(text,text,text) to service_role;

comment on table private.comun_participation_wallets is '48.0G local-only anonymous participation wallet; token hash only.';
comment on table private.comun_participation_wallet_items is '48.0G local-only references; no receipt or recovery secret.';
