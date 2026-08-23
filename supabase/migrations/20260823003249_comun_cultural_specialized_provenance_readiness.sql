
-- A5-A1: one specialized contribution may establish one immutable private-root
-- provenance link. Existing envelopes deliberately remain unlinked.
alter table public.comun_archive_oral_history_suggestions
  add column private_root_archive_item_id uuid
    references public.comun_archive_items(id) on delete restrict;

alter table public.comun_radio_contributions
  add column private_root_kind text,
  add column private_root_archive_item_id uuid
    references public.comun_archive_items(id) on delete restrict,
  add constraint comun_radio_contributions_private_root_pair_check
    check (
      (private_root_kind is null and private_root_archive_item_id is null)
      or (
        private_root_kind in ('program', 'episode')
        and private_root_archive_item_id is not null
      )
    );

create index comun_oral_suggestions_private_root_idx
  on public.comun_archive_oral_history_suggestions(private_root_archive_item_id)
  where private_root_archive_item_id is not null;

create index comun_radio_contributions_private_root_idx
  on public.comun_radio_contributions(private_root_kind, private_root_archive_item_id)
  where private_root_archive_item_id is not null;

create or replace function public.comun_guard_specialized_private_root_provenance_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_item_type text;
begin
  if tg_table_name = 'comun_archive_oral_history_suggestions' then
    if tg_op = 'UPDATE'
      and old.private_root_archive_item_id is not null
      and new.private_root_archive_item_id is distinct from old.private_root_archive_item_id then
      raise exception 'oral-history private-root provenance is immutable'
        using errcode = '23514';
    end if;

    if new.private_root_archive_item_id is null then
      return new;
    end if;

    select item.item_type into v_item_type
      from public.comun_archive_items item
      join public.comun_archive_oral_histories history
        on history.archive_item_id = item.id
      where item.id = new.private_root_archive_item_id;

    if v_item_type is distinct from 'oral_history' then
      raise exception 'oral-history suggestion requires an oral-history private root'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'comun_radio_contributions' then
    if tg_op = 'UPDATE'
      and (
        old.private_root_kind is not null
        or old.private_root_archive_item_id is not null
      )
      and (
        new.private_root_kind is distinct from old.private_root_kind
        or new.private_root_archive_item_id is distinct from old.private_root_archive_item_id
      ) then
      raise exception 'radio private-root provenance is immutable'
        using errcode = '23514';
    end if;

    if new.private_root_kind is null and new.private_root_archive_item_id is null then
      return new;
    end if;

    select item.item_type into v_item_type
      from public.comun_archive_items item
      where item.id = new.private_root_archive_item_id;

    if (new.private_root_kind = 'program' and v_item_type = 'community_radio_program'
        and exists (
          select 1 from public.comun_radio_programs program
          where program.archive_item_id = new.private_root_archive_item_id
        ))
      or (new.private_root_kind = 'episode' and v_item_type = 'community_radio_episode'
        and exists (
          select 1 from public.comun_radio_episodes episode
          where episode.archive_item_id = new.private_root_archive_item_id
        )) then
      return new;
    end if;

    raise exception 'radio contribution private-root kind does not match its target'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger comun_oral_suggestions_private_root_guard
before insert or update of private_root_archive_item_id
on public.comun_archive_oral_history_suggestions
for each row execute function public.comun_guard_specialized_private_root_provenance_v1();

create trigger comun_radio_contributions_private_root_guard
before insert or update of private_root_kind, private_root_archive_item_id
on public.comun_radio_contributions
for each row execute function public.comun_guard_specialized_private_root_provenance_v1();

create or replace function public.comun_link_oral_history_suggestion_private_root_v1(
  p_suggestion_id uuid,
  p_private_root_archive_item_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_suggestion public.comun_archive_oral_history_suggestions%rowtype;
begin
  select * into v_suggestion
    from public.comun_archive_oral_history_suggestions
    where id = p_suggestion_id
    for update;

  if not found then
    raise exception 'oral-history suggestion not found' using errcode = 'P0002';
  end if;
  if v_suggestion.status in ('rejected', 'archived') then
    raise exception 'oral-history suggestion cannot be materialized from its current status'
      using errcode = '23514';
  end if;
  if v_suggestion.private_root_archive_item_id is not null then
    if v_suggestion.private_root_archive_item_id = p_private_root_archive_item_id then
      return v_suggestion.private_root_archive_item_id;
    end if;
    raise exception 'oral-history suggestion already has immutable private-root provenance'
      using errcode = '23514';
  end if;

  update public.comun_archive_oral_history_suggestions
    set private_root_archive_item_id = p_private_root_archive_item_id,
        updated_at = now()
    where id = v_suggestion.id;
  return p_private_root_archive_item_id;
end;
$$;

create or replace function public.comun_materialize_oral_history_suggestion_private_root_v1(
  p_suggestion_id uuid,
  p_title text,
  p_slug text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_suggestion public.comun_archive_oral_history_suggestions%rowtype;
  v_item_id uuid;
begin
  if btrim(coalesce(p_title, '')) = '' or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'oral-history private root requires title and canonical slug'
      using errcode = '22023';
  end if;

  select * into v_suggestion
    from public.comun_archive_oral_history_suggestions
    where id = p_suggestion_id
    for update;

  if not found then
    raise exception 'oral-history suggestion not found' using errcode = 'P0002';
  end if;
  if v_suggestion.status in ('rejected', 'archived') then
    raise exception 'oral-history suggestion cannot be materialized from its current status'
      using errcode = '23514';
  end if;
  if v_suggestion.private_root_archive_item_id is not null then
    return v_suggestion.private_root_archive_item_id;
  end if;

  insert into public.comun_archive_items(
    slug, item_type, title, city, neighborhood, source_name, rights_status, status, visibility, editorial_notes
  ) values (
    p_slug, 'oral_history', p_title, v_suggestion.city, v_suggestion.neighborhood,
    'Sugestão de História Oral', 'unknown', 'draft', 'private',
    'Raiz privada materializada de sugestão especializada; consentimentos e publicação permanecem separados.'
  ) returning id into v_item_id;

  insert into public.comun_archive_oral_histories(
    archive_item_id, interview_title, internal_summary, publication_status
  ) values (
    v_item_id, p_title, v_suggestion.story_summary, 'consent_pending'
  );

  return public.comun_link_oral_history_suggestion_private_root_v1(v_suggestion.id, v_item_id);
end;
$$;

create or replace function public.comun_link_radio_contribution_private_root_v1(
  p_contribution_id uuid,
  p_private_root_kind text,
  p_private_root_archive_item_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_contribution public.comun_radio_contributions%rowtype;
begin
  if p_private_root_kind not in ('program', 'episode') or p_private_root_archive_item_id is null then
    raise exception 'radio private-root kind and target are required'
      using errcode = '22023';
  end if;

  select * into v_contribution
    from public.comun_radio_contributions
    where id = p_contribution_id
    for update;

  if not found then
    raise exception 'radio contribution not found' using errcode = 'P0002';
  end if;
  if v_contribution.status in ('rejected', 'published', 'withdrawn', 'archived') then
    raise exception 'radio contribution cannot be linked from its current status'
      using errcode = '23514';
  end if;
  if v_contribution.private_root_archive_item_id is not null then
    if v_contribution.private_root_kind = p_private_root_kind
      and v_contribution.private_root_archive_item_id = p_private_root_archive_item_id then
      return v_contribution.private_root_archive_item_id;
    end if;
    raise exception 'radio contribution already has immutable private-root provenance'
      using errcode = '23514';
  end if;

  if (v_contribution.contribution_type = 'program_proposal' and p_private_root_kind <> 'program')
    or (v_contribution.contribution_type in ('community_audio', 'authorized_testimony') and p_private_root_kind <> 'episode')
    or v_contribution.contribution_type in ('pauta_proposal', 'own_music', 'agenda') then
    raise exception 'radio contribution type requires an explicit specialized editorial route'
      using errcode = '23514';
  end if;

  update public.comun_radio_contributions
    set private_root_kind = p_private_root_kind,
        private_root_archive_item_id = p_private_root_archive_item_id,
        updated_at = now()
    where id = v_contribution.id;
  return p_private_root_archive_item_id;
end;
$$;

create or replace function public.comun_materialize_radio_contribution_private_root_v1(
  p_contribution_id uuid,
  p_private_root_kind text,
  p_title text,
  p_slug text,
  p_program_item_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_contribution public.comun_radio_contributions%rowtype;
  v_item_id uuid;
begin
  if btrim(coalesce(p_title, '')) = '' or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'radio private root requires title and canonical slug'
      using errcode = '22023';
  end if;

  select * into v_contribution
    from public.comun_radio_contributions
    where id = p_contribution_id
    for update;

  if not found then
    raise exception 'radio contribution not found' using errcode = 'P0002';
  end if;
  if v_contribution.status in ('rejected', 'published', 'withdrawn', 'archived') then
    raise exception 'radio contribution cannot be materialized from its current status'
      using errcode = '23514';
  end if;
  if v_contribution.private_root_archive_item_id is not null then
    if v_contribution.private_root_kind = p_private_root_kind then
      return v_contribution.private_root_archive_item_id;
    end if;
    raise exception 'radio contribution already has immutable private-root provenance'
      using errcode = '23514';
  end if;

  if v_contribution.contribution_type = 'program_proposal' and p_private_root_kind = 'program' then
    insert into public.comun_archive_items(slug, item_type, title, rights_status, status, visibility, editorial_notes)
      values (p_slug, 'community_radio_program', p_title, 'unknown', 'draft', 'private',
        'Raiz privada materializada de proposta de programa; nenhuma grade, episódio ou publicação foi criada.')
      returning id into v_item_id;
    insert into public.comun_radio_programs(archive_item_id, title_public, slug_public, description_public, format_type)
      values (v_item_id, p_title, p_slug, v_contribution.context_suggestion, 'mixed');
  elsif v_contribution.contribution_type in ('community_audio', 'authorized_testimony')
    and p_private_root_kind = 'episode' then
    if p_program_item_id is null
      or not exists (
        select 1 from public.comun_radio_programs program
        join public.comun_archive_items item on item.id = program.archive_item_id
        where program.archive_item_id = p_program_item_id
          and item.item_type = 'community_radio_program'
      ) then
      raise exception 'radio episode private root requires an explicit canonical program'
        using errcode = '23514';
    end if;
    insert into public.comun_archive_items(slug, item_type, title, rights_status, status, visibility, editorial_notes)
      values (p_slug, 'community_radio_episode', p_title, 'unknown', 'draft', 'private',
        'Raiz privada materializada de contribuição de rádio; voz, música, safety e publicação permanecem separados.')
      returning id into v_item_id;
    insert into public.comun_radio_episodes(
      archive_item_id, program_item_id, title_public, slug_public, summary_public, publication_status, transcript_status
    ) values (
      v_item_id, p_program_item_id, p_title, p_slug, v_contribution.context_suggestion, 'draft', 'unavailable'
    );
  else
    raise exception 'radio contribution type and explicit destination do not permit private-root materialization'
      using errcode = '23514';
  end if;

  return public.comun_link_radio_contribution_private_root_v1(
    v_contribution.id, p_private_root_kind, v_item_id
  );
end;
$$;

revoke all on function public.comun_link_oral_history_suggestion_private_root_v1(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.comun_materialize_oral_history_suggestion_private_root_v1(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.comun_link_radio_contribution_private_root_v1(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.comun_materialize_radio_contribution_private_root_v1(uuid, text, text, text, uuid)
  from public, anon, authenticated;

grant execute on function public.comun_link_oral_history_suggestion_private_root_v1(uuid, uuid)
  to service_role;
grant execute on function public.comun_materialize_oral_history_suggestion_private_root_v1(uuid, text, text)
  to service_role;
grant execute on function public.comun_link_radio_contribution_private_root_v1(uuid, text, uuid)
  to service_role;
grant execute on function public.comun_materialize_radio_contribution_private_root_v1(uuid, text, text, text, uuid)
  to service_role;
