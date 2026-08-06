begin;

create or replace function public.comun_participation_wallet_link_account(
  p_token_hash_hex text,
  p_user_id uuid,
  p_link_method text
)
returns table(
  wallet_id uuid,
  linked boolean
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_wallet_id uuid;
begin
  if p_link_method not in (
    'explicit_account_link',
    'recovery_claim'
  ) then
    return;
  end if;

  if p_user_id is null
    or p_token_hash_hex !~ '^[0-9a-f]{64}$'
  then
    return;
  end if;

  select wallets.id
    into v_wallet_id
    from private.comun_participation_wallets as wallets
    where wallets.token_hash = decode(p_token_hash_hex, 'hex')
      and wallets.status = 'active';

  if v_wallet_id is null then
    return;
  end if;

  insert into private.comun_participation_wallet_account_links as account_links (
    wallet_id,
    user_id,
    link_method
  )
  values (
    v_wallet_id,
    p_user_id,
    p_link_method
  )
  on conflict on constraint
    comun_participation_wallet_account_links_wallet_id_user_id_key
  do update set
    revoked_at = null,
    link_method = excluded.link_method;

  insert into private.comun_participation_wallet_events (
    wallet_id,
    event_type,
    result_code
  )
  values (
    v_wallet_id,
    'item_updated',
    'WALLET_ACCOUNT_LINKED'
  );

  return query
  select v_wallet_id, true;
end;
$$;

revoke all on function public.comun_participation_wallet_link_account(text,uuid,text)
from public, anon, authenticated;

grant execute on function public.comun_participation_wallet_link_account(text,uuid,text)
to service_role;

commit;
