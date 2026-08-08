begin;

create or replace function public.comun_relata_add_location(
  p_protocol text,
  p_receipt_secret text,
  p_origin text,
  p_accuracy_class text,
  p_captured_at timestamptz,
  p_ciphertext bytea,
  p_nonce bytea,
  p_auth_tag bytea,
  p_key_version text,
  p_approximate_region text,
  p_approximation_level text,
  p_geographic_risk text
)
returns table(location_state text, grouping_allowed boolean)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_context record;
begin
  select *
    into v_context
    from private.comun_relata_authorized_context(p_protocol, p_receipt_secret);

  if not found then
    return;
  end if;

  insert into private.comun_relata_private_locations (
    report_id,
    precision,
    encrypted_value,
    origin,
    accuracy_class,
    captured_at,
    nonce,
    auth_tag,
    key_version,
    approximate_region,
    approximation_level,
    geographic_risk
  )
  values (
    v_context.report_id,
    p_origin,
    p_ciphertext,
    p_origin,
    p_accuracy_class,
    p_captured_at,
    p_nonce,
    p_auth_tag,
    p_key_version,
    left(p_approximate_region, 80),
    p_approximation_level,
    p_geographic_risk
  )
  on conflict (report_id) do update set
    precision = excluded.precision,
    encrypted_value = excluded.encrypted_value,
    origin = excluded.origin,
    accuracy_class = excluded.accuracy_class,
    captured_at = excluded.captured_at,
    nonce = excluded.nonce,
    auth_tag = excluded.auth_tag,
    key_version = excluded.key_version,
    evidence_state = 'added_private',
    approximate_region = excluded.approximate_region,
    approximation_level = excluded.approximation_level,
    geographic_risk = excluded.geographic_risk,
    review_required = true,
    withdrawn_at = null;

  return query select 'added_private'::text, true;
end;
$$;

revoke all on function public.comun_relata_add_location(
  text,
  text,
  text,
  text,
  timestamptz,
  bytea,
  bytea,
  bytea,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.comun_relata_add_location(
  text,
  text,
  text,
  text,
  timestamptz,
  bytea,
  bytea,
  bytea,
  text,
  text,
  text,
  text
) to service_role;

commit;
