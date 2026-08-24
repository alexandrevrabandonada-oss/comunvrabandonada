-- A5-A2: atomic, source-owned private-root materialization for artwork submissions.
-- The envelope remains the provenance authority; no legacy row is backfilled.
create or replace function public.comun_guard_artwork_submission_private_root_provenance_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE'
    and old.archive_item_id is not null
    and new.archive_item_id is distinct from old.archive_item_id then
    raise exception 'artwork submission private-root provenance is immutable'
      using errcode = '23514';
  end if;

  if new.archive_item_id is null then
    return new;
  end if;

  if not exists (
    select 1
      from public.comun_archive_items item
      join public.comun_archive_artworks artwork
        on artwork.archive_item_id = item.id
      where item.id = new.archive_item_id
        and item.item_type = 'territorial_artwork'
        and item.status = 'draft'
        and item.visibility = 'private'
  ) then
    raise exception 'artwork submission requires a territorial-artwork private root'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger comun_artwork_submissions_private_root_guard
before insert or update of archive_item_id
on public.comun_archive_artwork_submissions
for each row execute function public.comun_guard_artwork_submission_private_root_provenance_v1();

create or replace function public.comun_link_artwork_submission_private_root_v1(
  p_submission_id uuid,
  p_private_root_archive_item_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_submission public.comun_archive_artwork_submissions%rowtype;
begin
  if p_private_root_archive_item_id is null then
    raise exception 'artwork private root is required' using errcode = '22023';
  end if;
  select * into v_submission
    from public.comun_archive_artwork_submissions
    where id = p_submission_id
    for update;
  if not found then
    raise exception 'artwork submission not found' using errcode = 'P0002';
  end if;
  if v_submission.status in ('rejected', 'published', 'withdrawn', 'archived') then
    raise exception 'artwork submission cannot be linked from its current status'
      using errcode = '23514';
  end if;
  if v_submission.archive_item_id is not null then
    if v_submission.archive_item_id = p_private_root_archive_item_id then
      return v_submission.archive_item_id;
    end if;
    raise exception 'artwork submission already has immutable private-root provenance'
      using errcode = '23514';
  end if;
  update public.comun_archive_artwork_submissions
    set archive_item_id = p_private_root_archive_item_id,
        updated_at = now()
    where id = v_submission.id;
  return p_private_root_archive_item_id;
end;
$$;

create or replace function public.comun_materialize_artwork_submission_private_root_v1(
  p_submission_id uuid,
  p_title text,
  p_slug text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_submission public.comun_archive_artwork_submissions%rowtype;
  v_item_id uuid;
begin
  if btrim(coalesce(p_title, '')) = '' or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'artwork private root requires title and canonical slug'
      using errcode = '22023';
  end if;
  select * into v_submission
    from public.comun_archive_artwork_submissions
    where id = p_submission_id
    for update;
  if not found then
    raise exception 'artwork submission not found' using errcode = 'P0002';
  end if;
  if v_submission.status in ('rejected', 'published', 'withdrawn', 'archived') then
    raise exception 'artwork submission cannot be materialized from its current status'
      using errcode = '23514';
  end if;
  if v_submission.archive_item_id is not null then
    return v_submission.archive_item_id;
  end if;
  if v_submission.submission_kind not in ('own_work', 'collective_work', 'authorized_submission', 'unknown_authorship') then
    raise exception 'artwork submission kind requires reconciliation with an existing work'
      using errcode = '23514';
  end if;

  insert into public.comun_archive_items(
    slug, item_type, title, rights_status, status, visibility, editorial_notes
  ) values (
    p_slug, 'territorial_artwork', p_title, 'unknown', 'draft', 'private',
    'Raiz privada materializada de contribuição de Arte; autoria, direitos, safety, assets e publicação permanecem separados.'
  ) returning id into v_item_id;
  insert into public.comun_archive_artworks(
    archive_item_id, artwork_type, title_public, description_public, context_public, territory_id, publication_status
  ) values (
    v_item_id, v_submission.artwork_type, p_title, null, v_submission.context_suggestion,
    v_submission.territory_id, 'draft'
  );
  return public.comun_link_artwork_submission_private_root_v1(v_submission.id, v_item_id);
end;
$$;

revoke all on function public.comun_link_artwork_submission_private_root_v1(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.comun_materialize_artwork_submission_private_root_v1(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.comun_link_artwork_submission_private_root_v1(uuid, uuid)
  to service_role;
grant execute on function public.comun_materialize_artwork_submission_private_root_v1(uuid, text, text)
  to service_role;
