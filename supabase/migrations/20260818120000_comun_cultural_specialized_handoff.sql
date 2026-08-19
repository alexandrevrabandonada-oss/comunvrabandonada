alter table private.comun_cultural_contribution_intakes
-- A3-R1 exact-preview checkpoint: release metadata only; no SQL behavior change.
  drop constraint if exists comun_cultural_contribution_intakes_status_check;

alter table private.comun_cultural_contribution_intakes
  add constraint comun_cultural_contribution_intakes_status_check
  check (status in ('draft','routing','routed','handoff_pending','handed_off','submitted','completed','archived'));

create or replace function public.comun_route_cultural_contribution_intake_v1(
  p_public_protocol text,
  p_route_kind text,
  p_resume_token_hash text default null,
  p_member_user_id uuid default null
) returns table(intake_id uuid, public_protocol text, status text, route_kind text)
language plpgsql security invoker
set search_path = public, private, extensions
as $$
declare v private.comun_cultural_contribution_intakes%rowtype;
begin
  if p_route_kind not in ('photo_or_document','art','oral_history','radio','unknown') then raise exception 'invalid_route'; end if;
  select i.* into v from private.comun_cultural_contribution_intakes i
   where i.public_protocol=p_public_protocol
     and ((p_resume_token_hash is not null and i.resume_token_hash=p_resume_token_hash)
       or (p_member_user_id is not null and i.member_user_id=p_member_user_id))
   limit 1 for update;
  if v.id is null then return; end if;
  if v.route_kind is not null and v.route_kind <> p_route_kind and v.route_kind <> 'unknown' then raise exception 'route_locked'; end if;
  update private.comun_cultural_contribution_intakes
     set route_kind=p_route_kind,
         status=case when p_route_kind='unknown' then 'routing' else coalesce(nullif(v.status,'draft'),'routed') end,
         routed_at=coalesce(routed_at,now()), updated_at=now()
   where id=v.id returning * into v;
  return query select v.id,v.public_protocol,v.status,v.route_kind;
end $$;

revoke all on function public.comun_route_cultural_contribution_intake_v1(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.comun_route_cultural_contribution_intake_v1(text,text,text,uuid) to service_role;

create or replace function public.comun_prepare_cultural_contribution_handoff_v1(
  p_public_protocol text,
  p_resume_token_hash text default null,
  p_member_user_id uuid default null
) returns table(public_protocol text,status text,route_kind text,handoff_state text,target_kind text,target_created boolean)
language plpgsql security invoker
set search_path = public, private, extensions
as $$
declare
  v private.comun_cultural_contribution_intakes%rowtype;
  v_target_id uuid;
  v_target_kind text;
  v_submitter_hash text := coalesce(nullif(p_resume_token_hash,''),encode(digest('member:'||coalesce(p_member_user_id::text,'anonymous'),'sha256'),'hex'));
begin
  select i.* into v from private.comun_cultural_contribution_intakes i
   where i.public_protocol=p_public_protocol
     and ((p_resume_token_hash is not null and i.resume_token_hash=p_resume_token_hash)
       or (p_member_user_id is not null and i.member_user_id=p_member_user_id))
   limit 1 for update;
  if v.id is null then return; end if;
  if v.target_id is not null and v.target_kind is not null then
    return query select v.public_protocol,v.status,v.route_kind,'handed_off'::text,v.target_kind,true;
    return;
  end if;
  if v.route_kind is null or v.route_kind='unknown' then
    update private.comun_cultural_contribution_intakes set status=case when v.route_kind='unknown' then 'routing' else 'handoff_pending' end,updated_at=now() where id=v.id returning * into v;
    return query select v.public_protocol,v.status,v.route_kind,'handoff_pending'::text,null::text,false;
    return;
  end if;
  if v.route_kind='photo_or_document' then
    v_target_kind:='comun_archive_submissions';
    insert into public.comun_archive_submissions(submission_type,status,contributor_credit_preference,relationship_to_material,title_suggestion,description_suggestion,rights_declaration,permission_confirmed,risk_level,submitter_hash)
    values('historical_photo','draft','anonymous','to_be_confirmed','Memória guardada pelo Acervo Vivo',v.intent_text_private,'pending_specialized_confirmation',false,'normal',v_submitter_hash) returning id into v_target_id;
  elsif v.route_kind='art' then
    v_target_kind:='comun_archive_artwork_submissions';
    insert into public.comun_archive_artwork_submissions(public_protocol,submission_kind,title_suggestion,artwork_type,context_suggestion,creator_credit_suggestion,status,is_author_or_authorized,information_true_declared,moderation_understood,correction_withdrawal_understood,submitter_hash)
    values('ARTE-'||upper(substr(replace(v.id::text,'-',''),1,12)),'unknown_authorship','Contribuição de arte em preparação','other',v.intent_text_private,'A confirmar pela pessoa autora ou autorizada','pending',false,false,false,false,v_submitter_hash) returning id into v_target_id;
  elsif v.route_kind='oral_history' then
    v_target_kind:='comun_archive_oral_history_suggestions';
    insert into public.comun_archive_oral_history_suggestions(suggested_person_or_theme,story_summary,status,submitter_hash)
    values('Memória para triagem de História Oral',v.intent_text_private,'pending',v_submitter_hash) returning id into v_target_id;
  elsif v.route_kind='radio' then
    v_target_kind:='comun_radio_contributions';
    insert into public.comun_radio_contributions(public_protocol,contribution_type,title_suggestion,context_suggestion,status,next_action_public)
    values('RADIO-'||upper(substr(replace(v.id::text,'-',''),1,12)),'program_proposal','Contribuição de pauta em preparação',v.intent_text_private,'pending','Aguardar triagem editorial; nenhuma publicação foi feita.') returning id into v_target_id;
  else
    update private.comun_cultural_contribution_intakes set status='handoff_pending',updated_at=now() where id=v.id returning * into v;
    return query select v.public_protocol,v.status,v.route_kind,'handoff_pending'::text,null::text,false;
    return;
  end if;
  update private.comun_cultural_contribution_intakes set status='handed_off',target_kind=v_target_kind,target_id=v_target_id,updated_at=now() where id=v.id returning * into v;
  return query select v.public_protocol,v.status,v.route_kind,'handed_off'::text,v.target_kind,true;
end $$;

revoke all on function public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid) from public,anon,authenticated;
grant execute on function public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid) to service_role;
