create table private.comun_cultural_contribution_intakes(
 id uuid primary key default gen_random_uuid(),
 public_protocol text not null unique,
 member_user_id uuid null,
 status text not null default 'draft' check(status in('draft','routing','routed','submitted','archived')),
 intent_text_private text not null check(char_length(intent_text_private) between 1 and 10000),
 route_kind text null check(route_kind is null or route_kind in('photo_or_document','art','oral_history','radio','unknown')),
 source_surface text not null default 'acervo_vivo',
 target_kind text null,
 target_id uuid null,
 request_id uuid not null unique,
 resume_token_hash text null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 routed_at timestamptz null,
 completed_at timestamptz null
);
alter table private.comun_cultural_contribution_intakes enable row level security;
alter table private.comun_cultural_contribution_intakes force row level security;
revoke all on private.comun_cultural_contribution_intakes from public,anon,authenticated;
grant select,insert,update,delete on private.comun_cultural_contribution_intakes to service_role;
create index comun_cultural_intakes_member_idx on private.comun_cultural_contribution_intakes(member_user_id,created_at desc);
create index comun_cultural_intakes_resume_idx on private.comun_cultural_contribution_intakes(resume_token_hash) where resume_token_hash is not null;
create trigger comun_cultural_intakes_updated_at before update on private.comun_cultural_contribution_intakes for each row execute function public.set_updated_at();

create or replace function public.comun_create_cultural_contribution_intake_v1(
 p_intent_text_private text,
 p_source_surface text,
 p_request_id uuid,
 p_resume_token_hash text default null,
 p_member_user_id uuid default null
) returns table(intake_id uuid,public_protocol text,status text)
language plpgsql security invoker set search_path=public,private,extensions as $$
declare v_id uuid; v_protocol text;
begin
 if p_intent_text_private is null or char_length(trim(p_intent_text_private)) not between 1 and 10000 then raise exception 'invalid_intent'; end if;
 if p_source_surface is null or char_length(trim(p_source_surface)) not between 1 and 80 then raise exception 'invalid_source'; end if;
 select i.id,i.public_protocol,i.status into v_id,v_protocol from private.comun_cultural_contribution_intakes i where i.request_id=p_request_id;
 if v_id is not null then return query select v_id,v_protocol,(select status from private.comun_cultural_contribution_intakes where id=v_id); return; end if;
 if p_resume_token_hash is not null and (select count(*) from private.comun_cultural_contribution_intakes where resume_token_hash=p_resume_token_hash and created_at > now()-interval '1 hour') >= 5 then raise exception 'rate_limited'; end if;
 v_id:=gen_random_uuid(); v_protocol:='ACERVO-'||upper(substr(replace(v_id::text,'-',''),1,12));
 insert into private.comun_cultural_contribution_intakes(id,public_protocol,member_user_id,intent_text_private,source_surface,request_id,resume_token_hash)
 values(v_id,v_protocol,p_member_user_id,trim(p_intent_text_private),trim(p_source_surface),p_request_id,p_resume_token_hash);
 return query select v_id,v_protocol,'draft'::text;
end $$;
revoke all on function public.comun_create_cultural_contribution_intake_v1(text,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.comun_create_cultural_contribution_intake_v1(text,text,uuid,text,uuid) to service_role;

create or replace function public.comun_route_cultural_contribution_intake_v1(p_public_protocol text,p_route_kind text,p_resume_token_hash text default null,p_member_user_id uuid default null)
returns table(intake_id uuid,public_protocol text,status text,route_kind text)
language plpgsql security invoker set search_path=public,private,extensions as $$
declare v private.comun_cultural_contribution_intakes%rowtype;
begin
 select * into v from private.comun_cultural_contribution_intakes i where i.public_protocol=p_public_protocol and ((p_resume_token_hash is not null and i.resume_token_hash=p_resume_token_hash) or (p_member_user_id is not null and i.member_user_id=p_member_user_id));
 if v.id is null then return; end if;
 if p_route_kind not in('photo_or_document','art','oral_history','radio','unknown') then raise exception 'invalid_route'; end if;
 update private.comun_cultural_contribution_intakes set route_kind=p_route_kind,status='routing',routed_at=coalesce(routed_at,now()),updated_at=now() where id=v.id returning * into v;
 return query select v.id,v.public_protocol,v.status,v.route_kind;
end $$;
revoke all on function public.comun_route_cultural_contribution_intake_v1(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.comun_route_cultural_contribution_intake_v1(text,text,text,uuid) to service_role;
