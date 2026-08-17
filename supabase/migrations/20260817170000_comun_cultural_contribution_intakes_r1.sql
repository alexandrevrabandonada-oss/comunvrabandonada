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
   where id = v.id
   returning id, public_protocol, status, route_kind into v.id, v.public_protocol, v.status, v.route_kind;

  return query select v.id, v.public_protocol, v.status, v.route_kind;
end
$$;

revoke all on function public.comun_route_cultural_contribution_intake_v1(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.comun_route_cultural_contribution_intake_v1(text, text, text, uuid) to service_role;
