-- SOC-D10.M7.C PROPOSAL ONLY. Not a migration; never run on a shared database.
-- Caller must be the explicit owner of a disposable laboratory.
begin;
create schema comun_org_private;
revoke all on schema comun_org_private from public, anon, authenticated, service_role;
alter default privileges in schema comun_org_private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema comun_org_private revoke execute on functions from public, anon, authenticated, service_role;

create table comun_org_private.nuclei (
 id uuid primary key default gen_random_uuid(),
 community_id uuid not null references public.comun_communities(id) on delete restrict,
 purpose text not null check(length(purpose) between 10 and 2000),
 rules_version text not null check(length(rules_version) between 1 and 80),
 state text not null default 'proposed' check(state in ('proposed','active','paused','closed')),
 unique(id,community_id)
);
create table comun_org_private.consents (
 id uuid primary key default gen_random_uuid(), nucleus_id uuid not null, community_id uuid not null,
 user_id uuid not null references auth.users(id) on delete restrict,
 rules_version text not null check(length(rules_version) between 1 and 80),
 purpose_sha256 text not null check(purpose_sha256 ~ '^[a-f0-9]{64}$'),
 notice_version text not null check(notice_version='comun-nucleus-opt-in-v1'),
 notice_sha256 text not null check(notice_sha256='45f1246b387ba5e1ecf7232cb495ca90d6b82f7c2452f852f1fc4a3b5659b671'),
 affirmed_at timestamptz not null default now(), withdrawn_at timestamptz,
 check(withdrawn_at is null or withdrawn_at>=affirmed_at),
 foreign key(nucleus_id,community_id) references comun_org_private.nuclei(id,community_id),
 unique(id,nucleus_id,community_id,user_id)
);
create table comun_org_private.requests (
 id uuid primary key default gen_random_uuid(), consent_id uuid not null unique,
 nucleus_id uuid not null, community_id uuid not null, user_id uuid not null,
 requested_at timestamptz not null default now(),
 foreign key(consent_id,nucleus_id,community_id,user_id) references comun_org_private.consents(id,nucleus_id,community_id,user_id),
 unique(id,nucleus_id,community_id,user_id)
);
-- Provisioning this authority is a separate governance decision. No client grant path.
create table comun_org_private.reviewer_authorizations (
 id uuid primary key default gen_random_uuid(), request_id uuid not null,
 nucleus_id uuid not null, community_id uuid not null, subject_user_id uuid not null,
 reviewer_user_id uuid not null references auth.users(id) on delete restrict,
 basis_ref text not null check(length(basis_ref) between 8 and 120),
 starts_at timestamptz not null default now(), ends_at timestamptz not null, revoked_at timestamptz,
 check(reviewer_user_id<>subject_user_id), check(ends_at>starts_at and ends_at-starts_at<=interval '2160 hours'),
 check(revoked_at is null or revoked_at>=starts_at),
 foreign key(request_id,nucleus_id,community_id,subject_user_id) references comun_org_private.requests(id,nucleus_id,community_id,user_id),
 unique(id,request_id,nucleus_id,community_id,subject_user_id,reviewer_user_id)
);
create table comun_org_private.reviews (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 authorization_id uuid not null, nucleus_id uuid not null, community_id uuid not null,
 user_id uuid not null, reviewer_user_id uuid not null,
 decision text not null check(decision in ('approved','rejected')),
 decided_at timestamptz not null default now(), revoked_at timestamptz,
 check(reviewer_user_id<>user_id), check(revoked_at is null or revoked_at>=decided_at),
 foreign key(authorization_id,request_id,nucleus_id,community_id,user_id,reviewer_user_id)
 references comun_org_private.reviewer_authorizations(id,request_id,nucleus_id,community_id,subject_user_id,reviewer_user_id),
 unique(id,request_id,nucleus_id,community_id,user_id)
);
create table comun_org_private.enrollments (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique, review_id uuid not null unique,
 nucleus_id uuid not null, community_id uuid not null, user_id uuid not null,
 state text not null default 'active' check(state in ('active','paused','left','revoked')),
 activated_at timestamptz not null default now(), ended_at timestamptz,
 check((state='active')=(ended_at is null)), check(ended_at is null or ended_at>=activated_at),
 foreign key(review_id,request_id,nucleus_id,community_id,user_id) references comun_org_private.reviews(id,request_id,nucleus_id,community_id,user_id),
 unique(id,nucleus_id,community_id,user_id)
);
create unique index nucleus_one_current_enrollment on comun_org_private.enrollments(nucleus_id,user_id) where state in ('active','paused');
create table comun_org_private.mandates (
 id uuid primary key default gen_random_uuid(), enrollment_id uuid not null,
 nucleus_id uuid not null, community_id uuid not null, user_id uuid not null,
 role text not null check(length(role) between 1 and 80),
 state text not null default 'offered' check(state in ('offered','active','declined','completed','revoked')),
 offered_by uuid not null references auth.users(id), offered_at timestamptz not null default now(),
 accepted_at timestamptz, accepted_by uuid references auth.users(id),
 starts_at timestamptz not null default now(), ends_at timestamptz not null, revoked_at timestamptz,
 check(offered_by<>user_id), check(starts_at>=offered_at and ends_at>starts_at and ends_at-starts_at<=interval '2160 hours'),
 check((accepted_at is null)=(accepted_by is null)), check(accepted_by is null or accepted_by=user_id),
 check(accepted_at is null or (accepted_at>=offered_at and accepted_at<ends_at)),
 check(state<>'active' or (accepted_at is not null and revoked_at is null)),
 foreign key(enrollment_id,nucleus_id,community_id,user_id) references comun_org_private.enrollments(id,nucleus_id,community_id,user_id),
 unique(id,nucleus_id,community_id)
);
create table comun_org_private.succession_offers (
 id uuid primary key default gen_random_uuid(), outgoing_mandate_id uuid not null,
 candidate_enrollment_id uuid not null, nucleus_id uuid not null, community_id uuid not null,
 user_id uuid not null, proposed_by uuid not null references auth.users(id),
 state text not null default 'offered' check(state in ('offered','accepted','declined','cancelled')),
 offered_at timestamptz not null default now(), expires_at timestamptz not null,
 accepted_at timestamptz, accepted_by uuid references auth.users(id),
 check(proposed_by<>user_id), check(expires_at>offered_at and expires_at-offered_at<=interval '720 hours'),
 check((accepted_at is null)=(accepted_by is null)), check(accepted_by is null or accepted_by=user_id),
 check((state='accepted')=(accepted_at is not null)), check(accepted_at is null or (accepted_at>=offered_at and accepted_at<expires_at)),
 foreign key(outgoing_mandate_id,nucleus_id,community_id) references comun_org_private.mandates(id,nucleus_id,community_id),
 foreign key(candidate_enrollment_id,nucleus_id,community_id,user_id) references comun_org_private.enrollments(id,nucleus_id,community_id,user_id)
);
create table comun_org_private.succession_decisions (
 id uuid primary key default gen_random_uuid(), offer_id uuid not null unique references comun_org_private.succession_offers(id),
 reviewer_user_id uuid not null references auth.users(id),
 decision text not null check(decision in ('approved','rejected')), decided_at timestamptz not null default now()
);
create table comun_org_private.audit_events (
 id uuid primary key default gen_random_uuid(), nucleus_id uuid not null, community_id uuid not null,
 user_id uuid not null references auth.users(id), actor_user_id uuid not null references auth.users(id),
 event text not null check(event in ('requested','approved','rejected','paused','left','withdrawn','mandate_offered','mandate_active','mandate_declined','mandate_completed','mandate_revoked','succession_offered','succession_accepted','succession_declined','succession_reviewed')),
 occurred_at timestamptz not null default now(),
 foreign key(nucleus_id,community_id) references comun_org_private.nuclei(id,community_id)
);
create index nucleus_own_receipts on comun_org_private.consents(user_id,nucleus_id);
create index nucleus_own_requests on comun_org_private.requests(user_id,nucleus_id);
create index nucleus_review_scope on comun_org_private.reviewer_authorizations(reviewer_user_id,request_id) where revoked_at is null;
create index nucleus_own_mandates on comun_org_private.mandates(user_id,nucleus_id);
create unique index nucleus_current_mandate on comun_org_private.mandates(nucleus_id,user_id,role) where state in ('offered','active');
create index nucleus_own_offers on comun_org_private.succession_offers(user_id,nucleus_id);
create index nucleus_own_audit on comun_org_private.audit_events(user_id,nucleus_id);

-- These bounded definers are the only cross-row authorization readers.
-- Never accept a claimed user ID or JWT user_metadata as identity.
create function comun_org_private.actor_active() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users au where au.id=auth.uid() and au.deleted_at is null and (au.banned_until is null or au.banned_until<=now()))
 -- PostgREST verifies the JWT, not whether its GoTrue session was revoked.
 and exists(select 1 from auth.sessions s where s.user_id=auth.uid()
   and s.id=nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')::uuid)
 and exists(select 1 from public.comun_member_profiles p where p.user_id=auth.uid() and p.status='active');
$$;
create function comun_org_private.current_member(c uuid, u uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select u=auth.uid() and comun_org_private.actor_active()
 and exists(select 1 from public.comun_community_memberships m where m.community_id=c and m.member_user_id=u and m.state='member');
$$;
create function comun_org_private.can_review(r uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from comun_org_private.reviewer_authorizations a
 join comun_org_private.nuclei n on n.id=a.nucleus_id and n.community_id=a.community_id
 where a.request_id=r and a.reviewer_user_id=auth.uid() and a.subject_user_id<>auth.uid()
 and n.state='active' and a.revoked_at is null and a.starts_at<=now() and now()<a.ends_at
 and comun_org_private.current_member(a.community_id,auth.uid()));
$$;
create function comun_org_private.subject_enrollment_current(e uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from comun_org_private.enrollments x
 join comun_org_private.reviews r on r.id=x.review_id
 join comun_org_private.requests q on q.id=x.request_id
 join comun_org_private.consents c on c.id=q.consent_id
 join comun_org_private.nuclei n on n.id=x.nucleus_id and n.community_id=x.community_id
 where x.id=e and x.state='active' and r.decision='approved'
 and r.revoked_at is null and c.withdrawn_at is null and n.state='active'
 and c.rules_version=n.rules_version and c.purpose_sha256=encode(sha256(convert_to(n.purpose,'UTF8')),'hex')
 and exists(select 1 from auth.users subject where subject.id=x.user_id and subject.deleted_at is null and (subject.banned_until is null or subject.banned_until<=now()))
 and exists(select 1 from public.comun_member_profiles p join public.comun_community_memberships m on m.member_user_id=p.user_id where p.user_id=x.user_id and p.status='active' and m.community_id=x.community_id and m.state='member'));
$$;
create function comun_org_private.enrollment_active(e uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from comun_org_private.enrollments x where x.id=e and x.user_id=auth.uid() and comun_org_private.subject_enrollment_current(x.id));
$$;

create function comun_org_private.validate_enrollment_chain() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.state<>'active' or not exists(
 select 1 from comun_org_private.reviews r
 join comun_org_private.requests q on q.id=r.request_id
 join comun_org_private.consents c on c.id=q.consent_id
 join comun_org_private.reviewer_authorizations a on a.id=r.authorization_id
 join comun_org_private.nuclei n on n.id=q.nucleus_id
 where r.id=new.review_id and r.request_id=new.request_id and r.decision='approved'
 and r.revoked_at is null and c.withdrawn_at is null and n.state='active'
 and c.rules_version=n.rules_version and c.purpose_sha256=encode(sha256(convert_to(n.purpose,'UTF8')),'hex')
 and c.affirmed_at<=q.requested_at and q.requested_at<=r.decided_at
 and r.decided_at<=new.activated_at and new.activated_at<=now()
 and a.starts_at<=r.decided_at and r.decided_at<a.ends_at
 and (a.revoked_at is null or a.revoked_at>r.decided_at)
 and exists(select 1 from auth.users subject where subject.id=new.user_id and subject.deleted_at is null and (subject.banned_until is null or subject.banned_until<=now()))
 and exists(select 1 from public.comun_member_profiles p join public.comun_community_memberships m on m.member_user_id=p.user_id where p.user_id=new.user_id and p.status='active' and m.community_id=new.community_id and m.state='member')
 ) then raise exception 'NUCLEUS_ENROLLMENT_CHAIN_INVALID'; end if;
 return new;
end $$;
create trigger enrollment_chain before insert on comun_org_private.enrollments for each row execute function comun_org_private.validate_enrollment_chain();

-- Direct client DML is revoked. Guard historical rows even against accidental
-- privileged application updates. Explicit superuser DDL remains a trust boundary.
create function comun_org_private.guard_history() returns trigger
language plpgsql set search_path='' as $$
declare mutable text[];
begin
 if tg_op='DELETE' then raise exception 'NUCLEUS_HISTORY_IMMUTABLE'; end if;
 mutable:=case tg_table_name
 when 'consents' then array['withdrawn_at'] when 'reviews' then array['revoked_at']
 when 'reviewer_authorizations' then array['revoked_at']
 when 'enrollments' then array['state','ended_at']
 when 'mandates' then array['state','accepted_at','accepted_by','revoked_at']
 when 'succession_offers' then array['state','accepted_at','accepted_by'] else array[]::text[] end;
 if (to_jsonb(new)-mutable) is distinct from (to_jsonb(old)-mutable) then raise exception 'NUCLEUS_HISTORY_IMMUTABLE'; end if;
 if tg_table_name in ('consents','reviews','reviewer_authorizations') then
  if (to_jsonb(old)->>mutable[1]) is not null or (to_jsonb(new)->>mutable[1]) is null then raise exception 'NUCLEUS_TERMINAL_STATE'; end if;
 elsif tg_table_name='enrollments' then
  if old.state not in ('active','paused') or new.state not in ('paused','left','revoked') or old.state=new.state then raise exception 'NUCLEUS_TERMINAL_STATE'; end if;
 elsif tg_table_name='mandates' then
  if not ((old.state='offered' and new.state in ('active','declined','revoked')) or (old.state='active' and new.state in ('completed','revoked'))) then raise exception 'NUCLEUS_TERMINAL_STATE'; end if;
  if old.accepted_at is not null and (new.accepted_at is distinct from old.accepted_at or new.accepted_by is distinct from old.accepted_by) then raise exception 'NUCLEUS_ACCEPTANCE_IMMUTABLE'; end if;
 elsif tg_table_name='succession_offers' then
  if old.state<>'offered' or new.state not in ('accepted','declined','cancelled') then raise exception 'NUCLEUS_TERMINAL_STATE'; end if;
 else raise exception 'NUCLEUS_HISTORY_IMMUTABLE'; end if;
 return new;
end;
$$;
do $$ declare t text; begin
 for t in select unnest(array['nuclei','consents','requests','reviewer_authorizations','reviews','enrollments','mandates','succession_offers','succession_decisions','audit_events']) loop
  execute format('alter table comun_org_private.%I enable row level security',t);
  execute format('alter table comun_org_private.%I force row level security',t);
  if t<>'nuclei' then execute format('create trigger history_guard before update or delete on comun_org_private.%I for each row execute function comun_org_private.guard_history()',t); end if;
 end loop;
end $$;

create function comun_org_private.request_entry(nucleus uuid, version text, digest text, affirmative boolean, rules text, purpose_digest text) returns uuid
language plpgsql security definer set search_path='' as $$
declare n comun_org_private.nuclei; c uuid; q uuid;
begin
 select * into strict n from comun_org_private.nuclei where id=nucleus and state='active' for update;
 if not comun_org_private.current_member(n.community_id,auth.uid()) or affirmative is distinct from true or rules is distinct from n.rules_version or purpose_digest is distinct from encode(sha256(convert_to(n.purpose,'UTF8')),'hex') then raise exception 'NUCLEUS_ENTRY_FORBIDDEN'; end if;
 if exists(select 1 from comun_org_private.enrollments e where e.nucleus_id=n.id and e.user_id=auth.uid() and e.state in ('active','paused')) then raise exception 'NUCLEUS_CURRENT_ENROLLMENT_EXISTS'; end if;
 insert into comun_org_private.consents(nucleus_id,community_id,user_id,notice_version,notice_sha256,rules_version,purpose_sha256) values(n.id,n.community_id,auth.uid(),version,digest,n.rules_version,purpose_digest) returning id into c;
 insert into comun_org_private.requests(consent_id,nucleus_id,community_id,user_id) values(c,n.id,n.community_id,auth.uid()) returning id into q;
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(n.id,n.community_id,auth.uid(),auth.uid(),'requested');
 return q;
exception when no_data_found then raise exception 'NUCLEUS_ENTRY_FORBIDDEN';
end $$;
create function comun_org_private.review_entry(request uuid, decision text) returns uuid
language plpgsql security definer set search_path='' as $$
declare q comun_org_private.requests; a uuid; r uuid; e uuid;
begin
 select * into strict q from comun_org_private.requests where id=request for update;
 if not comun_org_private.can_review(q.id) or q.user_id=auth.uid() or decision not in ('approved','rejected') then raise exception 'NUCLEUS_REVIEW_FORBIDDEN'; end if;
 perform 1 from comun_org_private.consents c where c.id=q.consent_id and c.withdrawn_at is null for update;
 if not found then raise exception 'NUCLEUS_CONSENT_WITHDRAWN'; end if;
 if not exists(select 1 from auth.users subject where subject.id=q.user_id and subject.deleted_at is null and (subject.banned_until is null or subject.banned_until<=now())) or not exists(select 1 from public.comun_member_profiles p join public.comun_community_memberships m on m.member_user_id=p.user_id where p.user_id=q.user_id and p.status='active' and m.community_id=q.community_id and m.state='member') then raise exception 'NUCLEUS_SUBJECT_INACTIVE'; end if;
 select id into strict a from comun_org_private.reviewer_authorizations where request_id=q.id and reviewer_user_id=auth.uid() and revoked_at is null and starts_at<=now() and now()<ends_at order by starts_at desc limit 1 for update;
 insert into comun_org_private.reviews(request_id,authorization_id,nucleus_id,community_id,user_id,reviewer_user_id,decision) values(q.id,a,q.nucleus_id,q.community_id,q.user_id,auth.uid(),decision) returning id into r;
 if decision='approved' then insert into comun_org_private.enrollments(request_id,review_id,nucleus_id,community_id,user_id) values(q.id,r,q.nucleus_id,q.community_id,q.user_id) returning id into e; end if;
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(q.nucleus_id,q.community_id,q.user_id,auth.uid(),decision);
 return e;
exception when no_data_found then raise exception 'NUCLEUS_REVIEW_FORBIDDEN';
end $$;
create function comun_org_private.leave_entry(enrollment uuid, next_state text) returns void
language plpgsql security definer set search_path='' as $$
declare e comun_org_private.enrollments;
begin
 select * into strict e from comun_org_private.enrollments where id=enrollment and user_id=auth.uid() for update;
 if next_state not in ('paused','left') then raise exception 'NUCLEUS_STATE_FORBIDDEN'; end if;
 update comun_org_private.enrollments set state=next_state,ended_at=now() where id=e.id;
 if next_state='left' then update comun_org_private.consents set withdrawn_at=now() where id=(select consent_id from comun_org_private.requests where id=e.request_id) and withdrawn_at is null; end if;
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(e.nucleus_id,e.community_id,e.user_id,auth.uid(),next_state);
exception when no_data_found then raise exception 'NUCLEUS_STATE_FORBIDDEN';
end $$;
create function comun_org_private.withdraw_consent(consent uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c comun_org_private.consents;
begin
 select * into strict c from comun_org_private.consents where id=consent and user_id=auth.uid() for update;
 update comun_org_private.consents set withdrawn_at=now() where id=c.id;
 update comun_org_private.enrollments set state='left',ended_at=now() where request_id=(select id from comun_org_private.requests where consent_id=c.id) and state in ('active','paused');
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(c.nucleus_id,c.community_id,c.user_id,auth.uid(),'withdrawn');
exception when no_data_found then raise exception 'NUCLEUS_CONSENT_FORBIDDEN';
end $$;
create function comun_org_private.offer_mandate(enrollment uuid, responsibility text, ends timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare e comun_org_private.enrollments; m uuid;
begin
 select * into strict e from comun_org_private.enrollments where id=enrollment and state='active' for update;
 if not comun_org_private.can_review(e.request_id) or not comun_org_private.subject_enrollment_current(e.id) then raise exception 'NUCLEUS_MANDATE_OFFER_FORBIDDEN'; end if;
 insert into comun_org_private.mandates(enrollment_id,nucleus_id,community_id,user_id,role,offered_by,ends_at) values(e.id,e.nucleus_id,e.community_id,e.user_id,responsibility,auth.uid(),ends) returning id into m;
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(e.nucleus_id,e.community_id,e.user_id,auth.uid(),'mandate_offered'); return m;
exception when no_data_found then raise exception 'NUCLEUS_MANDATE_OFFER_FORBIDDEN';
end $$;
create function comun_org_private.respond_mandate(mandate uuid, accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare m comun_org_private.mandates;
begin
 select * into strict m from comun_org_private.mandates where id=mandate and user_id=auth.uid() for update;
 if accept is null or not comun_org_private.enrollment_active(m.enrollment_id) or m.state<>'offered' or now()>=m.ends_at or m.revoked_at is not null then raise exception 'NUCLEUS_MANDATE_ACCEPT_FORBIDDEN'; end if;
 update comun_org_private.mandates set state=case when accept then 'active' else 'declined' end, accepted_at=case when accept then now() end, accepted_by=case when accept then auth.uid() end where id=m.id;
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(m.nucleus_id,m.community_id,m.user_id,auth.uid(),case when accept then 'mandate_active' else 'mandate_declined' end);
exception when no_data_found then raise exception 'NUCLEUS_MANDATE_ACCEPT_FORBIDDEN';
end $$;
create function comun_org_private.mandate_active(mandate uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from comun_org_private.mandates m where m.id=mandate and m.user_id=auth.uid() and m.state='active' and m.accepted_by=auth.uid() and m.accepted_at<=now() and m.revoked_at is null and m.starts_at<=now() and now()<m.ends_at and comun_org_private.enrollment_active(m.enrollment_id));
$$;
create function comun_org_private.end_mandate(mandate uuid, next_state text) returns void
language plpgsql security definer set search_path='' as $$
declare m comun_org_private.mandates; q uuid;
begin
 select * into strict m from comun_org_private.mandates where id=mandate for update;
 select request_id into strict q from comun_org_private.enrollments where id=m.enrollment_id;
 if not ((next_state='completed' and m.user_id=auth.uid() and comun_org_private.actor_active()) or (next_state='revoked' and comun_org_private.can_review(q))) then raise exception 'NUCLEUS_MANDATE_END_FORBIDDEN'; end if;
 update comun_org_private.mandates set state=next_state,revoked_at=case when next_state='revoked' then now() else revoked_at end where id=m.id;
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(m.nucleus_id,m.community_id,m.user_id,auth.uid(),case when next_state='revoked' then 'mandate_revoked' else 'mandate_completed' end);
exception when no_data_found then raise exception 'NUCLEUS_MANDATE_END_FORBIDDEN';
end $$;
create function comun_org_private.offer_succession(mandate uuid, candidate uuid, expires timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare m comun_org_private.mandates; e comun_org_private.enrollments; o uuid;
begin
 select * into strict m from comun_org_private.mandates where id=mandate for update;
 select * into strict e from comun_org_private.enrollments where id=candidate and nucleus_id=m.nucleus_id and community_id=m.community_id and state='active' for update;
 if not comun_org_private.mandate_active(m.id) or not comun_org_private.subject_enrollment_current(e.id) or expires>m.ends_at then raise exception 'NUCLEUS_SUCCESSION_FORBIDDEN'; end if;
 insert into comun_org_private.succession_offers(outgoing_mandate_id,candidate_enrollment_id,nucleus_id,community_id,user_id,proposed_by,expires_at) values(m.id,e.id,m.nucleus_id,m.community_id,e.user_id,auth.uid(),expires) returning id into o;
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(e.nucleus_id,e.community_id,e.user_id,auth.uid(),'succession_offered'); return o;
exception when no_data_found then raise exception 'NUCLEUS_SUCCESSION_FORBIDDEN';
end $$;
create function comun_org_private.respond_succession(offer uuid, accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare o comun_org_private.succession_offers;
begin
 select * into strict o from comun_org_private.succession_offers where id=offer and user_id=auth.uid() for update;
 if accept is null or not comun_org_private.enrollment_active(o.candidate_enrollment_id) or o.state<>'offered' or now()>=o.expires_at or not exists(select 1 from comun_org_private.mandates m where m.id=o.outgoing_mandate_id and m.state='active' and m.revoked_at is null and m.accepted_at is not null and m.starts_at<=now() and now()<m.ends_at and comun_org_private.subject_enrollment_current(m.enrollment_id)) then raise exception 'NUCLEUS_SUCCESSION_ACCEPT_FORBIDDEN'; end if;
 update comun_org_private.succession_offers set state=case when accept then 'accepted' else 'declined' end,accepted_at=case when accept then now() end,accepted_by=case when accept then auth.uid() end where id=o.id;
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(o.nucleus_id,o.community_id,o.user_id,auth.uid(),case when accept then 'succession_accepted' else 'succession_declined' end);
exception when no_data_found then raise exception 'NUCLEUS_SUCCESSION_ACCEPT_FORBIDDEN';
end $$;
create function comun_org_private.review_succession(offer uuid, decision text) returns void
language plpgsql security definer set search_path='' as $$
declare o comun_org_private.succession_offers; q uuid;
begin
 select * into strict o from comun_org_private.succession_offers where id=offer for update;
 select request_id into strict q from comun_org_private.enrollments where id=o.candidate_enrollment_id and state='active';
 if not comun_org_private.can_review(q) or not comun_org_private.subject_enrollment_current(o.candidate_enrollment_id) or auth.uid() in (o.user_id,o.proposed_by) or o.state<>'accepted' or now()>=o.expires_at or decision not in ('approved','rejected') or not exists(select 1 from comun_org_private.mandates m where m.id=o.outgoing_mandate_id and m.state='active' and m.revoked_at is null and now()<m.ends_at and comun_org_private.subject_enrollment_current(m.enrollment_id)) then raise exception 'NUCLEUS_SUCCESSION_REVIEW_FORBIDDEN'; end if;
 insert into comun_org_private.succession_decisions(offer_id,reviewer_user_id,decision) values(o.id,auth.uid(),decision);
 insert into comun_org_private.audit_events(nucleus_id,community_id,user_id,actor_user_id,event) values(o.nucleus_id,o.community_id,o.user_id,auth.uid(),'succession_reviewed');
 -- Approval records a decision only. A new mandate/acceptance needs a separate operation.
exception when no_data_found then raise exception 'NUCLEUS_SUCCESSION_REVIEW_FORBIDDEN';
end $$;

revoke all on all tables in schema comun_org_private from public, anon, authenticated, service_role;
revoke execute on all functions in schema comun_org_private from public, anon, authenticated, service_role;
grant usage on schema comun_org_private to authenticated;
grant select on comun_org_private.consents to authenticated;
grant select(id,nucleus_id,community_id,user_id,requested_at) on comun_org_private.requests to authenticated;
grant select(id,request_id,nucleus_id,community_id,user_id,state,activated_at,ended_at) on comun_org_private.enrollments to authenticated;
grant select(id,nucleus_id,community_id,user_id,role,state,offered_at,accepted_at,accepted_by,starts_at,ends_at,revoked_at) on comun_org_private.mandates to authenticated;
grant select(id,nucleus_id,community_id,user_id,state,offered_at,expires_at,accepted_at,accepted_by) on comun_org_private.succession_offers to authenticated;
grant select(id,nucleus_id,community_id,user_id,event,occurred_at) on comun_org_private.audit_events to authenticated;
create policy own_receipt on comun_org_private.consents for select to authenticated using(user_id=(select auth.uid()) and comun_org_private.actor_active());
create policy scoped_request on comun_org_private.requests for select to authenticated using((user_id=(select auth.uid()) and comun_org_private.actor_active()) or comun_org_private.can_review(id));
create policy own_enrollment on comun_org_private.enrollments for select to authenticated using(user_id=(select auth.uid()) and comun_org_private.actor_active());
create policy own_mandate on comun_org_private.mandates for select to authenticated using(user_id=(select auth.uid()) and comun_org_private.actor_active());
create policy own_offer on comun_org_private.succession_offers for select to authenticated using(user_id=(select auth.uid()) and comun_org_private.actor_active());
create policy own_audit on comun_org_private.audit_events for select to authenticated using(user_id=(select auth.uid()) and comun_org_private.actor_active());
grant execute on function comun_org_private.actor_active(), comun_org_private.current_member(uuid,uuid), comun_org_private.can_review(uuid), comun_org_private.enrollment_active(uuid), comun_org_private.mandate_active(uuid) to authenticated;
grant execute on function comun_org_private.request_entry(uuid,text,text,boolean,text,text), comun_org_private.review_entry(uuid,text), comun_org_private.leave_entry(uuid,text), comun_org_private.withdraw_consent(uuid), comun_org_private.offer_mandate(uuid,text,timestamptz), comun_org_private.respond_mandate(uuid,boolean), comun_org_private.end_mandate(uuid,text), comun_org_private.offer_succession(uuid,uuid,timestamptz), comun_org_private.respond_succession(uuid,boolean), comun_org_private.review_succession(uuid,text) to authenticated;
commit;
