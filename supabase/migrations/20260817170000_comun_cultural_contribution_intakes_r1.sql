create or replace function public.comun_get_cultural_contribution_intake_v1(
  p_public_protocol text,
  p_resume_token_hash text default null,
  p_member_user_id uuid default null
) returns table(
  public_protocol text,
  status text,
  route_kind text,
  intent_text_private text,
  created_at timestamptz
)
language sql
security invoker
set search_path = public, private, extensions
as $$
  select i.public_protocol, i.status, i.route_kind, i.intent_text_private, i.created_at
    from private.comun_cultural_contribution_intakes as i
   where i.public_protocol = p_public_protocol
     and (
       (p_resume_token_hash is not null and i.resume_token_hash = p_resume_token_hash)
       or (p_member_user_id is not null and i.member_user_id = p_member_user_id)
     )
   limit 1
$$;

revoke all on function public.comun_get_cultural_contribution_intake_v1(text, text, uuid) from public, anon, authenticated;
grant execute on function public.comun_get_cultural_contribution_intake_v1(text, text, uuid) to service_role;

create or replace function public.comun_create_cultural_contribution_intake_v1(
  p_intent_text_private text,
  p_source_surface text,
  p_request_id uuid,
  p_resume_token_hash text default null,
  p_member_user_id uuid default null
) returns table(intake_id uuid, public_protocol text, status text)
language plpgsql
security invoker
set search_path = public, private, extensions
as $$
declare
  v_id uuid;
  v_protocol text;
begin
  if p_intent_text_private is null or char_length(trim(p_intent_text_private)) not between 1 and 10000 then
    raise exception 'invalid_intent';
  end if;
  if p_source_surface is null or char_length(trim(p_source_surface)) not between 1 and 80 then
    raise exception 'invalid_source';
  end if;

  select i.id, i.public_protocol into v_id, v_protocol
    from private.comun_cultural_contribution_intakes as i
   where i.request_id = p_request_id;
  if v_id is not null then
    return query
      select v_id, v_protocol, i.status
        from private.comun_cultural_contribution_intakes as i
       where i.id = v_id;
    return;
  end if;

  if p_resume_token_hash is not null and (
    select count(*)
      from private.comun_cultural_contribution_intakes as i
     where i.resume_token_hash = p_resume_token_hash
       and i.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limited';
  end if;

  v_id := gen_random_uuid();
  v_protocol := 'ACERVO-' || upper(substr(replace(v_id::text, '-', ''), 1, 12));
  insert into private.comun_cultural_contribution_intakes(
    id, public_protocol, member_user_id, intent_text_private, source_surface,
    request_id, resume_token_hash
  ) values (
    v_id, v_protocol, p_member_user_id, trim(p_intent_text_private),
    trim(p_source_surface), p_request_id, p_resume_token_hash
  );
  return query select v_id, v_protocol, 'draft'::text;
end
$$;

revoke all on function public.comun_create_cultural_contribution_intake_v1(text, text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.comun_create_cultural_contribution_intake_v1(text, text, uuid, text, uuid) to service_role;

create or replace function public.comun_route_cultural_contribution_intake_v1(
  p_public_protocol text,
  p_route_kind text,
  p_resume_token_hash text default null,
  p_member_user_id uuid default null
) returns table(intake_id uuid, public_protocol text, status text, route_kind text)
language plpgsql
security invoker
set search_path = public, private, extensions
as $$
declare
  v private.comun_cultural_contribution_intakes%rowtype;
begin
  if p_route_kind not in ('photo_or_document', 'art', 'oral_history', 'radio', 'unknown') then
    raise exception 'invalid_route';
  end if;

  select i.* into v
    from private.comun_cultural_contribution_intakes as i
   where i.public_protocol = p_public_protocol
     and (
       (p_resume_token_hash is not null and i.resume_token_hash = p_resume_token_hash)
       or (p_member_user_id is not null and i.member_user_id = p_member_user_id)
     )
   limit 1;

  if v.id is null then
    return;
  end if;

   update private.comun_cultural_contribution_intakes
     set route_kind = p_route_kind,
         status = case when p_route_kind = 'unknown' then 'routing' else 'routed' end,
         routed_at = coalesce(routed_at, now()),
         updated_at = now()
   where id = v.id;
  select i.* into v
    from private.comun_cultural_contribution_intakes as i
   where i.id = v.id;

  return query select v.id, v.public_protocol, v.status, v.route_kind;
end
$$;

revoke all on function public.comun_route_cultural_contribution_intake_v1(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.comun_route_cultural_contribution_intake_v1(text, text, text, uuid) to service_role;
