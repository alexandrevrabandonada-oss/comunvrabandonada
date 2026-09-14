create schema if not exists private;

create or replace function private.comun_radio_editorial_snapshot(p_episode_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, extensions
as $$
  select jsonb_build_object(
    'episode', jsonb_build_object(
      'archive_item_id', e.archive_item_id,
      'program_item_id', e.program_item_id,
      'title_public', e.title_public,
      'summary_public', e.summary_public,
      'description_public', e.description_public,
      'duration_seconds', e.duration_seconds,
      'territory_id', e.territory_id,
      'pauta_id', e.pauta_id,
      'transcript_status', e.transcript_status
    ),
    'archive_item', jsonb_build_object('id', i.id, 'item_type', i.item_type),
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'asset_role', a.asset_role,
        'bucket_scope', a.bucket_scope, 'review_status', a.review_status,
        'public_url', a.public_url
      ) order by a.id)
      from public.comun_archive_assets a
      where a.archive_item_id = p_episode_id
        and a.asset_role = 'radio_public_episode'
    ), '[]'::jsonb),
    'credits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'agent_id', c.agent_id, 'credit_role', c.credit_role,
        'public_credit', c.public_credit, 'position', c.position,
        'public_visibility', c.public_visibility
      ) order by c.id)
      from public.comun_radio_credits c where c.episode_item_id = p_episode_id
    ), '[]'::jsonb),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'agent_id', c.agent_id, 'consent_status', c.consent_status,
        'allow_private_preservation', c.allow_private_preservation,
        'allow_comun_audio', c.allow_comun_audio, 'allow_transcript', c.allow_transcript,
        'allow_social_clips', c.allow_social_clips, 'allow_print_quotes', c.allow_print_quotes,
        'allow_campaign_use', c.allow_campaign_use, 'allow_educational_use', c.allow_educational_use,
        'allow_name_publication', c.allow_name_publication, 'public_name_override', c.public_name_override,
        'valid_from', c.valid_from, 'valid_until', c.valid_until,
        'withdrawal_requested_at', c.withdrawal_requested_at,
        'withdrawal_completed_at', c.withdrawal_completed_at,
        'evidence_asset_id', c.evidence_asset_id, 'reviewed_at', c.reviewed_at
      ) order by c.id)
      from public.comun_radio_voice_consents c where c.episode_item_id = p_episode_id
    ), '[]'::jsonb),
    'music', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'recording_agent_id', m.recording_agent_id,
        'composition_agent_id', m.composition_agent_id, 'title_public', m.title_public,
        'performer_public', m.performer_public, 'composer_public', m.composer_public,
        'usage_type', m.usage_type, 'start_seconds', m.start_seconds, 'end_seconds', m.end_seconds,
        'rights_status', m.rights_status, 'allow_streaming', m.allow_streaming,
        'allow_download', m.allow_download, 'allow_social_clip', m.allow_social_clip,
        'allow_campaign_use', m.allow_campaign_use, 'license_public', m.license_public,
        'evidence_asset_id', m.evidence_asset_id
      ) order by m.id)
      from public.comun_radio_music_uses m where m.episode_item_id = p_episode_id
    ), '[]'::jsonb),
    'safety', coalesce((
      select jsonb_build_object(
        'minor_involved_private', s.minor_involved_private,
        'guardian_authorization_confirmed', s.guardian_authorization_confirmed,
        'sensitive_location_private', s.sensitive_location_private,
        'identifiable_people_private', s.identifiable_people_private,
        'reinforced_review_status', s.reinforced_review_status,
        'reviewed_at', s.reviewed_at
      ) from public.comun_radio_safety_reviews s where s.episode_item_id = p_episode_id
    ), 'null'::jsonb),
    'transcripts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'version_number', t.version_number, 'transcript_type', t.transcript_type,
        'content_sha256', encode(extensions.digest(convert_to(t.content, 'utf8'), 'sha256'), 'hex'),
        'status', t.status, 'contains_redactions', t.contains_redactions,
        'reviewed_at', t.reviewed_at
      ) order by t.version_number, t.id)
      from public.comun_radio_transcript_versions t where t.episode_item_id = p_episode_id
    ), '[]'::jsonb)
  )
  from public.comun_radio_episodes e
  join public.comun_archive_items i on i.id = e.archive_item_id
  where e.archive_item_id = p_episode_id
$$;

create or replace function private.comun_radio_editorial_identity(p_episode_id uuid)
returns text language sql stable security invoker
set search_path = pg_catalog, public, private, extensions
as $$
  select encode(extensions.digest(convert_to(private.comun_radio_editorial_snapshot(p_episode_id)::text, 'utf8'), 'sha256'), 'hex')
$$;

create or replace function private.comun_radio_publication_blockers(p_episode_id uuid)
returns text[] language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select array_remove(array[
    case when nullif(btrim(e.title_public), '') is null then 'title' end,
    case when nullif(btrim(e.summary_public), '') is null then 'summary' end,
    case when e.program_item_id is null then 'program' end,
    case when e.duration_seconds is null or e.duration_seconds not between 1 and 7200 then 'duration' end,
    case when not exists (
      select 1 from public.comun_archive_assets a
      where a.archive_item_id=p_episode_id and a.asset_role='radio_public_episode'
        and a.bucket_scope='public_safe' and a.review_status='approved'
        and nullif(btrim(a.public_url), '') is not null
    ) then 'public_audio' end,
    case when not exists (select 1 from public.comun_radio_credits c where c.episode_item_id=p_episode_id) then 'credits' end,
    case when not exists (select 1 from public.comun_radio_voice_consents c where c.episode_item_id=p_episode_id)
      or exists (select 1 from public.comun_radio_voice_consents c where c.episode_item_id=p_episode_id and (c.consent_status<>'approved' or not c.allow_comun_audio))
      then 'voice_consent' end,
    case when exists (select 1 from public.comun_radio_music_uses m where m.episode_item_id=p_episode_id and (m.rights_status not in ('approved','public_domain_verified') or not m.allow_streaming)) then 'music_rights' end,
    case when exists (select 1 from public.comun_radio_safety_reviews s where s.episode_item_id=p_episode_id and s.minor_involved_private and s.reinforced_review_status<>'approved') then 'minor_safety' end,
    case when e.pauta_id is null and e.territory_id is null and nullif(btrim(e.description_public), '') is null then 'context' end,
    case when not exists (select 1 from public.comun_radio_transcript_versions t where t.episode_item_id=p_episode_id and t.status='published') then 'transcript' end
  ], null)
  from public.comun_radio_episodes e where e.archive_item_id=p_episode_id
$$;

create or replace function private.comun_lock_radio_editorial_composition()
returns void language plpgsql volatile security invoker
set search_path = pg_catalog, public
as $$ begin
  lock table public.comun_archive_items in share row exclusive mode;
  lock table public.comun_radio_episodes in share row exclusive mode;
  lock table public.comun_archive_assets in share row exclusive mode;
  lock table public.comun_radio_credits in share row exclusive mode;
  lock table public.comun_radio_voice_consents in share row exclusive mode;
  lock table public.comun_radio_music_uses in share row exclusive mode;
  lock table public.comun_radio_safety_reviews in share row exclusive mode;
  lock table public.comun_radio_transcript_versions in share row exclusive mode;
  lock table public.comun_radio_editorial_versions in share row exclusive mode;
end $$;

create or replace function public.comun_prepare_radio_publication_review(
  p_episode_id uuid, p_admin_id uuid
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare v_admin public.comun_admin_users%rowtype; v_identity text; v_blockers text[];
begin
  select * into v_admin from public.comun_admin_users where id=p_admin_id and is_active for share;
  if not found or v_admin.role not in ('admin','editor') then return jsonb_build_object('outcome','denied'); end if;
  perform private.comun_lock_radio_editorial_composition();
  v_identity := private.comun_radio_editorial_identity(p_episode_id);
  if v_identity is null then return jsonb_build_object('outcome','conflict'); end if;
  v_blockers := private.comun_radio_publication_blockers(p_episode_id);
  return jsonb_build_object('outcome',case when cardinality(v_blockers)=0 then 'ready' else 'blocked' end,'identity',v_identity,'blockers',to_jsonb(v_blockers));
end $$;

create or replace function public.comun_commit_radio_publication(
  p_episode_id uuid, p_expected_identity text, p_admin_id uuid
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_admin public.comun_admin_users%rowtype; v_identity text; v_blockers text[];
  v_episode_status text; v_item_status text; v_item_visibility text;
  v_now timestamptz := clock_timestamp(); v_version bigint; v_snapshot jsonb;
begin
  select * into v_admin from public.comun_admin_users where id=p_admin_id and is_active for share;
  if not found or v_admin.role not in ('admin','editor') then return jsonb_build_object('outcome','denied'); end if;
  perform private.comun_lock_radio_editorial_composition();
  select e.publication_status,i.status,i.visibility into v_episode_status,v_item_status,v_item_visibility
  from public.comun_radio_episodes e join public.comun_archive_items i on i.id=e.archive_item_id
  where e.archive_item_id=p_episode_id;
  if not found then return jsonb_build_object('outcome','conflict'); end if;
  v_snapshot := private.comun_radio_editorial_snapshot(p_episode_id);
  v_identity := encode(extensions.digest(convert_to(v_snapshot::text,'utf8'),'sha256'),'hex');
  v_blockers := private.comun_radio_publication_blockers(p_episode_id);
  if p_expected_identity is null or p_expected_identity<>v_identity then
    insert into public.comun_admin_audit_log(admin_user_id,admin_email,action,target_type,target_id,metadata)
    values(v_admin.id,v_admin.email,'radio_episode_publish_stale','community_radio_episode',p_episode_id,
      jsonb_build_object('expected_identity',p_expected_identity,'current_identity',v_identity,'blockers',to_jsonb(v_blockers),'outcome','stale'));
    return jsonb_build_object('outcome','conflict','identity',v_identity,'blockers',to_jsonb(v_blockers));
  end if;
  if cardinality(v_blockers)>0 or v_episode_status in ('withdrawn','archived') or v_item_status in ('archived','withdrawn') then
    insert into public.comun_admin_audit_log(admin_user_id,admin_email,action,target_type,target_id,metadata)
    values(v_admin.id,v_admin.email,'radio_episode_publish_blocked','community_radio_episode',p_episode_id,
      jsonb_build_object('identity',v_identity,'blockers',to_jsonb(v_blockers),'outcome','blocked'));
    return jsonb_build_object('outcome','blocked','identity',v_identity,'blockers',to_jsonb(v_blockers));
  end if;
  if v_episode_status='published' and v_item_status='published' and v_item_visibility='public' then
    insert into public.comun_admin_audit_log(admin_user_id,admin_email,action,target_type,target_id,metadata)
    values(v_admin.id,v_admin.email,'radio_episode_publish_replayed','community_radio_episode',p_episode_id,
      jsonb_build_object('identity',v_identity,'outcome','idempotent_replay'));
    return jsonb_build_object('outcome','already_published','identity',v_identity);
  end if;
  if v_episode_status<>'editorial_review' then return jsonb_build_object('outcome','conflict','identity',v_identity); end if;
  select coalesce(max(version_number),0)+1 into v_version from public.comun_radio_editorial_versions where episode_item_id=p_episode_id;
  update public.comun_radio_episodes set publication_status='published',published_at=v_now,transcript_status='published',updated_at=v_now where archive_item_id=p_episode_id;
  update public.comun_archive_items set status='published',visibility='public',published_at=v_now where id=p_episode_id;
  insert into public.comun_radio_editorial_versions(episode_item_id,version_number,sanitized_snapshot,change_type,created_by)
  values(p_episode_id,v_version,jsonb_build_object(
    'editorial_identity',v_identity,
    'asset_count',jsonb_array_length(v_snapshot->'assets'),
    'credit_count',jsonb_array_length(v_snapshot->'credits'),
    'consent_count',jsonb_array_length(v_snapshot->'consents'),
    'music_use_count',jsonb_array_length(v_snapshot->'music'),
    'transcript_count',jsonb_array_length(v_snapshot->'transcripts'),
    'safety_review_present',(v_snapshot->'safety') <> 'null'::jsonb
  ),'publication',v_admin.id);
  insert into public.comun_admin_audit_log(admin_user_id,admin_email,action,target_type,target_id,metadata)
  values(v_admin.id,v_admin.email,'radio_episode_published','community_radio_episode',p_episode_id,
    jsonb_build_object('identity',v_identity,'editorial_version',v_version,'outcome','published'));
  return jsonb_build_object('outcome','published','identity',v_identity,'editorial_version',v_version);
end $$;

-- The timestamp-only entry point cannot represent the reviewed composition.
-- Keep its signature for schema compatibility, but close it as a publication path.
create or replace function public.comun_publish_radio_episode(p_episode_id uuid,p_expected_updated_at timestamptz)
returns text language sql security definer set search_path=pg_catalog,public
as $$ select 'conflict'::text $$;

revoke all on function private.comun_radio_editorial_snapshot(uuid) from public,anon,authenticated;
revoke all on function private.comun_radio_editorial_identity(uuid) from public,anon,authenticated;
revoke all on function private.comun_radio_publication_blockers(uuid) from public,anon,authenticated;
revoke all on function private.comun_lock_radio_editorial_composition() from public,anon,authenticated;
revoke all on function public.comun_prepare_radio_publication_review(uuid,uuid) from public,anon,authenticated;
revoke all on function public.comun_commit_radio_publication(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.comun_prepare_radio_publication_review(uuid,uuid) to service_role;
grant execute on function public.comun_commit_radio_publication(uuid,text,uuid) to service_role;
