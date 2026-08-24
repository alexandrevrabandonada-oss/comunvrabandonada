-- A5-A2 disposable proof. Run only against an ephemeral local Supabase database.
begin;

create temporary table a5a2_baseline(table_name text primary key, row_count bigint not null);
do $$
declare v_table text; v_count bigint;
begin
  foreach v_table in array array['comun_archive_assets','comun_search_documents','comun_archive_collections','comun_archive_collection_items'] loop
    execute format('select count(*) from public.%I',v_table) into v_count;
    insert into a5a2_baseline(table_name,row_count) values(v_table,v_count);
  end loop;
end $$;

do $$
declare
  v_submission uuid;
  v_root uuid;
  v_other_root uuid;
  v_wrong uuid;
  v_legacy_root uuid;
  v_legacy_submission uuid;
  v_rejected uuid;
begin
  if has_function_privilege('anon', 'public.comun_materialize_artwork_submission_private_root_v1(uuid,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.comun_materialize_artwork_submission_private_root_v1(uuid,text,text)', 'execute')
    or not has_function_privilege('service_role', 'public.comun_materialize_artwork_submission_private_root_v1(uuid,text,text)', 'execute') then
    raise exception 'A5-A2 artwork materializer grants are unsafe';
  end if;

  insert into public.comun_archive_artwork_submissions(
    public_protocol,submission_kind,title_suggestion,artwork_type,context_suggestion,creator_credit_suggestion,status
  ) values ('A5-A2-ART','unknown_authorship','Obra privada sintética','mixed_media','Contexto privado sintético para prova descartável.','Sugestão sem autoria canônica','pending')
    returning id into v_submission;
  v_root := public.comun_materialize_artwork_submission_private_root_v1(v_submission,'Obra privada sintética','obra-privada-sintetica-a5-a2');
  if v_root <> public.comun_materialize_artwork_submission_private_root_v1(v_submission,'Tentativa repetida','tentativa-repetida-a5-a2') then
    raise exception 'A5-A2 replay did not return the first artwork root';
  end if;
  if not exists (
    select 1 from public.comun_archive_artwork_submissions submission
    join public.comun_archive_items item on item.id=submission.archive_item_id
    join public.comun_archive_artworks artwork on artwork.archive_item_id=item.id
    where submission.id=v_submission and item.id=v_root and item.item_type='territorial_artwork'
      and item.status='draft' and item.visibility='private' and item.rights_status='unknown'
      and artwork.publication_status='draft'
  ) then raise exception 'A5-A2 artwork root is not conservative'; end if;

  insert into public.comun_archive_items(slug,item_type,title,rights_status,status,visibility)
    values ('a5-a2-art-other','territorial_artwork','Outra obra','unknown','draft','private') returning id into v_other_root;
  insert into public.comun_archive_artworks(archive_item_id,artwork_type,title_public,publication_status)
    values(v_other_root,'other','Outra obra','draft');
  begin
    perform public.comun_link_artwork_submission_private_root_v1(v_submission,v_other_root);
    raise exception 'A5-A2 conflicting retarget unexpectedly succeeded';
  exception when check_violation then null; end;

  insert into public.comun_archive_items(slug,item_type,title,rights_status,status,visibility)
    values ('a5-a2-wrong','photograph','Alvo errado','unknown','draft','private') returning id into v_wrong;
  insert into public.comun_archive_artwork_submissions(public_protocol,submission_kind,title_suggestion,artwork_type,creator_credit_suggestion,status)
    values ('A5-A2-WRONG','own_work','Alvo errado','other','Sugestão','pending') returning id into v_rejected;
  begin
    perform public.comun_link_artwork_submission_private_root_v1(v_rejected,v_wrong);
    raise exception 'A5-A2 wrong target unexpectedly succeeded';
  exception when check_violation then null; end;
  update public.comun_archive_artwork_submissions set status='rejected' where id=v_rejected;
  begin
    perform public.comun_materialize_artwork_submission_private_root_v1(v_rejected,'Rejeitada','rejeitada-a5-a2');
    raise exception 'A5-A2 rejected source unexpectedly materialized';
  exception when check_violation then null; end;

  insert into public.comun_archive_items(slug,item_type,title,rights_status,status,visibility)
    values ('a5-a2-legacy','territorial_artwork','Legado','unknown','draft','private') returning id into v_legacy_root;
  insert into public.comun_archive_artworks(archive_item_id,artwork_type,title_public,publication_status)
    values(v_legacy_root,'other','Legado','draft');
  insert into public.comun_archive_artwork_submissions(public_protocol,submission_kind,title_suggestion,artwork_type,creator_credit_suggestion,status,archive_item_id)
    values ('A5-A2-LEGACY','own_work','Legado','other','Sugestão','pending',v_legacy_root) returning id into v_legacy_submission;
  if not exists(select 1 from public.comun_archive_artwork_submissions where id=v_legacy_submission and archive_item_id=v_legacy_root) then
    raise exception 'A5-A2 legacy provenance changed';
  end if;
  if exists(select 1 from public.comun_archive_items where id in(v_root,v_other_root,v_legacy_root) and (status='published' or visibility='public')) then
    raise exception 'A5-A2 auto-published artwork';
  end if;
end $$;

do $$
declare v_table text; v_before bigint; v_after bigint;
begin
  foreach v_table in array array['comun_archive_assets','comun_search_documents','comun_archive_collections','comun_archive_collection_items'] loop
    select row_count into v_before from a5a2_baseline where table_name=v_table;
    execute format('select count(*) from public.%I',v_table) into v_after;
    if v_before<>v_after then raise exception 'A5-A2 wrote forbidden projection %',v_table; end if;
  end loop;
end $$;

select 'COMUN_48_5_A5_A2_ARTWORK_PRIVATE_MATERIALIZATION_DISPOSABLE_GREEN' as checkpoint,
       'legacyBackfill=false' as legacy_backfill,
       'autoPublication=false' as auto_publication,
       'searchWrites=0' as search_writes,
       'publicAssetPromotions=0' as public_asset_promotions,
       'collectionWrites=0' as collection_writes;
rollback;
