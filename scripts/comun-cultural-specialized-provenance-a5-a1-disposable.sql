-- A5-A1 disposable proof. Run only against a local Supabase database.
begin;

create temporary table a5a1_baseline(table_name text primary key, row_count bigint not null);

do $$
declare
  v_table text;
  v_count bigint;
begin
  foreach v_table in array array[
    'comun_archive_oral_history_suggestions', 'comun_radio_contributions',
    'comun_archive_items', 'comun_archive_oral_histories', 'comun_radio_programs',
    'comun_radio_episodes', 'comun_archive_assets', 'comun_search_documents',
    'comun_archive_collections', 'comun_archive_collection_items'
  ] loop
    execute format('select count(*) from public.%I', v_table) into v_count;
    insert into a5a1_baseline values (v_table, v_count);
  end loop;

  if has_table_privilege('anon', 'public.comun_archive_oral_history_suggestions', 'select')
    or has_table_privilege('authenticated', 'public.comun_archive_oral_history_suggestions', 'insert')
    or has_table_privilege('anon', 'public.comun_radio_contributions', 'select')
    or has_table_privilege('authenticated', 'public.comun_radio_contributions', 'insert') then
    raise exception 'A5-A1 source envelopes are client-accessible';
  end if;
  if not has_table_privilege('service_role', 'public.comun_archive_oral_history_suggestions', 'update')
    or not has_table_privilege('service_role', 'public.comun_radio_contributions', 'update') then
    raise exception 'A5-A1 service role cannot operate provenance';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.comun_archive_oral_history_suggestions'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'public.comun_radio_contributions'::regclass) then
    raise exception 'A5-A1 source RLS is disabled';
  end if;
end;
$$;

do $$
declare
  v_oral_suggestion uuid;
  v_oral_root uuid;
  v_other_item uuid;
  v_program_contribution uuid;
  v_program_root uuid;
  v_episode_contribution uuid;
  v_episode_root uuid;
  v_legacy_suggestion uuid;
  v_legacy_contribution uuid;
begin
  insert into public.comun_archive_oral_history_suggestions(
    suggested_person_or_theme, story_summary, status, submitter_hash
  ) values (
    'Tema sintético A5-A1', 'Resumo privado sintético para prova local.', 'triage', 'a5-a1-oral'
  ) returning id into v_oral_suggestion;

  v_oral_root := public.comun_materialize_oral_history_suggestion_private_root_v1(
    v_oral_suggestion, 'Entrevista privada sintética A5-A1', 'entrevista-privada-sintetica-a5-a1'
  );
  if v_oral_root <> public.comun_materialize_oral_history_suggestion_private_root_v1(
    v_oral_suggestion, 'Outra tentativa', 'outra-tentativa-a5-a1'
  ) then
    raise exception 'oral-history replay did not return its first root';
  end if;
  if not exists (
    select 1
    from public.comun_archive_oral_history_suggestions suggestion
    join public.comun_archive_items item on item.id = suggestion.private_root_archive_item_id
    join public.comun_archive_oral_histories history on history.archive_item_id = item.id
    where suggestion.id = v_oral_suggestion
      and item.id = v_oral_root
      and item.item_type = 'oral_history'
      and item.status = 'draft'
      and item.visibility = 'private'
      and item.rights_status = 'unknown'
      and history.publication_status = 'consent_pending'
  ) then
    raise exception 'oral-history root is not private and conservative';
  end if;

  insert into public.comun_archive_items(slug, item_type, title, rights_status, status, visibility)
    values ('a5-a1-wrong-target', 'photograph', 'Alvo incorreto', 'unknown', 'draft', 'private')
    returning id into v_other_item;
  begin
    update public.comun_archive_oral_history_suggestions
      set private_root_archive_item_id = v_other_item
      where id = v_oral_suggestion;
    raise exception 'oral retarget unexpectedly succeeded';
  exception when check_violation then
    null;
  end;

  insert into public.comun_radio_contributions(
    public_protocol, contribution_type, title_suggestion, context_suggestion, status
  ) values (
    'A5-A1-PROGRAM', 'program_proposal', 'Programa privado sintético', 'Contexto privado sintético suficiente.', 'pending'
  ) returning id into v_program_contribution;
  v_program_root := public.comun_materialize_radio_contribution_private_root_v1(
    v_program_contribution, 'program', 'Programa privado sintético', 'programa-privado-sintetico-a5-a1'
  );
  if v_program_root <> public.comun_materialize_radio_contribution_private_root_v1(
    v_program_contribution, 'program', 'Tentativa repetida', 'tentativa-repetida-a5-a1'
  ) then
    raise exception 'radio program replay did not return its first root';
  end if;

  insert into public.comun_radio_contributions(
    public_protocol, contribution_type, title_suggestion, context_suggestion, status
  ) values (
    'A5-A1-EPISODE', 'community_audio', 'Áudio privado sintético', 'Contexto de áudio privado sintético.', 'pending'
  ) returning id into v_episode_contribution;
  begin
    perform public.comun_materialize_radio_contribution_private_root_v1(
      v_episode_contribution, 'episode', 'Episódio sem programa', 'episodio-sem-programa-a5-a1'
    );
    raise exception 'episode materialization without a program unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
  v_episode_root := public.comun_materialize_radio_contribution_private_root_v1(
    v_episode_contribution, 'episode', 'Episódio privado sintético', 'episodio-privado-sintetico-a5-a1', v_program_root
  );
  if not exists (
    select 1 from public.comun_radio_contributions contribution
    join public.comun_archive_items item on item.id = contribution.private_root_archive_item_id
    join public.comun_radio_episodes episode on episode.archive_item_id = item.id
    where contribution.id = v_episode_contribution
      and contribution.private_root_kind = 'episode'
      and item.id = v_episode_root
      and item.status = 'draft'
      and item.visibility = 'private'
      and item.rights_status = 'unknown'
      and episode.program_item_id = v_program_root
      and episode.publication_status = 'draft'
  ) then
    raise exception 'radio episode root is not private, typed, and linked to its selected program';
  end if;
  begin
    update public.comun_radio_contributions
      set private_root_kind = 'program', private_root_archive_item_id = v_program_root
      where id = v_episode_contribution;
    raise exception 'radio retarget unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
  begin
    update public.comun_radio_contributions
      set private_root_kind = 'program', private_root_archive_item_id = null
      where id = v_program_contribution;
    raise exception 'partial radio target unexpectedly succeeded';
  exception when check_violation then
    null;
  end;

  insert into public.comun_archive_oral_history_suggestions(
    suggested_person_or_theme, story_summary, status, submitter_hash
  ) values ('Legado A5-A1', 'Permanece sem vínculo.', 'pending', 'a5-a1-legacy')
    returning id into v_legacy_suggestion;
  insert into public.comun_radio_contributions(
    public_protocol, contribution_type, title_suggestion, context_suggestion, status
  ) values ('A5-A1-LEGACY', 'pauta_proposal', 'Legado sem alvo', 'Permanece sem vínculo.', 'pending')
    returning id into v_legacy_contribution;
  if exists (
    select 1 from public.comun_archive_oral_history_suggestions
    where id = v_legacy_suggestion and private_root_archive_item_id is not null
  ) or exists (
    select 1 from public.comun_radio_contributions
    where id = v_legacy_contribution
      and (private_root_kind is not null or private_root_archive_item_id is not null)
  ) then
    raise exception 'A5-A1 inferred a legacy provenance link';
  end if;

  if exists (
    select 1 from public.comun_archive_items
    where id in (v_oral_root, v_program_root, v_episode_root)
      and (status = 'published' or visibility = 'public')
  ) then
    raise exception 'A5-A1 auto-published a private root';
  end if;
end;
$$;

do $$
declare
  v_table text;
  v_before bigint;
  v_after bigint;
begin
  foreach v_table in array array[
    'comun_archive_assets', 'comun_search_documents', 'comun_archive_collections', 'comun_archive_collection_items'
  ] loop
    select row_count into v_before from a5a1_baseline where table_name = v_table;
    execute format('select count(*) from public.%I', v_table) into v_after;
    if v_before <> v_after then
      raise exception 'A5-A1 wrote forbidden projection %', v_table;
    end if;
  end loop;
end;
$$;

select 'COMUN_48_5_A5_A1_SPECIALIZED_PROVENANCE_DISPOSABLE_GREEN' as checkpoint,
       'legacyBackfill=false' as legacy_backfill,
       'autoPublication=false' as auto_publication,
       'searchWrites=0' as search_writes,
       'publicAssetPromotions=0' as public_asset_promotions;

rollback;
