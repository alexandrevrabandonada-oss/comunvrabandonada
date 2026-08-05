begin;

-- Forward-only repair for the R2A attachment allocator. The original candidate
-- remains byte-for-byte immutable; this release only replaces the function
-- body and reasserts its server-side privilege boundary.
create or replace function public.comun_relata_begin_attachment(
  p_protocol text,
  p_receipt_secret text,
  p_attachment_id uuid,
  p_declared_mime_type text,
  p_declared_size_bucket text
)
returns table(
  attachment_id uuid,
  label_index smallint,
  attachment_state text
)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_context record;
  v_label_index smallint;
begin
  select *
    into v_context
    from private.comun_relata_authorized_context(
      p_protocol,
      p_receipt_secret
    );

  if not found
    or p_declared_mime_type not in (
      'image/jpeg',
      'image/png',
      'image/webp'
    )
  then
    return;
  end if;

  perform 1
    from private.comun_relata_reports as r
    where r.id = v_context.report_id
    for update;

  select (coalesce(max(a.label_index), 0) + 1)::smallint
    into v_label_index
    from private.comun_relata_attachments as a
    where a.report_id = v_context.report_id;

  if v_label_index > 3 then
    raise exception using
      errcode = '23514',
      message = 'COMUN_RELATA_ATTACHMENT_LIMIT';
  end if;

  insert into private.comun_relata_attachments (
    id,
    report_id,
    label_index,
    object_key,
    derivative_object_key,
    declared_mime_type,
    declared_size_bucket
  )
  values (
    p_attachment_id,
    v_context.report_id,
    v_label_index,
    'quarantine/' || p_attachment_id::text || '.bin',
    'sealed/' || p_attachment_id::text || '.webp',
    p_declared_mime_type,
    p_declared_size_bucket
  )
  on conflict (id) do nothing;

  return query
  select
    p_attachment_id,
    v_label_index,
    'quarantine'::text;
end;
$$;

revoke all on function public.comun_relata_begin_attachment(
  text,
  text,
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.comun_relata_begin_attachment(
  text,
  text,
  uuid,
  text,
  text
) to service_role;

commit;
