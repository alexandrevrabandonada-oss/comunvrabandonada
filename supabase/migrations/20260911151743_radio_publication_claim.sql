create or replace function public.comun_publish_radio_episode(
  p_episode_id uuid,
  p_expected_updated_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_episode_status text;
  v_episode_updated_at timestamptz;
  v_item_status text;
  v_item_visibility text;
  v_now timestamptz := clock_timestamp();
begin
  select status, visibility into v_item_status, v_item_visibility
  from public.comun_archive_items where id=p_episode_id for update;
  if not found then return 'conflict'; end if;

  select publication_status, updated_at into v_episode_status, v_episode_updated_at
  from public.comun_radio_episodes where archive_item_id=p_episode_id for update;
  if not found then return 'conflict'; end if;

  if v_episode_status='published' and v_item_status='published' and v_item_visibility='public' then
    return 'already_published';
  end if;
  if v_episode_status<>'editorial_review'
     or v_episode_updated_at<>p_expected_updated_at
     or v_item_status in ('archived','withdrawn') then
    return 'conflict';
  end if;

  update public.comun_radio_episodes
  set publication_status='published', published_at=v_now,
      transcript_status='published', updated_at=v_now
  where archive_item_id=p_episode_id;
  update public.comun_archive_items
  set status='published', visibility='public', published_at=v_now
  where id=p_episode_id;
  return 'published';
end $$;

revoke all on function public.comun_publish_radio_episode(uuid,timestamptz)
  from public,anon,authenticated;
grant execute on function public.comun_publish_radio_episode(uuid,timestamptz)
  to service_role;
