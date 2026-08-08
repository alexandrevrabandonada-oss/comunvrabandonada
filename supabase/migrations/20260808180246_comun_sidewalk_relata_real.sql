begin;

create table private.comun_sidewalk_relata_intakes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references private.comun_relata_reports(id) on delete restrict,
  case_id uuid not null unique references public.comun_relata_cases(id) on delete restrict,
  condition text not null check (condition in ('good','regular','bad','terrible')),
  problems text[] not null check (
    cardinality(problems) between 1 and 6
    and problems <@ array['hole','irregular','no_ramp','obstacle','narrow','no_sidewalk']::text[]
  ),
  affected_groups text[] not null check (
    cardinality(affected_groups) between 1 and 7
    and affected_groups <@ array[
      'wheelchair_users','visual_impairment','older_people','children',
      'strollers','temporary_mobility','general_circulation'
    ]::text[]
  ),
  review_state text not null default 'evidence_pending' check (
    review_state in ('evidence_pending','pending_review','needs_information','rejected','published','withdrawn')
  ),
  published_record_id uuid unique references public.comun_sidewalk_records(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index comun_sidewalk_relata_review_queue_idx
  on private.comun_sidewalk_relata_intakes(review_state, created_at, id)
  where review_state in ('pending_review','needs_information');

alter table private.comun_sidewalk_relata_intakes enable row level security;
alter table private.comun_sidewalk_relata_intakes force row level security;
revoke all on table private.comun_sidewalk_relata_intakes from public, anon, authenticated;
grant select, insert, update on table private.comun_sidewalk_relata_intakes to service_role;

create or replace function private.comun_sidewalk_validate_text_array(
  p_values text[],
  p_allowed text[],
  p_maximum integer
)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select coalesce(cardinality(p_values) between 1 and p_maximum, false)
    and p_values <@ p_allowed
    and cardinality(p_values) = cardinality(array(select distinct unnest(p_values)));
$$;

create or replace function public.comun_sidewalk_intake_create(
  p_protocol text,
  p_receipt_secret text,
  p_condition text,
  p_problems text[],
  p_affected_groups text[]
)
returns table(intake_id uuid, review_state text)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_context record;
  v_intake private.comun_sidewalk_relata_intakes%rowtype;
begin
  select * into v_context
    from private.comun_relata_authorized_context(p_protocol, p_receipt_secret);

  if not found
    or v_context.category <> 'sidewalk_accessibility'
    or v_context.case_state = 'withdrawn'
    or p_condition not in ('good','regular','bad','terrible')
    or not private.comun_sidewalk_validate_text_array(
      p_problems,
      array['hole','irregular','no_ramp','obstacle','narrow','no_sidewalk']::text[],
      6
    )
    or not private.comun_sidewalk_validate_text_array(
      p_affected_groups,
      array['wheelchair_users','visual_impairment','older_people','children','strollers','temporary_mobility','general_circulation']::text[],
      7
    )
  then
    return;
  end if;

  insert into private.comun_sidewalk_relata_intakes as existing(
    report_id, case_id, condition, problems, affected_groups
  ) values (
    v_context.report_id, v_context.case_id, p_condition, p_problems, p_affected_groups
  )
  on conflict (report_id) do update
    set updated_at = existing.updated_at
  returning * into v_intake;

  return query select v_intake.id, v_intake.review_state;
end;
$$;

create or replace function public.comun_sidewalk_intake_finalize(
  p_protocol text,
  p_receipt_secret text
)
returns table(intake_id uuid, review_state text)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_context record;
  v_intake private.comun_sidewalk_relata_intakes%rowtype;
begin
  select * into v_context
    from private.comun_relata_authorized_context(p_protocol, p_receipt_secret);
  if not found or v_context.category <> 'sidewalk_accessibility' or v_context.case_state = 'withdrawn' then
    return;
  end if;

  select * into v_intake
    from private.comun_sidewalk_relata_intakes
    where report_id = v_context.report_id
    for update;
  if not found then return; end if;

  if not exists (
    select 1 from private.comun_relata_private_locations
    where report_id = v_context.report_id
      and evidence_state = 'added_private'
      and withdrawn_at is null
  ) then
    return;
  end if;

  if v_intake.review_state = 'evidence_pending' then
    update private.comun_sidewalk_relata_intakes
      set review_state = 'pending_review', updated_at = now()
      where id = v_intake.id
      returning * into v_intake;

    update private.comun_participation_wallet_items
      set presentation_state = 'Em revisão',
          action_required = null,
          metadata = metadata || jsonb_build_object(
            'sidewalkIntake', true,
            'sidewalkReviewState', 'pending_review'
          ),
          updated_at = now()
      where item_type = 'relata_report'
        and subject_ref = v_context.case_id::text
        and archived_at is null;
  end if;

  return query select v_intake.id, v_intake.review_state;
end;
$$;

create or replace function public.comun_sidewalk_intake_admin_list(
  p_intake_id uuid default null
)
returns table(
  intake_id uuid,
  protocol text,
  original_text text,
  condition text,
  problems text[],
  affected_groups text[],
  review_state text,
  created_at timestamptz,
  location_origin text,
  location_accuracy_class text,
  location_captured_at timestamptz,
  location_ciphertext bytea,
  location_nonce bytea,
  location_auth_tag bytea,
  location_key_version text,
  attachment_id uuid,
  attachment_derivative_object_key text
)
language sql
stable
security definer
set search_path = pg_catalog, private, public
as $$
  select
    i.id,
    c.protocol,
    r.original_text,
    i.condition,
    i.problems,
    i.affected_groups,
    i.review_state,
    i.created_at,
    l.origin,
    l.accuracy_class,
    l.captured_at,
    l.encrypted_value,
    l.nonce,
    l.auth_tag,
    l.key_version,
    a.id,
    a.derivative_object_key
  from private.comun_sidewalk_relata_intakes i
  join private.comun_relata_reports r on r.id = i.report_id
  join public.comun_relata_cases c on c.id = i.case_id
  join private.comun_relata_private_locations l
    on l.report_id = i.report_id
   and l.evidence_state = 'added_private'
   and l.withdrawn_at is null
  left join lateral (
    select aa.id, aa.derivative_object_key
    from private.comun_relata_attachments aa
    where aa.report_id = i.report_id and aa.state = 'sealed_private'
    order by aa.label_index
    limit 1
  ) a on true
  where i.review_state in ('pending_review','needs_information')
    and (p_intake_id is null or i.id = p_intake_id)
  order by i.created_at, i.id;
$$;

create or replace function public.comun_sidewalk_intake_review(
  p_intake_id uuid,
  p_decision text,
  p_public_summary text default null,
  p_public_geometry jsonb default null
)
returns table(intake_id uuid, review_state text, published_record_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_intake private.comun_sidewalk_relata_intakes%rowtype;
  v_pauta_id uuid;
  v_record_id uuid;
  v_slug text;
  v_wallet_state text;
  v_action text;
begin
  if p_decision not in ('publish_approximate','needs_information','reject','withdraw') then
    raise exception using errcode = '22023', message = 'COMUN_SIDEWALK_INVALID_REVIEW_DECISION';
  end if;

  select * into v_intake
    from private.comun_sidewalk_relata_intakes
    where id = p_intake_id
    for update;
  if not found or v_intake.review_state in ('rejected','published','withdrawn') then return; end if;

  if exists (
    select 1 from public.comun_relata_cases
    where id = v_intake.case_id and state = 'withdrawn'
  ) then
    p_decision := 'withdraw';
  end if;

  if p_decision = 'publish_approximate' then
    if p_public_summary is null
      or char_length(trim(p_public_summary)) not between 16 and 800
      or p_public_geometry is null
      or jsonb_typeof(p_public_geometry) <> 'object'
      or p_public_geometry->>'type' <> 'Point'
      or p_public_geometry ? 'properties'
    then
      raise exception using errcode = '22023', message = 'COMUN_SIDEWALK_INVALID_PUBLIC_PROJECTION';
    end if;
    if jsonb_typeof(p_public_geometry->'coordinates') <> 'array' then
      raise exception using errcode = '22023', message = 'COMUN_SIDEWALK_INVALID_PUBLIC_PROJECTION';
    end if;
    if jsonb_array_length(p_public_geometry->'coordinates') <> 2
      or jsonb_typeof(p_public_geometry->'coordinates'->0) <> 'number'
      or jsonb_typeof(p_public_geometry->'coordinates'->1) <> 'number'
      or abs((p_public_geometry->'coordinates'->0)::numeric) > 180
      or abs((p_public_geometry->'coordinates'->1)::numeric) > 90
    then
      raise exception using errcode = '22023', message = 'COMUN_SIDEWALK_INVALID_PUBLIC_PROJECTION';
    end if;

    select id into v_pauta_id from public.comun_pauta_spaces
      where slug = 'calcadas-em-circulacao' limit 1;
    if v_pauta_id is null then
      raise exception using errcode = '23503', message = 'COMUN_SIDEWALK_PAUTA_MISSING';
    end if;

    v_slug := 'registro-revisado-' || replace(v_intake.id::text, '-', '');
    insert into public.comun_sidewalk_records(
      pauta_id, slug, name, geometry_geojson, private_geometry_geojson,
      public_geometry_geojson, categories, impact_level, affected_groups,
      status, verification_status, visibility, public_summary,
      private_notes, public_location_level, location_source,
      location_precision, condition, submitter_is_anonymous,
      geographic_risk, forwarding_status, last_observed_at
    ) values (
      v_pauta_id, v_slug, 'Trecho de calçada revisado', null, null,
      p_public_geometry, v_intake.problems,
      case when v_intake.condition = 'terrible' then 'critical'
           when v_intake.condition = 'bad' then 'high'
           when v_intake.condition = 'regular' then 'medium'
           else 'low' end,
      v_intake.affected_groups,
      'published', 'verified', 'public', trim(p_public_summary),
      null, 'approximate', 'editorial', 'approximate', v_intake.condition,
      true, 'low', 'no_action', now()
    ) returning id into v_record_id;

    update private.comun_sidewalk_relata_intakes
      set review_state = 'published', published_record_id = v_record_id,
          reviewed_at = now(), updated_at = now()
      where id = v_intake.id;
    v_wallet_state := 'Publicado no mapa';
    v_action := null;
  elsif p_decision = 'needs_information' then
    update private.comun_sidewalk_relata_intakes
      set review_state = 'needs_information', reviewed_at = now(), updated_at = now()
      where id = v_intake.id;
    v_wallet_state := 'Precisa de complemento';
    v_action := 'Completar informações da calçada';
  elsif p_decision = 'reject' then
    update private.comun_sidewalk_relata_intakes
      set review_state = 'rejected', reviewed_at = now(), updated_at = now()
      where id = v_intake.id;
    v_wallet_state := 'Guardado';
    v_action := null;
  else
    update private.comun_sidewalk_relata_intakes
      set review_state = 'withdrawn', reviewed_at = now(), updated_at = now()
      where id = v_intake.id;
    v_wallet_state := 'Retirado';
    v_action := null;
  end if;

  update private.comun_participation_wallet_items
    set presentation_state = v_wallet_state,
        action_required = v_action,
        metadata = metadata || jsonb_build_object(
          'sidewalkIntake', true,
          'sidewalkReviewState', case
            when p_decision = 'publish_approximate' then 'published'
            when p_decision = 'reject' then 'rejected'
            when p_decision = 'withdraw' then 'withdrawn'
            else 'needs_information'
          end
        ),
        updated_at = now()
    where item_type = 'relata_report'
      and subject_ref = v_intake.case_id::text
      and archived_at is null;

  return query
    select i.id, i.review_state, i.published_record_id
    from private.comun_sidewalk_relata_intakes i
    where i.id = v_intake.id;
end;
$$;

create or replace function private.comun_sidewalk_sync_relata_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_record_id uuid;
begin
  if old.state <> 'withdrawn' and new.state = 'withdrawn' then
    update private.comun_sidewalk_relata_intakes
      set review_state = 'withdrawn', reviewed_at = coalesce(reviewed_at, now()), updated_at = now()
      where case_id = new.id and review_state <> 'withdrawn'
      returning published_record_id into v_record_id;

    if v_record_id is not null then
      update public.comun_sidewalk_records
        set status = 'withdrawn', visibility = 'archived',
            public_geometry_geojson = null, updated_at = now()
        where id = v_record_id;
    end if;

    update private.comun_participation_wallet_items
      set presentation_state = 'Retirado', action_required = null,
          withdrawn_at = coalesce(withdrawn_at, now()), updated_at = now(),
          metadata = metadata || jsonb_build_object(
            'sidewalkIntake', true,
            'sidewalkReviewState', 'withdrawn'
          )
      where item_type = 'relata_report' and subject_ref = new.id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists comun_sidewalk_sync_relata_withdrawal on public.comun_relata_cases;
create trigger comun_sidewalk_sync_relata_withdrawal
after update of state on public.comun_relata_cases
for each row execute function private.comun_sidewalk_sync_relata_withdrawal();

revoke all on function private.comun_sidewalk_validate_text_array(text[],text[],integer) from public, anon, authenticated;
revoke all on function public.comun_sidewalk_intake_create(text,text,text,text[],text[]) from public, anon, authenticated;
revoke all on function public.comun_sidewalk_intake_finalize(text,text) from public, anon, authenticated;
revoke all on function public.comun_sidewalk_intake_admin_list(uuid) from public, anon, authenticated;
revoke all on function public.comun_sidewalk_intake_review(uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function private.comun_sidewalk_sync_relata_withdrawal() from public, anon, authenticated;

grant execute on function public.comun_sidewalk_intake_create(text,text,text,text[],text[]) to service_role;
grant execute on function public.comun_sidewalk_intake_finalize(text,text) to service_role;
grant execute on function public.comun_sidewalk_intake_admin_list(uuid) to service_role;
grant execute on function public.comun_sidewalk_intake_review(uuid,text,text,jsonb) to service_role;

comment on table private.comun_sidewalk_relata_intakes is
  'P4 adapter: Relata remains authoritative; no copied text, location, attachment path, or capability secret.';
comment on function public.comun_sidewalk_intake_review(uuid,text,text,jsonb) is
  'Server-only editorial decision. Publication accepts only an already-sanitized approximate point.';

commit;
