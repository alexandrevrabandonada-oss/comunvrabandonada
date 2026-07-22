-- Delta forward-only em ordem topológica original.
-- Não executar isoladamente; use run-pr23-reconciliation.mjs.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE DELETE, INSERT, SELECT, UPDATE ON TABLES FROM anon;;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT, USAGE ON SEQUENCES FROM anon;;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE DELETE, INSERT, SELECT, UPDATE ON TABLES FROM authenticated;;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT, USAGE ON SEQUENCES FROM authenticated;;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM authenticated;;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE DELETE, INSERT, SELECT, UPDATE ON TABLES FROM service_role;;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT, USAGE ON SEQUENCES FROM service_role;;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM service_role;;

ALTER TABLE public.comun_archive_assets DROP CONSTRAINT comun_archive_assets_asset_role_check;;

ALTER TABLE public.comun_archive_items DROP CONSTRAINT comun_archive_items_item_type_check;;

ALTER TABLE public.comun_archive_processing_jobs DROP CONSTRAINT comun_archive_processing_job_target_check;;

ALTER TABLE public.comun_archive_processing_jobs DROP CONSTRAINT comun_archive_processing_jobs_job_type_check;;

ALTER TABLE public.comun_member_inbox DROP CONSTRAINT comun_member_inbox_notification_type_check;;

ALTER TABLE public.comun_monitored_entities DROP CONSTRAINT comun_monitored_entities_entity_type_check;;

ALTER TABLE public.comun_pauta_spaces DROP CONSTRAINT comun_pauta_spaces_public_status_check;;

ALTER TABLE public.comun_pauta_timeline_events DROP CONSTRAINT comun_pauta_timeline_events_event_type_check;;

ALTER TABLE public.comun_territorial_contributions DROP CONSTRAINT comun_territorial_contributions_contribution_type_check;;

CREATE OR REPLACE FUNCTION public.claim_next_archive_processing_job(p_worker_id text)
 RETURNS SETOF public.comun_archive_processing_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
 select id into v_id from public.comun_archive_processing_jobs
 where status in ('queued','retry_scheduled') and available_at<=now()
 order by priority asc, created_at asc for update skip locked limit 1;
 if v_id is null then return; end if;
 update public.comun_archive_processing_jobs set status='processing', locked_at=now(), locked_by=left(p_worker_id,100), started_at=coalesce(started_at,now()), attempt_count=attempt_count+1, updated_at=now() where id=v_id;
 return query select * from public.comun_archive_processing_jobs where id=v_id;
end $function$;;

CREATE FUNCTION public.comun_guard_circle_contribution_round()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  round_circle_id uuid;
  round_status text;
begin
  select circle_id, status into round_circle_id, round_status
  from public.comun_construction_circle_rounds
  where id = new.round_id;
  if round_circle_id is null or round_circle_id <> new.circle_id then
    raise exception 'round_id must belong to circle_id';
  end if;
  if round_status <> 'open' then
    raise exception 'contributions require an open round';
  end if;
  return new;
end;
$function$;;

CREATE FUNCTION public.comun_guard_circle_synthesis_round()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  round_circle_id uuid;
begin
  select circle_id into round_circle_id
  from public.comun_construction_circle_rounds
  where id = new.round_id;
  if round_circle_id is null or round_circle_id <> new.circle_id then
    raise exception 'synthesis round_id must belong to circle_id';
  end if;
  return new;
end;
$function$;;

CREATE OR REPLACE FUNCTION public.comun_validate_consent_template()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare t public.comun_archive_consent_templates;
begin
  if new.template_id is null then raise exception 'Consentimento exige template versionado'; end if;
  select * into t from public.comun_archive_consent_templates where id=new.template_id;
  if t.status <> 'approved' or t.retired_at is not null then raise exception 'Template precisa estar aprovado e ativo'; end if;
  if new.template_version is distinct from t.version then raise exception 'Versão do consentimento diverge do template'; end if;
  return new;
end $function$;;

CREATE FUNCTION public.list_comun_operational_items(p_page integer DEFAULT 1, p_page_size integer DEFAULT 20, p_queue text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_priority smallint DEFAULT NULL::smallint, p_assigned_to uuid DEFAULT NULL::uuid, p_unassigned boolean DEFAULT false, p_pauta_id uuid DEFAULT NULL::uuid, p_territory_id uuid DEFAULT NULL::uuid, p_due_state text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_sort text DEFAULT 'urgent'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  safe_size integer := least(greatest(coalesce(p_page_size, 20), 1), 25);
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  total_items integer;
  total_pages integer;
  page_offset integer;
begin
  with filtered as materialized (
    select i.*, p.title as pauta_title, t.name as territory_name
    from public.comun_editorial_operation_items i
    left join public.comun_pauta_spaces p on p.id = i.pauta_id
    left join public.comun_hub_territories t on t.id = i.territory_id
    where (p_queue is null or i.queue = p_queue)
      and (p_status is null or i.state = p_status)
      and (p_priority is null or i.priority = p_priority)
      and (p_pauta_id is null or i.pauta_id = p_pauta_id)
      and (p_territory_id is null or i.territory_id = p_territory_id)
      and (p_source_type is null or i.source_type = p_source_type)
      and (p_assigned_to is null or exists (select 1 from public.comun_editorial_operation_assignments a where a.item_id = i.id and a.status = 'active' and a.assignee_profile_id = p_assigned_to))
      and (not coalesce(p_unassigned, false) or not exists (select 1 from public.comun_editorial_operation_assignments a where a.item_id = i.id and a.status = 'active'))
      and (p_due_state is null
        or (p_due_state = 'overdue' and i.indicative_due_at is not null and i.indicative_due_at < now())
        or (p_due_state = 'soon' and i.indicative_due_at is not null and i.indicative_due_at >= now() and i.indicative_due_at <= now() + interval '72 hours'))
      and (nullif(btrim(p_search), '') is null or concat_ws(' ', i.title, i.public_reason, i.next_action) ilike '%' || btrim(p_search) || '%')
  )
  select count(*) into total_items from filtered;

  total_pages := greatest(ceil(total_items::numeric / safe_size)::integer, 1);
  safe_page := least(safe_page, total_pages);
  page_offset := (safe_page - 1) * safe_size;

  return (
    with filtered as materialized (
      select i.*, p.title as pauta_title, t.name as territory_name
      from public.comun_editorial_operation_items i
      left join public.comun_pauta_spaces p on p.id = i.pauta_id
      left join public.comun_hub_territories t on t.id = i.territory_id
      where (p_queue is null or i.queue = p_queue)
        and (p_status is null or i.state = p_status)
        and (p_priority is null or i.priority = p_priority)
        and (p_pauta_id is null or i.pauta_id = p_pauta_id)
        and (p_territory_id is null or i.territory_id = p_territory_id)
        and (p_source_type is null or i.source_type = p_source_type)
        and (p_assigned_to is null or exists (select 1 from public.comun_editorial_operation_assignments a where a.item_id = i.id and a.status = 'active' and a.assignee_profile_id = p_assigned_to))
        and (not coalesce(p_unassigned, false) or not exists (select 1 from public.comun_editorial_operation_assignments a where a.item_id = i.id and a.status = 'active'))
        and (p_due_state is null
          or (p_due_state = 'overdue' and i.indicative_due_at is not null and i.indicative_due_at < now())
          or (p_due_state = 'soon' and i.indicative_due_at is not null and i.indicative_due_at >= now() and i.indicative_due_at <= now() + interval '72 hours'))
        and (nullif(btrim(p_search), '') is null or concat_ws(' ', i.title, i.public_reason, i.next_action) ilike '%' || btrim(p_search) || '%')
    ), ordered as (
      select * from filtered
      order by
        case when p_sort = 'urgent' and queue = 'withdrawals' then 0 else 1 end,
        case when p_sort = 'urgent' and indicative_due_at is not null and indicative_due_at < now() then 0 else 1 end,
        case when p_sort in ('urgent', 'priority') then priority end asc nulls last,
        case when p_sort in ('urgent', 'deadline') then indicative_due_at end asc nulls last,
        case when p_sort = 'oldest' then created_at end asc nulls last,
        case when p_sort = 'newest' then created_at end desc nulls last,
        case when p_sort = 'next_action' then lower(coalesce(next_action, '')) end asc nulls last,
        case when p_sort not in ('urgent', 'priority', 'deadline', 'oldest', 'newest', 'next_action') then created_at end asc nulls last,
        id asc
      limit safe_size offset page_offset
    ), queue_counts as (
      select coalesce(jsonb_object_agg(queue, total), '{}'::jsonb) as value
      from (select queue, count(*)::integer as total from filtered group by queue) counted
    )
    select jsonb_build_object(
      'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'queue', o.queue, 'state', o.state, 'title', o.title,
        'publicReason', o.public_reason, 'nextAction', o.next_action, 'priority', o.priority,
        'indicativeDueAt', o.indicative_due_at, 'humanGate', o.human_gate, 'sourceType', o.source_type,
        'pautaId', o.pauta_id, 'pautaTitle', o.pauta_title, 'territoryId', o.territory_id, 'territoryName', o.territory_name,
        'createdAt', o.created_at,
        'assignees', coalesce((select jsonb_agg(jsonb_build_object('id', ap.id, 'displayName', ap.display_name, 'role', a.role_at_assignment))
          from public.comun_editorial_operation_assignments a join public.comun_admin_profiles ap on ap.id = a.assignee_profile_id
          where a.item_id = o.id and a.status = 'active'), '[]'::jsonb)
      ) order by o.id) from ordered o), '[]'::jsonb),
      'pageInfo', jsonb_build_object('page', safe_page, 'pageSize', safe_size, 'totalItems', total_items, 'totalPages', total_pages, 'hasPrevious', safe_page > 1, 'hasNext', safe_page < total_pages),
      'queueCounts', (select value from queue_counts),
      'totalGeneral', (select count(*)::integer from public.comun_editorial_operation_items)
    )
  );
end;
$function$;;

GRANT ALL ON FUNCTION public.list_comun_operational_items(integer, integer, text, text, smallint, uuid, boolean, uuid, uuid, text, text, text, text) TO service_role;;

CREATE OR REPLACE FUNCTION public.set_comun_official_protocols_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;;

REVOKE DELETE, SELECT, UPDATE ON public.comun_actions FROM anon;;

REVOKE DELETE, SELECT, UPDATE ON public.comun_actions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_admin_alerts FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_admin_alerts FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_admin_audit_log FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_admin_audit_log FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_admin_notifications FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_admin_notifications FROM authenticated;;

ALTER TABLE public.comun_admin_profiles ADD COLUMN operational_role text;;

ALTER TABLE public.comun_admin_profiles ADD CONSTRAINT comun_admin_profiles_operational_role_check CHECK (operational_role IS NULL OR (operational_role = ANY (ARRAY['operations_admin'::text, 'privacy_reviewer'::text, 'rights_reviewer'::text, 'archive_curator'::text, 'coordinator'::text, 'facilitator'::text, 'contribution_reviewer'::text, 'image_reviewer'::text, 'protocol_operator'::text, 'result_editor'::text, 'radio_editor'::text, 'art_editor'::text])));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_admin_profiles FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_admin_profiles FROM authenticated;;

CREATE INDEX comun_admin_profiles_operational_role_idx ON public.comun_admin_profiles (operational_role) WHERE active;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_admin_users FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_admin_users FROM authenticated;;

CREATE TABLE public.comun_archive_agents (id uuid DEFAULT gen_random_uuid() NOT NULL, agent_type text NOT NULL, public_name text NOT NULL, public_slug text, public_bio text, territory_id uuid, member_user_id uuid, public_visibility text DEFAULT 'private'::text NOT NULL, status text DEFAULT 'draft'::text NOT NULL, private_contact text, private_notes text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

COMMENT ON COLUMN public.comun_archive_agents.member_user_id IS 'Private auth linkage; never expose in public HTML.';;

COMMENT ON COLUMN public.comun_archive_agents.private_contact IS 'Private server-only contact; never expose in public queries.';;

ALTER TABLE public.comun_archive_agents ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_agents ADD CONSTRAINT comun_archive_agents_agent_type_check CHECK (agent_type = ANY (ARRAY['person'::text, 'collective'::text, 'organization'::text, 'anonymous'::text, 'unknown'::text, 'traditional_community'::text]));;

ALTER TABLE public.comun_archive_agents ADD CONSTRAINT comun_archive_agents_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_archive_agents ADD CONSTRAINT comun_archive_agents_public_slug_key UNIQUE (public_slug);;

ALTER TABLE public.comun_archive_agents ADD CONSTRAINT comun_archive_agents_public_visibility_check CHECK (public_visibility = ANY (ARRAY['private'::text, 'public'::text]));;

ALTER TABLE public.comun_archive_agents ADD CONSTRAINT comun_archive_agents_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'approved'::text, 'published'::text, 'unpublished'::text, 'archived'::text]));;

ALTER TABLE public.comun_archive_agents ADD CONSTRAINT comun_archive_agents_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

GRANT ALL ON public.comun_archive_agents TO service_role;;

CREATE INDEX comun_archive_agents_public_idx ON public.comun_archive_agents (status, public_visibility, public_name);;

CREATE TRIGGER comun_archive_agents_updated_at BEFORE UPDATE ON public.comun_archive_agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_artist_claims FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_artist_claims FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_artist_memberships FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_artist_memberships FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_artist_profiles FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_artist_profiles FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_artist_submissions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_artist_submissions FROM authenticated;;

CREATE TABLE public.comun_archive_artwork_credits (id uuid DEFAULT gen_random_uuid() NOT NULL, archive_item_id uuid NOT NULL, agent_id uuid, credit_role text NOT NULL, public_credit text NOT NULL, "position" integer DEFAULT 0 NOT NULL, public_visibility text DEFAULT 'public'::text NOT NULL, source_public text, private_notes text, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_archive_artwork_credits ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_artwork_credits ADD CONSTRAINT comun_archive_artwork_credits_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.comun_archive_agents(id) ON DELETE RESTRICT;;

ALTER TABLE public.comun_archive_artwork_credits ADD CONSTRAINT comun_archive_artwork_credits_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_archive_artwork_credits ADD CONSTRAINT comun_archive_artwork_credits_credit_role_check CHECK (credit_role = ANY (ARRAY['creator'::text, 'co_creator'::text, 'collective'::text, 'photographer'::text, 'designer'::text, 'illustrator'::text, 'writer'::text, 'printer'::text, 'performer'::text, 'curator'::text, 'restorer'::text, 'donor'::text, 'rights_holder'::text, 'unknown_creator'::text]));;

ALTER TABLE public.comun_archive_artwork_credits ADD CONSTRAINT comun_archive_artwork_credits_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_archive_artwork_credits ADD CONSTRAINT comun_archive_artwork_credits_public_visibility_check CHECK (public_visibility = ANY (ARRAY['public'::text, 'private'::text]));;

GRANT ALL ON public.comun_archive_artwork_credits TO service_role;;

CREATE INDEX comun_archive_artwork_credits_item_idx ON public.comun_archive_artwork_credits (archive_item_id, "position");;

CREATE TABLE public.comun_archive_artwork_editorial_versions (id uuid DEFAULT gen_random_uuid() NOT NULL, archive_item_id uuid NOT NULL, version_number integer NOT NULL, sanitized_snapshot jsonb NOT NULL, change_type text NOT NULL, created_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_archive_artwork_editorial_versions ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_artwork_editorial_versions ADD CONSTRAINT comun_archive_artwork_editori_archive_item_id_version_numbe_key UNIQUE (archive_item_id, version_number);;

ALTER TABLE public.comun_archive_artwork_editorial_versions ADD CONSTRAINT comun_archive_artwork_editorial_versions_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_archive_artwork_editorial_versions ADD CONSTRAINT comun_archive_artwork_editorial_versions_pkey PRIMARY KEY (id);;

GRANT ALL ON public.comun_archive_artwork_editorial_versions TO service_role;;

CREATE TABLE public.comun_archive_artwork_relations (id uuid DEFAULT gen_random_uuid() NOT NULL, archive_item_id uuid NOT NULL, relation_type text NOT NULL, target_type text NOT NULL, target_id uuid NOT NULL, public_note text, internal_note text, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_archive_artwork_relations ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_artwork_relations ADD CONSTRAINT comun_archive_artwork_relatio_archive_item_id_relation_type_key UNIQUE (archive_item_id, relation_type, target_type, target_id);;

ALTER TABLE public.comun_archive_artwork_relations ADD CONSTRAINT comun_archive_artwork_relations_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_archive_artwork_relations ADD CONSTRAINT comun_archive_artwork_relations_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_archive_artwork_relations ADD CONSTRAINT comun_archive_artwork_relations_relation_type_check CHECK (relation_type = ANY (ARRAY['artwork_documents_pauta'::text, 'artwork_created_for_action'::text, 'artwork_related_to_territory'::text, 'artwork_historical_context'::text, 'artwork_related_to_project'::text, 'artwork_used_in_campaign'::text, 'artwork_related_to_event'::text, 'artwork_inspired_by_testimony'::text, 'artwork_future_radio_feature'::text]));;

ALTER TABLE public.comun_archive_artwork_relations ADD CONSTRAINT comun_archive_artwork_relations_target_type_check CHECK (target_type = ANY (ARRAY['archive_item'::text, 'pauta'::text, 'project'::text, 'territory'::text, 'action'::text, 'result'::text, 'report'::text, 'event'::text, 'dossier'::text, 'document'::text, 'historical_photo'::text, 'musical_artist'::text, 'oral_history'::text, 'sidewalk_record'::text]));;

GRANT ALL ON public.comun_archive_artwork_relations TO service_role;;

CREATE INDEX comun_archive_artwork_relations_target_idx ON public.comun_archive_artwork_relations (target_type, target_id, relation_type);;

CREATE TABLE public.comun_archive_artwork_rights (id uuid DEFAULT gen_random_uuid() NOT NULL, archive_item_id uuid NOT NULL, rights_holder_agent_id uuid, consent_status text DEFAULT 'pending'::text NOT NULL, allow_private_preservation boolean DEFAULT false NOT NULL, allow_comun_display boolean DEFAULT false NOT NULL, allow_social_media boolean DEFAULT false NOT NULL, allow_print boolean DEFAULT false NOT NULL, allow_exhibition boolean DEFAULT false NOT NULL, allow_educational_use boolean DEFAULT false NOT NULL, allow_campaign_use boolean DEFAULT false NOT NULL, allow_crop boolean DEFAULT false NOT NULL, allow_derivative_use boolean DEFAULT false NOT NULL, allow_download boolean DEFAULT false NOT NULL, allow_third_party_reuse boolean DEFAULT false NOT NULL, required_credit_public text, license_public text, valid_from date, valid_until date, embargo_until timestamp with time zone, withdrawal_requested_at timestamp with time zone, withdrawal_completed_at timestamp with time zone, evidence_asset_id uuid, private_notes text, reviewed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

COMMENT ON COLUMN public.comun_archive_artwork_rights.private_notes IS 'Private rights evidence notes.';;

ALTER TABLE public.comun_archive_artwork_rights ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_artwork_rights ADD CONSTRAINT comun_archive_artwork_rights_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_archive_artwork_rights ADD CONSTRAINT comun_archive_artwork_rights_archive_item_id_key UNIQUE (archive_item_id);;

ALTER TABLE public.comun_archive_artwork_rights ADD CONSTRAINT comun_archive_artwork_rights_check CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from);;

ALTER TABLE public.comun_archive_artwork_rights ADD CONSTRAINT comun_archive_artwork_rights_consent_status_check CHECK (consent_status = ANY (ARRAY['pending'::text, 'information_requested'::text, 'granted'::text, 'partially_granted'::text, 'denied'::text, 'expired'::text, 'withdrawn'::text]));;

ALTER TABLE public.comun_archive_artwork_rights ADD CONSTRAINT comun_archive_artwork_rights_evidence_asset_id_fkey FOREIGN KEY (evidence_asset_id) REFERENCES public.comun_archive_assets(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_archive_artwork_rights ADD CONSTRAINT comun_archive_artwork_rights_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_archive_artwork_rights ADD CONSTRAINT comun_archive_artwork_rights_rights_holder_agent_id_fkey FOREIGN KEY (rights_holder_agent_id) REFERENCES public.comun_archive_agents(id) ON DELETE SET NULL;;

GRANT ALL ON public.comun_archive_artwork_rights TO service_role;;

CREATE TRIGGER comun_archive_artwork_rights_updated_at BEFORE UPDATE ON public.comun_archive_artwork_rights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_archive_artwork_safety_reviews (id uuid DEFAULT gen_random_uuid() NOT NULL, archive_item_id uuid NOT NULL, creator_minor_private boolean DEFAULT false NOT NULL, depicted_minor_private boolean DEFAULT false NOT NULL, identifiable_people_private boolean DEFAULT false NOT NULL, appropriate_authorization_confirmed boolean DEFAULT false NOT NULL, sensitive_location_private boolean DEFAULT false NOT NULL, reinforced_review_status text DEFAULT 'not_required'::text NOT NULL, private_notes text, reviewed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_archive_artwork_safety_reviews ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_artwork_safety_reviews ADD CONSTRAINT comun_archive_artwork_safety_rev_reinforced_review_status_check CHECK (reinforced_review_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'approved'::text, 'rejected'::text]));;

ALTER TABLE public.comun_archive_artwork_safety_reviews ADD CONSTRAINT comun_archive_artwork_safety_reviews_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_archive_artwork_safety_reviews ADD CONSTRAINT comun_archive_artwork_safety_reviews_archive_item_id_key UNIQUE (archive_item_id);;

ALTER TABLE public.comun_archive_artwork_safety_reviews ADD CONSTRAINT comun_archive_artwork_safety_reviews_pkey PRIMARY KEY (id);;

GRANT ALL ON public.comun_archive_artwork_safety_reviews TO service_role;;

CREATE TRIGGER comun_archive_artwork_safety_reviews_updated_at BEFORE UPDATE ON public.comun_archive_artwork_safety_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_archive_artwork_submissions (id uuid DEFAULT gen_random_uuid() NOT NULL, archive_item_id uuid, member_user_id uuid, public_protocol text NOT NULL, submission_kind text NOT NULL, title_suggestion text NOT NULL, artwork_type text NOT NULL, context_suggestion text, territory_id uuid, creator_credit_suggestion text NOT NULL, authorship_source text, private_contact text, information_request_public text, next_action_public text, status text DEFAULT 'pending'::text NOT NULL, is_author_or_authorized boolean DEFAULT false NOT NULL, information_true_declared boolean DEFAULT false NOT NULL, moderation_understood boolean DEFAULT false NOT NULL, correction_withdrawal_understood boolean DEFAULT false NOT NULL, internal_notes text, submitter_hash text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, reviewed_at timestamp with time zone);;

COMMENT ON COLUMN public.comun_archive_artwork_submissions.private_contact IS 'Private contributor contact.';;

ALTER TABLE public.comun_archive_artwork_submissions ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_artwork_submissions ADD CONSTRAINT comun_archive_artwork_submissions_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_archive_artwork_submissions ADD CONSTRAINT comun_archive_artwork_submissions_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_archive_artwork_submissions ADD CONSTRAINT comun_archive_artwork_submissions_public_protocol_key UNIQUE (public_protocol);;

ALTER TABLE public.comun_archive_artwork_submissions ADD CONSTRAINT comun_archive_artwork_submissions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'information_requested'::text, 'rights_review'::text, 'editorial_review'::text, 'processing'::text, 'approved'::text, 'partially_approved'::text, 'rejected'::text, 'published'::text, 'withdrawn'::text, 'archived'::text]));;

ALTER TABLE public.comun_archive_artwork_submissions ADD CONSTRAINT comun_archive_artwork_submissions_submission_kind_check CHECK (submission_kind = ANY (ARRAY['own_work'::text, 'collective_work'::text, 'authorized_submission'::text, 'unknown_authorship'::text, 'existing_work_complement'::text, 'credit_correction'::text]));;

ALTER TABLE public.comun_archive_artwork_submissions ADD CONSTRAINT comun_archive_artwork_submissions_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

GRANT ALL ON public.comun_archive_artwork_submissions TO service_role;;

CREATE INDEX comun_archive_artwork_submissions_member_idx ON public.comun_archive_artwork_submissions (member_user_id, created_at DESC) WHERE member_user_id IS NOT NULL;;

CREATE TRIGGER comun_archive_artwork_submissions_updated_at BEFORE UPDATE ON public.comun_archive_artwork_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_archive_artworks (archive_item_id uuid NOT NULL, artwork_type text NOT NULL, title_public text NOT NULL, subtitle_public text, description_public text, context_public text, creation_date date, creation_year integer, creation_period_public text, creation_date_approximate boolean DEFAULT false NOT NULL, technique_public text, materials_public text[] DEFAULT '{}'::text[] NOT NULL, dimensions_public text, territory_id uuid, creation_place_public text, creation_place_private text, current_location_public text, current_location_private text, edition_information_public text, creation_process text DEFAULT 'human_created'::text NOT NULL, ai_assistance_disclosure_public text, publication_status text DEFAULT 'draft'::text NOT NULL, sensitivity_level text DEFAULT 'normal'::text NOT NULL, territory_absence_reason text, long_description_public text, updated_at timestamp with time zone DEFAULT now() NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);;

COMMENT ON COLUMN public.comun_archive_artworks.creation_place_private IS 'Private precise creation location.';;

ALTER TABLE public.comun_archive_artworks ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_artworks ADD CONSTRAINT comun_archive_artworks_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_archive_artworks ADD CONSTRAINT comun_archive_artworks_artwork_type_check CHECK (artwork_type = ANY (ARRAY['drawing'::text, 'painting'::text, 'collage'::text, 'poster'::text, 'photography'::text, 'graffiti'::text, 'mural'::text, 'sculpture'::text, 'installation'::text, 'comic'::text, 'illustration'::text, 'digital_art'::text, 'textile'::text, 'craft'::text, 'printmaking'::text, 'performance_record'::text, 'poetry_visual'::text, 'mixed_media'::text, 'other'::text]));;

ALTER TABLE public.comun_archive_artworks ADD CONSTRAINT comun_archive_artworks_creation_process_check CHECK (creation_process = ANY (ARRAY['human_created'::text, 'digital_tools'::text, 'ai_assisted_disclosed'::text, 'collective_process'::text, 'traditional_process'::text, 'unknown'::text]));;

ALTER TABLE public.comun_archive_artworks ADD CONSTRAINT comun_archive_artworks_creation_year_check CHECK (creation_year IS NULL OR creation_year >= 1000 AND creation_year <= 2200);;

ALTER TABLE public.comun_archive_artworks ADD CONSTRAINT comun_archive_artworks_pkey PRIMARY KEY (archive_item_id);;

ALTER TABLE public.comun_archive_artworks ADD CONSTRAINT comun_archive_artworks_publication_status_check CHECK (publication_status = ANY (ARRAY['draft'::text, 'rights_review'::text, 'editorial_review'::text, 'approved'::text, 'published'::text, 'withdrawn'::text, 'archived'::text]));;

ALTER TABLE public.comun_archive_artworks ADD CONSTRAINT comun_archive_artworks_sensitivity_level_check CHECK (sensitivity_level = ANY (ARRAY['normal'::text, 'attention'::text, 'restricted'::text]));;

ALTER TABLE public.comun_archive_artworks ADD CONSTRAINT comun_archive_artworks_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

GRANT ALL ON public.comun_archive_artworks TO service_role;;

CREATE INDEX comun_archive_artworks_public_idx ON public.comun_archive_artworks (publication_status, territory_id, artwork_type, created_at DESC);;

CREATE TRIGGER comun_archive_artworks_updated_at BEFORE UPDATE ON public.comun_archive_artworks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_asset_custody_events FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_asset_custody_events FROM authenticated;;

ALTER TABLE public.comun_archive_assets ADD CONSTRAINT comun_archive_assets_asset_role_check CHECK (asset_role = ANY (ARRAY['original'::text, 'public_version'::text, 'thumbnail'::text, 'cover'::text, 'transcript'::text, 'attachment'::text, 'artwork_private_original'::text, 'artwork_public_detail'::text, 'artwork_public_card'::text, 'artwork_public_thumbnail'::text, 'artwork_public_social_preview'::text, 'artwork_rights_document'::text, 'artwork_context_document'::text, 'artwork_process_photo'::text, 'radio_private_original'::text, 'radio_public_episode'::text, 'radio_public_preview'::text, 'radio_waveform'::text, 'radio_transcript_document'::text, 'radio_voice_consent_document'::text, 'radio_music_rights_document'::text, 'radio_cover_derivative'::text, 'radio_context_document'::text]));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_assets FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_assets FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_collection_items FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_collection_items FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_collections FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_collections FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_consent_legal_reviews FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_consent_legal_reviews FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_consent_templates FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_consent_templates FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_external_links FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_external_links FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_campaigns FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_campaigns FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_editorial_log FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_editorial_log FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_items FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_items FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_reports FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_reports FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_summaries FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_identification_summaries FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_item_suggestions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_item_suggestions FROM authenticated;;

ALTER TABLE public.comun_archive_items ADD CONSTRAINT comun_archive_items_item_type_check CHECK (item_type = ANY (ARRAY['photograph'::text, 'document'::text, 'place'::text, 'artist'::text, 'music_release'::text, 'oral_history'::text, 'video'::text, 'poster'::text, 'newspaper'::text, 'territorial_artwork'::text, 'community_radio_program'::text, 'community_radio_episode'::text, 'community_radio_clip'::text, 'other'::text]));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_items FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_items FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_link_checks FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_link_checks FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_music_editorial_versions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_music_editorial_versions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_music_releases FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_music_releases FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_music_rights_reviews FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_music_rights_reviews FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_music_tracks FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_music_tracks FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_histories FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_histories FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_consent_sessions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_consent_sessions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_consents FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_consents FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_editorial_versions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_editorial_versions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_interview_plans FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_interview_plans FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_participant_approvals FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_participant_approvals FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_participants FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_participants FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_segments FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_segments FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_suggestions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_suggestions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_third_party_statements FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_third_party_statements FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_transcript_versions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_transcript_versions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_transcription_work FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_transcription_work FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_withdrawals FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_oral_history_withdrawals FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_processing_attempts FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_processing_attempts FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_processing_events FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_processing_events FROM authenticated;;

ALTER TABLE public.comun_archive_processing_jobs ADD CONSTRAINT comun_archive_processing_job_target_check CHECK ((job_type = ANY (ARRAY['historical_photo_derivatives'::text, 'territorial_artwork_derivatives'::text, 'community_radio_audio'::text])) AND archive_asset_id IS NOT NULL OR job_type = 'music_external_link_check'::text AND external_link_id IS NOT NULL);;

ALTER TABLE public.comun_archive_processing_jobs ADD CONSTRAINT comun_archive_processing_jobs_job_type_check CHECK (job_type = ANY (ARRAY['historical_photo_derivatives'::text, 'music_external_link_check'::text, 'territorial_artwork_derivatives'::text, 'community_radio_audio'::text]));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_processing_jobs FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_processing_jobs FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_relations FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_relations FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_rights_removal_requests FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_rights_removal_requests FROM authenticated;;

CREATE TABLE public.comun_archive_storage_uploads (id uuid DEFAULT gen_random_uuid() NOT NULL, archive_item_id uuid, submission_id uuid, idempotency_key text NOT NULL, bucket_id text NOT NULL, object_key text NOT NULL, original_filename text NOT NULL, declared_mime text NOT NULL, declared_size bigint NOT NULL, state text DEFAULT 'waiting_file'::text NOT NULL, expires_at timestamp with time zone DEFAULT (now() + '00:30:00'::interval) NOT NULL, failure_code text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_archive_storage_uploads ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_bucket_id_check CHECK (bucket_id = 'archive-private-originals'::text);;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_check CHECK (((archive_item_id IS NOT NULL)::integer + (submission_id IS NOT NULL)::integer) = 1);;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_declared_size_check CHECK (declared_size >= 1 AND declared_size <= 31457280);;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_idempotency_key_key UNIQUE (idempotency_key);;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_object_key_key UNIQUE (object_key);;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_state_check CHECK (state = ANY (ARRAY['waiting_file'::text, 'uploading'::text, 'confirming'::text, 'validating'::text, 'processing'::text, 'ready_for_review'::text, 'failed'::text, 'removed'::text]));;

ALTER TABLE public.comun_archive_storage_uploads ADD CONSTRAINT comun_archive_storage_uploads_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.comun_archive_artwork_submissions(id) ON DELETE CASCADE;;

GRANT ALL ON public.comun_archive_storage_uploads TO service_role;;

CREATE INDEX comun_archive_storage_uploads_expiry_idx ON public.comun_archive_storage_uploads (state, expires_at);;

CREATE TRIGGER comun_archive_storage_uploads_updated_at BEFORE UPDATE ON public.comun_archive_storage_uploads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_submission_assets FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_submission_assets FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_submissions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_submissions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_worker_heartbeats FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_archive_worker_heartbeats FROM authenticated;;

CREATE TABLE public.comun_circle_contributions (id uuid DEFAULT gen_random_uuid() NOT NULL, circle_id uuid NOT NULL, round_id uuid NOT NULL, contribution_type text NOT NULL, public_body text NOT NULL, private_contact text, author_display_name text, author_member_id uuid, anonymous_publication boolean DEFAULT false NOT NULL, related_evidence_id uuid, related_proposal_id uuid, status text DEFAULT 'pending'::text NOT NULL, moderation_note_private text, public_protocol text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_circle_contributions ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_circle_contributions ADD CONSTRAINT comun_circle_contributions_contribution_type_check CHECK (contribution_type = ANY (ARRAY['testimony'::text, 'question'::text, 'evidence'::text, 'correction'::text, 'proposal'::text, 'counterpoint'::text, 'task_offer'::text, 'support_offer'::text, 'update'::text, 'memory'::text]));;

ALTER TABLE public.comun_circle_contributions ADD CONSTRAINT comun_circle_contributions_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_circle_contributions ADD CONSTRAINT comun_circle_contributions_public_body_check CHECK (char_length(public_body) >= 3 AND char_length(public_body) <= 6000);;

ALTER TABLE public.comun_circle_contributions ADD CONSTRAINT comun_circle_contributions_public_protocol_key UNIQUE (public_protocol);;

ALTER TABLE public.comun_circle_contributions ADD CONSTRAINT comun_circle_contributions_related_evidence_id_fkey FOREIGN KEY (related_evidence_id) REFERENCES public.comun_pauta_evidence_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_circle_contributions ADD CONSTRAINT comun_circle_contributions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'visible'::text, 'restricted'::text, 'rejected'::text, 'incorporated'::text, 'archived'::text]));;

GRANT ALL ON public.comun_circle_contributions TO service_role;;

CREATE INDEX comun_circle_contributions_public ON public.comun_circle_contributions (round_id, contribution_type) WHERE status = ANY (ARRAY['visible'::text, 'incorporated'::text]);;

CREATE TRIGGER comun_circle_contributions_round_guard BEFORE INSERT OR UPDATE OF circle_id, round_id ON public.comun_circle_contributions FOR EACH ROW EXECUTE FUNCTION public.comun_guard_circle_contribution_round();;

CREATE TABLE public.comun_circle_syntheses (id uuid DEFAULT gen_random_uuid() NOT NULL, circle_id uuid NOT NULL, round_id uuid NOT NULL, public_summary text NOT NULL, agreements text[] DEFAULT '{}'::text[] NOT NULL, disagreements text[] DEFAULT '{}'::text[] NOT NULL, open_questions text[] DEFAULT '{}'::text[] NOT NULL, missing_evidence text[] DEFAULT '{}'::text[] NOT NULL, proposed_next_steps text[] DEFAULT '{}'::text[] NOT NULL, status text DEFAULT 'draft'::text NOT NULL, reviewed_by text, published_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, snapshot_id uuid);;

ALTER TABLE public.comun_circle_syntheses ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_circle_syntheses ADD CONSTRAINT comun_circle_syntheses_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_circle_syntheses ADD CONSTRAINT comun_circle_syntheses_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.comun_metric_snapshots(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_circle_syntheses ADD CONSTRAINT comun_circle_syntheses_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'superseded'::text, 'archived'::text]));;

GRANT ALL ON public.comun_circle_syntheses TO service_role;;

CREATE TRIGGER comun_circle_syntheses_round_guard BEFORE INSERT OR UPDATE OF circle_id, round_id ON public.comun_circle_syntheses FOR EACH ROW EXECUTE FUNCTION public.comun_guard_circle_synthesis_round();;

CREATE TABLE public.comun_circle_synthesis_links (id uuid DEFAULT gen_random_uuid() NOT NULL, synthesis_id uuid NOT NULL, target_type text NOT NULL, target_id uuid, target_label text NOT NULL, public_note text, confirmed_by text, confirmed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_circle_synthesis_links ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_circle_synthesis_links ADD CONSTRAINT comun_circle_synthesis_links_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_circle_synthesis_links ADD CONSTRAINT comun_circle_synthesis_links_synthesis_id_fkey FOREIGN KEY (synthesis_id) REFERENCES public.comun_circle_syntheses(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_circle_synthesis_links ADD CONSTRAINT comun_circle_synthesis_links_target_type_check CHECK (target_type = ANY (ARRAY['action'::text, 'task'::text, 'proposal'::text, 'evidence'::text, 'official_protocol'::text, 'update'::text, 'snapshot'::text]));;

GRANT ALL ON public.comun_circle_synthesis_links TO service_role;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_collection_route_materials FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_collection_route_materials FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_collection_routes FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_collection_routes FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_communities FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_communities FROM authenticated;;

CREATE TABLE public.comun_community_audit_log (id uuid DEFAULT gen_random_uuid() NOT NULL, community_id uuid NOT NULL, member_user_id uuid, actor_user_id uuid, event_type text NOT NULL, prior_state text, next_state text, metadata jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_community_audit_log ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_community_audit_log ADD CONSTRAINT comun_community_audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_community_audit_log ADD CONSTRAINT comun_community_audit_log_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.comun_communities(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_community_audit_log ADD CONSTRAINT comun_community_audit_log_event_type_check CHECK (event_type = ANY (ARRAY['followed'::text, 'preferences_changed'::text, 'membership_requested'::text, 'membership_approved'::text, 'paused'::text, 'resumed'::text, 'left'::text, 'suspended'::text, 'role_granted'::text, 'role_revoked'::text, 'group_joined'::text, 'group_left'::text]));;

ALTER TABLE public.comun_community_audit_log ADD CONSTRAINT comun_community_audit_log_member_user_id_fkey FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_community_audit_log ADD CONSTRAINT comun_community_audit_log_metadata_check CHECK (jsonb_typeof(metadata) = 'object'::text AND pg_column_size(metadata) <= 4096);;

ALTER TABLE public.comun_community_audit_log ADD CONSTRAINT comun_community_audit_log_pkey PRIMARY KEY (id);;

GRANT ALL ON public.comun_community_audit_log TO service_role;;

CREATE INDEX comun_community_audit_community_created_idx ON public.comun_community_audit_log (community_id, created_at DESC);;

CREATE TABLE public.comun_community_memberships (id uuid DEFAULT gen_random_uuid() NOT NULL, community_id uuid NOT NULL, member_user_id uuid NOT NULL, state text DEFAULT 'following'::text NOT NULL, collaboration_preferences text[] DEFAULT '{}'::text[] NOT NULL, update_preferences text[] DEFAULT '{}'::text[] NOT NULL, joined_at timestamp with time zone, paused_at timestamp with time zone, left_at timestamp with time zone, suspended_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_community_memberships ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_community_memberships ADD CONSTRAINT comun_community_memberships_collaboration_preferences_check CHECK (collaboration_preferences <@ ARRAY['circles'::text, 'actions'::text, 'research'::text, 'art'::text, 'radio'::text, 'communication'::text, 'territory'::text]);;

ALTER TABLE public.comun_community_memberships ADD CONSTRAINT comun_community_memberships_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.comun_communities(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_community_memberships ADD CONSTRAINT comun_community_memberships_community_id_member_user_id_key UNIQUE (community_id, member_user_id);;

ALTER TABLE public.comun_community_memberships ADD CONSTRAINT comun_community_memberships_member_user_id_fkey FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_community_memberships ADD CONSTRAINT comun_community_memberships_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_community_memberships ADD CONSTRAINT comun_community_memberships_state_check CHECK (state = ANY (ARRAY['following'::text, 'member'::text, 'paused'::text, 'left'::text, 'suspended'::text]));;

ALTER TABLE public.comun_community_memberships ADD CONSTRAINT comun_community_memberships_update_preferences_check CHECK (update_preferences <@ ARRAY['pautas'::text, 'circles'::text, 'activities'::text, 'results'::text, 'memory'::text, 'art'::text, 'radio'::text]);;

GRANT SELECT ON public.comun_community_memberships TO authenticated;;

GRANT ALL ON public.comun_community_memberships TO service_role;;

CREATE INDEX comun_community_memberships_member_state_idx ON public.comun_community_memberships (member_user_id, state);;

CREATE INDEX comun_community_memberships_community_state_idx ON public.comun_community_memberships (community_id, state) WHERE state = ANY (ARRAY['following'::text, 'member'::text, 'paused'::text]);;

CREATE TRIGGER comun_community_memberships_updated_at BEFORE UPDATE ON public.comun_community_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE POLICY "Members read only their own community links" ON public.comun_community_memberships FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = member_user_id));;

CREATE TABLE public.comun_community_role_assignments (id uuid DEFAULT gen_random_uuid() NOT NULL, membership_id uuid NOT NULL, role text NOT NULL, scope text DEFAULT 'community'::text NOT NULL, granted_by uuid, starts_at timestamp with time zone DEFAULT now() NOT NULL, review_at timestamp with time zone, revoked_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_community_role_assignments ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_community_role_assignments ADD CONSTRAINT comun_community_role_assignments_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_community_role_assignments ADD CONSTRAINT comun_community_role_assignments_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.comun_community_memberships(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_community_role_assignments ADD CONSTRAINT comun_community_role_assignments_membership_id_role_scope_key UNIQUE (membership_id, role, scope);;

ALTER TABLE public.comun_community_role_assignments ADD CONSTRAINT comun_community_role_assignments_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_community_role_assignments ADD CONSTRAINT comun_community_role_assignments_role_check CHECK (role = ANY (ARRAY['coordinator'::text, 'facilitator'::text, 'curator'::text, 'community_editor'::text, 'field_observer'::text]));;

GRANT SELECT ON public.comun_community_role_assignments TO authenticated;;

GRANT ALL ON public.comun_community_role_assignments TO service_role;;

CREATE INDEX comun_community_roles_active_idx ON public.comun_community_role_assignments (membership_id, role) WHERE revoked_at IS NULL;;

CREATE POLICY "Members read only their own active community roles" ON public.comun_community_role_assignments FOR SELECT TO authenticated USING (((revoked_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.comun_community_memberships m
  WHERE ((m.id = comun_community_role_assignments.membership_id) AND (m.member_user_id = ( SELECT auth.uid() AS uid)) AND (m.state = 'member'::text))))));;

CREATE TABLE public.comun_community_work_group_members (group_id uuid NOT NULL, membership_id uuid NOT NULL, responsibility text NOT NULL, joined_at timestamp with time zone DEFAULT now() NOT NULL, left_at timestamp with time zone);;

ALTER TABLE public.comun_community_work_group_members ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_community_work_group_members ADD CONSTRAINT comun_community_work_group_members_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.comun_community_memberships(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_community_work_group_members ADD CONSTRAINT comun_community_work_group_members_pkey PRIMARY KEY (group_id, membership_id);;

GRANT ALL ON public.comun_community_work_group_members TO service_role;;

CREATE TABLE public.comun_community_work_group_tasks (group_id uuid NOT NULL, task_id uuid NOT NULL);;

ALTER TABLE public.comun_community_work_group_tasks ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_community_work_group_tasks ADD CONSTRAINT comun_community_work_group_tasks_pkey PRIMARY KEY (group_id, task_id);;

ALTER TABLE public.comun_community_work_group_tasks ADD CONSTRAINT comun_community_work_group_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.comun_pauta_tasks(id) ON DELETE CASCADE;;

GRANT SELECT ON public.comun_community_work_group_tasks TO anon;;

GRANT SELECT ON public.comun_community_work_group_tasks TO authenticated;;

GRANT ALL ON public.comun_community_work_group_tasks TO service_role;;

CREATE TABLE public.comun_community_work_groups (id uuid DEFAULT gen_random_uuid() NOT NULL, community_id uuid NOT NULL, pauta_id uuid NOT NULL, name text NOT NULL, objective text NOT NULL, cycle_label text NOT NULL, next_action text, result_expected text NOT NULL, state text DEFAULT 'proposed'::text NOT NULL, starts_at timestamp with time zone, ends_at timestamp with time zone, completed_at timestamp with time zone, memory_url text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

CREATE POLICY "Public reads tasks linked to visible work groups" ON public.comun_community_work_group_tasks FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM public.comun_community_work_groups g
  WHERE ((g.id = comun_community_work_group_tasks.group_id) AND (g.state = ANY (ARRAY['active'::text, 'completed'::text]))))));;

ALTER TABLE public.comun_community_work_groups ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_community_work_groups ADD CONSTRAINT comun_community_work_groups_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.comun_communities(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_community_work_groups ADD CONSTRAINT comun_community_work_groups_memory_url_check CHECK (memory_url IS NULL OR memory_url ~~ '/comun/%'::text);;

ALTER TABLE public.comun_community_work_groups ADD CONSTRAINT comun_community_work_groups_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE RESTRICT;;

ALTER TABLE public.comun_community_work_groups ADD CONSTRAINT comun_community_work_groups_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_community_work_group_members ADD CONSTRAINT comun_community_work_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.comun_community_work_groups(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_community_work_group_tasks ADD CONSTRAINT comun_community_work_group_tasks_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.comun_community_work_groups(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_community_work_groups ADD CONSTRAINT comun_community_work_groups_state_check CHECK (state = ANY (ARRAY['proposed'::text, 'active'::text, 'paused'::text, 'completed'::text, 'archived'::text]));;

GRANT SELECT ON public.comun_community_work_groups TO anon;;

GRANT SELECT ON public.comun_community_work_groups TO authenticated;;

GRANT ALL ON public.comun_community_work_groups TO service_role;;

CREATE INDEX comun_community_work_groups_public_idx ON public.comun_community_work_groups (community_id, state, ends_at);;

CREATE TRIGGER comun_community_work_groups_updated_at BEFORE UPDATE ON public.comun_community_work_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE POLICY "Public reads active community work groups" ON public.comun_community_work_groups FOR SELECT TO anon, authenticated USING ((state = ANY (ARRAY['active'::text, 'completed'::text])));;

CREATE TABLE public.comun_construction_circle_rounds (id uuid DEFAULT gen_random_uuid() NOT NULL, circle_id uuid NOT NULL, round_type text NOT NULL, title text NOT NULL, public_prompt text NOT NULL, public_guidance text, "position" integer NOT NULL, status text DEFAULT 'planned'::text NOT NULL, opens_at timestamp with time zone, closes_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_construction_circle_rounds ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_construction_circle_rounds ADD CONSTRAINT comun_construction_circle_rounds_circle_id_position_key UNIQUE (circle_id, "position");;

ALTER TABLE public.comun_construction_circle_rounds ADD CONSTRAINT comun_construction_circle_rounds_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_circle_contributions ADD CONSTRAINT comun_circle_contributions_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.comun_construction_circle_rounds(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_circle_syntheses ADD CONSTRAINT comun_circle_syntheses_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.comun_construction_circle_rounds(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_construction_circle_rounds ADD CONSTRAINT comun_construction_circle_rounds_position_check CHECK ("position" >= 0);;

ALTER TABLE public.comun_construction_circle_rounds ADD CONSTRAINT comun_construction_circle_rounds_round_type_check CHECK (round_type = ANY (ARRAY['listening'::text, 'evidence_gathering'::text, 'diagnosis'::text, 'proposals'::text, 'prioritization'::text, 'decision'::text, 'action_planning'::text, 'evaluation'::text, 'memory'::text]));;

ALTER TABLE public.comun_construction_circle_rounds ADD CONSTRAINT comun_construction_circle_rounds_status_check CHECK (status = ANY (ARRAY['planned'::text, 'open'::text, 'closed'::text, 'synthesized'::text, 'archived'::text]));;

GRANT ALL ON public.comun_construction_circle_rounds TO service_role;;

CREATE UNIQUE INDEX comun_circle_one_open_round ON public.comun_construction_circle_rounds (circle_id) WHERE status = 'open'::text;;

CREATE INDEX comun_circle_rounds_open ON public.comun_construction_circle_rounds (circle_id, status, "position");;

CREATE TABLE public.comun_construction_circles (id uuid DEFAULT gen_random_uuid() NOT NULL, pauta_id uuid NOT NULL, module_id uuid, title text NOT NULL, public_question text NOT NULL, public_context text, status text DEFAULT 'draft'::text NOT NULL, participation_mode text DEFAULT 'moderated_public'::text NOT NULL, current_round_id uuid, starts_at timestamp with time zone, closes_at timestamp with time zone, created_by text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_construction_circles ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_construction_circles ADD CONSTRAINT comun_circles_current_round_fk FOREIGN KEY (current_round_id) REFERENCES public.comun_construction_circle_rounds(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_construction_circles ADD CONSTRAINT comun_construction_circles_participation_mode_check CHECK (participation_mode = ANY (ARRAY['moderated_public'::text, 'registered_members'::text, 'invited_group'::text, 'internal'::text]));;

ALTER TABLE public.comun_construction_circles ADD CONSTRAINT comun_construction_circles_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_construction_circles ADD CONSTRAINT comun_construction_circles_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_circle_contributions ADD CONSTRAINT comun_circle_contributions_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES public.comun_construction_circles(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_circle_syntheses ADD CONSTRAINT comun_circle_syntheses_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES public.comun_construction_circles(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_construction_circle_rounds ADD CONSTRAINT comun_construction_circle_rounds_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES public.comun_construction_circles(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_construction_circles ADD CONSTRAINT comun_construction_circles_status_check CHECK (status = ANY (ARRAY['draft'::text, 'open'::text, 'synthesizing'::text, 'decision'::text, 'action'::text, 'completed'::text, 'paused'::text, 'archived'::text]));;

GRANT ALL ON public.comun_construction_circles TO service_role;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_dossiers FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_dossiers FROM authenticated;;

CREATE TABLE public.comun_editorial_operation_assignments (id uuid DEFAULT gen_random_uuid() NOT NULL, item_id uuid NOT NULL, assignee_profile_id uuid NOT NULL, assigned_by_profile_id uuid NOT NULL, role_at_assignment text NOT NULL, status text DEFAULT 'active'::text NOT NULL, assigned_at timestamp with time zone DEFAULT now() NOT NULL, resolved_at timestamp with time zone);;

ALTER TABLE public.comun_editorial_operation_assignments ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_editorial_operation_assignments ADD CONSTRAINT comun_editorial_operation_ass_item_id_assignee_profile_id_s_key UNIQUE (item_id, assignee_profile_id, status);;

ALTER TABLE public.comun_editorial_operation_assignments ADD CONSTRAINT comun_editorial_operation_assignmen_assigned_by_profile_id_fkey FOREIGN KEY (assigned_by_profile_id) REFERENCES public.comun_admin_profiles(id);;

ALTER TABLE public.comun_editorial_operation_assignments ADD CONSTRAINT comun_editorial_operation_assignments_assignee_profile_id_fkey FOREIGN KEY (assignee_profile_id) REFERENCES public.comun_admin_profiles(id);;

ALTER TABLE public.comun_editorial_operation_assignments ADD CONSTRAINT comun_editorial_operation_assignments_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_editorial_operation_assignments ADD CONSTRAINT comun_editorial_operation_assignments_role_at_assignment_check CHECK (role_at_assignment = ANY (ARRAY['admin'::text, 'editor'::text, 'factual_reviewer'::text, 'editorial_reviewer'::text, 'publisher'::text, 'viewer'::text]));;

ALTER TABLE public.comun_editorial_operation_assignments ADD CONSTRAINT comun_editorial_operation_assignments_status_check CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text]));;

GRANT ALL ON public.comun_editorial_operation_assignments TO service_role;;

CREATE TABLE public.comun_editorial_operation_events (id uuid DEFAULT gen_random_uuid() NOT NULL, item_id uuid NOT NULL, actor_profile_id uuid, event_type text NOT NULL, payload jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_editorial_operation_events ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_editorial_operation_events ADD CONSTRAINT comun_editorial_operation_events_actor_profile_id_fkey FOREIGN KEY (actor_profile_id) REFERENCES public.comun_admin_profiles(id);;

ALTER TABLE public.comun_editorial_operation_events ADD CONSTRAINT comun_editorial_operation_events_pkey PRIMARY KEY (id);;

GRANT ALL ON public.comun_editorial_operation_events TO service_role;;

CREATE INDEX comun_editorial_operation_events_item_idx ON public.comun_editorial_operation_events (item_id, created_at DESC);;

CREATE TABLE public.comun_editorial_operation_items (id uuid DEFAULT gen_random_uuid() NOT NULL, source_type text NOT NULL, source_id uuid, pauta_id uuid, territory_id uuid, queue text NOT NULL, state text DEFAULT 'pending'::text NOT NULL, title text NOT NULL, public_reason text, next_action text, priority smallint DEFAULT 2 NOT NULL, indicative_due_at timestamp with time zone, human_gate text, fixture_tag text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_editorial_operation_items ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_editorial_operation_items ADD CONSTRAINT comun_editorial_operation_items_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_editorial_operation_items ADD CONSTRAINT comun_editorial_operation_items_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_editorial_operation_assignments ADD CONSTRAINT comun_editorial_operation_assignments_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.comun_editorial_operation_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_editorial_operation_events ADD CONSTRAINT comun_editorial_operation_events_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.comun_editorial_operation_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_editorial_operation_items ADD CONSTRAINT comun_editorial_operation_items_priority_check CHECK (priority >= 1 AND priority <= 4);;

ALTER TABLE public.comun_editorial_operation_items ADD CONSTRAINT comun_editorial_operation_items_queue_check CHECK (queue = ANY (ARRAY['entry'::text, 'triage'::text, 'rights'::text, 'safety'::text, 'factual'::text, 'editorial'::text, 'publication'::text, 'follow_up'::text, 'corrections'::text, 'withdrawals'::text]));;

ALTER TABLE public.comun_editorial_operation_items ADD CONSTRAINT comun_editorial_operation_items_source_type_check CHECK (source_type = ANY (ARRAY['contribution'::text, 'record'::text, 'photo'::text, 'observation'::text, 'proposal'::text, 'task'::text, 'protocol'::text, 'correction'::text, 'withdrawal'::text, 'alert'::text]));;

ALTER TABLE public.comun_editorial_operation_items ADD CONSTRAINT comun_editorial_operation_items_state_check CHECK (state = ANY (ARRAY['pending'::text, 'assigned'::text, 'in_review'::text, 'blocked'::text, 'ready'::text, 'published'::text, 'resolved'::text, 'withdrawn'::text]));;

ALTER TABLE public.comun_editorial_operation_items ADD CONSTRAINT comun_editorial_operation_items_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_editorial_operation_items ADD CONSTRAINT comun_editorial_operation_items_title_check CHECK (char_length(title) >= 1 AND char_length(title) <= 180);;

GRANT ALL ON public.comun_editorial_operation_items TO service_role;;

CREATE INDEX comun_editorial_operation_queue_idx ON public.comun_editorial_operation_items (queue, state, priority, created_at);;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_archive_links FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_archive_links FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_communication_materials FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_communication_materials FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_participation_interests FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_participation_interests FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_pauta_projects FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_pauta_projects FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_pauta_reports FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_pauta_reports FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_projects FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_projects FROM authenticated;;

ALTER TABLE public.comun_hub_results ADD COLUMN sidewalk_record_id uuid;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_results FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_results FROM authenticated;;

ALTER TABLE public.comun_hub_territories ADD COLUMN private_notes text;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_territories FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_hub_territories FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_issues FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_issues FROM authenticated;;

ALTER TABLE public.comun_member_inbox ADD CONSTRAINT comun_member_inbox_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_member_inbox ADD CONSTRAINT comun_member_inbox_notification_type_check CHECK (notification_type = ANY (ARRAY['action_required'::text, 'contribution_update'::text, 'information_requested'::text, 'task_assigned'::text, 'task_due'::text, 'round_opened'::text, 'round_closing'::text, 'synthesis_published'::text, 'campaign_assignment'::text, 'campaign_update'::text, 'official_response'::text, 'result_registered'::text, 'artwork_update'::text, 'radio_update'::text, 'consent_action_required'::text, 'rights_action_required'::text, 'sidewalk_report_received'::text, 'sidewalk_report_verified'::text, 'sidewalk_report_published'::text, 'sidewalk_circle_opened'::text, 'sidewalk_task_assigned'::text, 'sidewalk_protocol_sent'::text, 'sidewalk_response_received'::text, 'sidewalk_result_recorded'::text, 'sidewalk_forwarding_prepared'::text, 'sidewalk_forwarding_approved'::text, 'sidewalk_memory_published'::text, 'community_followed'::text, 'community_membership_requested'::text, 'community_membership_approved'::text, 'community_circle_opened'::text, 'community_task_assigned'::text, 'community_pauta_stage_changed'::text, 'community_activity_upcoming'::text, 'community_result_published'::text, 'community_correction_completed'::text, 'community_withdrawal_completed'::text, 'archive_comment_approved'::text, 'archive_comment_rejected'::text, 'archive_comment_reply'::text, 'archive_comment_needs_information'::text, 'archive_comment_withdrawn'::text]));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_member_inbox FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_member_inbox FROM authenticated;;

ALTER TABLE public.comun_member_profiles ADD CONSTRAINT comun_member_profiles_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_member_profiles FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_member_profiles FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_metric_definitions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_metric_definitions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_metric_snapshots FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_metric_snapshots FROM authenticated;;

ALTER TABLE public.comun_mobilization_actions ADD COLUMN sidewalk_record_id uuid;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_mobilization_actions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_mobilization_actions FROM authenticated;;

ALTER TABLE public.comun_monitored_entities ADD CONSTRAINT comun_monitored_entities_entity_type_check CHECK (entity_type = ANY (ARRAY['transport_line'::text, 'transport_stop'::text, 'transport_service'::text, 'public_unit'::text, 'school'::text, 'health_unit'::text, 'recycling_point'::text, 'collection_route'::text, 'environmental_station'::text, 'public_equipment'::text, 'territory'::text, 'sidewalk_segment'::text, 'other'::text]));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_monitored_entities FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_monitored_entities FROM authenticated;;

CREATE TABLE public.comun_observation_campaign_access_grants (id uuid DEFAULT gen_random_uuid() NOT NULL, campaign_id uuid NOT NULL, sampling_slot_id uuid, assignment_id uuid, role text NOT NULL, access_code_hash text NOT NULL, code_suffix text NOT NULL, status text DEFAULT 'active'::text NOT NULL, valid_from timestamp with time zone, expires_at timestamp with time zone NOT NULL, max_exchanges integer DEFAULT 1 NOT NULL, exchange_count integer DEFAULT 0 NOT NULL, last_exchanged_at timestamp with time zone, revoked_at timestamp with time zone, created_by text, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_observation_campaign_access_grants ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_access_code_hash_key UNIQUE (access_code_hash);;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.comun_observation_campaign_assignments(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.comun_observation_campaigns(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_exchange_count_check CHECK (exchange_count >= 0);;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_max_exchanges_check CHECK (max_exchanges >= 1 AND max_exchanges <= 20);;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_role_check CHECK (role = ANY (ARRAY['field_observer'::text, 'field_support'::text, 'field_coordinator'::text]));;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_sampling_slot_id_fkey FOREIGN KEY (sampling_slot_id) REFERENCES public.comun_observation_sampling_slots(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_observation_campaign_access_grants ADD CONSTRAINT comun_observation_campaign_access_grants_status_check CHECK (status = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text, 'revoked'::text, 'archived'::text]));;

GRANT ALL ON public.comun_observation_campaign_access_grants TO service_role;;

CREATE INDEX comun_field_grants_campaign_status ON public.comun_observation_campaign_access_grants (campaign_id, status, expires_at);;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaign_assignments FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaign_assignments FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaign_evidence_links FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaign_evidence_links FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaign_field_diaries FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaign_field_diaries FROM authenticated;;

CREATE TABLE public.comun_observation_campaign_field_sessions (id uuid DEFAULT gen_random_uuid() NOT NULL, grant_id uuid NOT NULL, campaign_id uuid NOT NULL, sampling_slot_id uuid, session_hash text NOT NULL, expires_at timestamp with time zone NOT NULL, revoked_at timestamp with time zone, onboarding_confirmed_at timestamp with time zone, shift_started_at timestamp with time zone, shift_completed_at timestamp with time zone, observation_count integer DEFAULT 0 NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, last_seen_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_observation_campaign_field_sessions ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_observation_campaign_field_sessions ADD CONSTRAINT comun_observation_campaign_field_sessio_observation_count_check CHECK (observation_count >= 0);;

ALTER TABLE public.comun_observation_campaign_field_sessions ADD CONSTRAINT comun_observation_campaign_field_sessions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.comun_observation_campaigns(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_observation_campaign_field_sessions ADD CONSTRAINT comun_observation_campaign_field_sessions_grant_id_fkey FOREIGN KEY (grant_id) REFERENCES public.comun_observation_campaign_access_grants(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_observation_campaign_field_sessions ADD CONSTRAINT comun_observation_campaign_field_sessions_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_observation_campaign_field_sessions ADD CONSTRAINT comun_observation_campaign_field_sessions_sampling_slot_id_fkey FOREIGN KEY (sampling_slot_id) REFERENCES public.comun_observation_sampling_slots(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_observation_campaign_field_sessions ADD CONSTRAINT comun_observation_campaign_field_sessions_session_hash_key UNIQUE (session_hash);;

GRANT ALL ON public.comun_observation_campaign_field_sessions TO service_role;;

CREATE INDEX comun_field_sessions_grant_active ON public.comun_observation_campaign_field_sessions (grant_id, expires_at) WHERE revoked_at IS NULL;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaign_reports FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaign_reports FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaigns FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_campaigns FROM authenticated;;

CREATE TABLE public.comun_observation_field_corrections (id uuid DEFAULT gen_random_uuid() NOT NULL, observation_id uuid NOT NULL, field_session_id uuid NOT NULL, previous_payload jsonb NOT NULL, corrected_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_observation_field_corrections ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_observation_field_corrections ADD CONSTRAINT comun_observation_field_corrections_field_session_id_fkey FOREIGN KEY (field_session_id) REFERENCES public.comun_observation_campaign_field_sessions(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_observation_field_corrections ADD CONSTRAINT comun_observation_field_corrections_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.comun_observations(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_observation_field_corrections ADD CONSTRAINT comun_observation_field_corrections_pkey PRIMARY KEY (id);;

GRANT ALL ON public.comun_observation_field_corrections TO service_role;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_form_versions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_form_versions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_quality_reviews FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_quality_reviews FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_sampling_plans FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_sampling_plans FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_sampling_slots FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_sampling_slots FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_verification_events FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observation_verification_events FROM authenticated;;

ALTER TABLE public.comun_observations ADD COLUMN field_session_id uuid;;

ALTER TABLE public.comun_observations ADD CONSTRAINT comun_observations_field_session_id_fkey FOREIGN KEY (field_session_id) REFERENCES public.comun_observation_campaign_field_sessions(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_observations ADD COLUMN sidewalk_record_id uuid;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observations FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observations FROM authenticated;;

CREATE INDEX comun_field_observations_session ON public.comun_observations (field_session_id, created_at) WHERE field_session_id IS NOT NULL;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observatories FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observatories FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observatory_action_links FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observatory_action_links FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observatory_methodologies FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observatory_methodologies FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observatory_reports FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_observatory_reports FROM authenticated;;

ALTER TABLE public.comun_official_protocols ADD COLUMN sidewalk_record_id uuid;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_official_protocols FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_official_protocols FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_contributions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_contributions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_dossier_evidence FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_dossier_evidence FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_dossier_publication_snapshots FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_dossier_publication_snapshots FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_dossier_reviews FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_dossier_reviews FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_dossiers FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_dossiers FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_pauta_evidence_items FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_pauta_evidence_items FROM authenticated;;

CREATE TABLE public.comun_pauta_memberships (id uuid DEFAULT gen_random_uuid() NOT NULL, pauta_id uuid NOT NULL, member_user_id uuid NOT NULL, role text DEFAULT 'participant'::text NOT NULL, status text DEFAULT 'active'::text NOT NULL, joined_at timestamp with time zone DEFAULT now() NOT NULL, left_at timestamp with time zone);;

ALTER TABLE public.comun_pauta_memberships ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_pauta_memberships ADD CONSTRAINT comun_pauta_memberships_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_pauta_memberships ADD CONSTRAINT comun_pauta_memberships_pauta_id_member_user_id_key UNIQUE (pauta_id, member_user_id);;

ALTER TABLE public.comun_pauta_memberships ADD CONSTRAINT comun_pauta_memberships_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_pauta_memberships ADD CONSTRAINT comun_pauta_memberships_role_check CHECK (role = ANY (ARRAY['participant'::text, 'facilitator'::text, 'curator'::text, 'field_observer'::text, 'researcher'::text, 'communication'::text, 'coordinator'::text]));;

ALTER TABLE public.comun_pauta_memberships ADD CONSTRAINT comun_pauta_memberships_status_check CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'left'::text, 'archived'::text]));;

GRANT ALL ON public.comun_pauta_memberships TO service_role;;

CREATE TABLE public.comun_pauta_modules (id uuid DEFAULT gen_random_uuid() NOT NULL, pauta_id uuid NOT NULL, module_type text NOT NULL, title_override text, public_description text, "position" integer DEFAULT 0 NOT NULL, status text DEFAULT 'draft'::text NOT NULL, visibility text DEFAULT 'private'::text NOT NULL, config jsonb DEFAULT '{}'::jsonb NOT NULL, created_by text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_pauta_modules ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_pauta_modules ADD CONSTRAINT comun_pauta_modules_config_check CHECK (jsonb_typeof(config) = 'object'::text AND pg_column_size(config) <= 16384);;

ALTER TABLE public.comun_pauta_modules ADD CONSTRAINT comun_pauta_modules_module_type_check CHECK (module_type = ANY (ARRAY['overview'::text, 'construction_circle'::text, 'reports'::text, 'evidence'::text, 'map'::text, 'observatory'::text, 'metrics'::text, 'documents'::text, 'timeline'::text, 'proposals'::text, 'actions'::text, 'tasks'::text, 'calendar'::text, 'results'::text, 'archive'::text, 'art_gallery'::text, 'community_radio'::text, 'participation'::text]));;

ALTER TABLE public.comun_pauta_modules ADD CONSTRAINT comun_pauta_modules_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_pauta_modules ADD CONSTRAINT comun_pauta_modules_pauta_id_module_type_key UNIQUE (pauta_id, module_type);;

ALTER TABLE public.comun_pauta_modules ADD CONSTRAINT comun_pauta_modules_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_construction_circles ADD CONSTRAINT comun_construction_circles_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.comun_pauta_modules(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_pauta_modules ADD CONSTRAINT comun_pauta_modules_position_check CHECK ("position" >= 0);;

ALTER TABLE public.comun_pauta_modules ADD CONSTRAINT comun_pauta_modules_status_check CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]));;

ALTER TABLE public.comun_pauta_modules ADD CONSTRAINT comun_pauta_modules_visibility_check CHECK (visibility = ANY (ARRAY['public'::text, 'participants'::text, 'internal'::text, 'private'::text]));;

GRANT ALL ON public.comun_pauta_modules TO service_role;;

CREATE INDEX comun_pauta_modules_public ON public.comun_pauta_modules (pauta_id, "position") WHERE status = 'active'::text AND visibility = 'public'::text;;

ALTER TABLE public.comun_pauta_spaces ADD CONSTRAINT comun_pauta_spaces_public_status_check CHECK (public_status = ANY (ARRAY['received'::text, 'triage'::text, 'investigating'::text, 'collecting_evidence'::text, 'building_proposal'::text, 'building_solution'::text, 'ready_for_action'::text, 'active_mobilization'::text, 'awaiting_response'::text, 'monitoring'::text, 'partial_win'::text, 'resolved'::text, 'no_progress'::text, 'archived'::text]));;

REVOKE DELETE, INSERT, UPDATE ON public.comun_pauta_spaces FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_pauta_spaces FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_synthesis_versions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_synthesis_versions FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_pauta_tasks FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_pauta_tasks FROM authenticated;;

ALTER TABLE public.comun_pauta_timeline_events ADD CONSTRAINT comun_pauta_timeline_events_event_type_check CHECK (event_type = ANY (ARRAY['report_received'::text, 'evidence_added'::text, 'circle_opened'::text, 'round_closed'::text, 'synthesis_published'::text, 'proposal_created'::text, 'decision_recorded'::text, 'task_created'::text, 'action_started'::text, 'protocol_sent'::text, 'official_response_received'::text, 'result_recorded'::text, 'archive_item_related'::text, 'artwork_related'::text, 'radio_episode_related'::text, 'official_response'::text, 'investigation_update'::text, 'action_announced'::text, 'action_completed'::text, 'publication_released'::text, 'meeting_held'::text, 'proposal_presented'::text, 'partial_result'::text, 'final_result'::text, 'correction'::text, 'other'::text]));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_timeline_events FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_pauta_timeline_events FROM authenticated;;

CREATE TABLE public.comun_pauta_updates (id uuid DEFAULT gen_random_uuid() NOT NULL, pauta_id uuid NOT NULL, circle_id uuid, title text NOT NULL, body text NOT NULL, update_type text DEFAULT 'process'::text NOT NULL, visibility text DEFAULT 'public'::text NOT NULL, status text DEFAULT 'draft'::text NOT NULL, published_at timestamp with time zone, created_by text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_pauta_updates ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_pauta_updates ADD CONSTRAINT comun_pauta_updates_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES public.comun_construction_circles(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_pauta_updates ADD CONSTRAINT comun_pauta_updates_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_pauta_updates ADD CONSTRAINT comun_pauta_updates_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_pauta_updates ADD CONSTRAINT comun_pauta_updates_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]));;

ALTER TABLE public.comun_pauta_updates ADD CONSTRAINT comun_pauta_updates_update_type_check CHECK (update_type = ANY (ARRAY['process'::text, 'decision'::text, 'action'::text, 'result'::text, 'correction'::text]));;

ALTER TABLE public.comun_pauta_updates ADD CONSTRAINT comun_pauta_updates_visibility_check CHECK (visibility = ANY (ARRAY['public'::text, 'participants'::text, 'internal'::text]));;

GRANT ALL ON public.comun_pauta_updates TO service_role;;

CREATE INDEX comun_pauta_updates_public ON public.comun_pauta_updates (pauta_id, published_at DESC) WHERE status = 'published'::text AND visibility = 'public'::text;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_public_dossier_features FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_public_dossier_features FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_public_lookup_events FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_public_lookup_events FROM authenticated;;

CREATE TABLE public.comun_radio_contributions (id uuid DEFAULT gen_random_uuid() NOT NULL, member_user_id uuid, public_protocol text NOT NULL, contribution_type text NOT NULL, title_suggestion text NOT NULL, context_suggestion text NOT NULL, creator_credit_suggestion text, private_contact text, status text DEFAULT 'pending'::text NOT NULL, information_request_public text, next_action_public text, internal_notes text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_contributions ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_contributions ADD CONSTRAINT comun_radio_contributions_contribution_type_check CHECK (contribution_type = ANY (ARRAY['program_proposal'::text, 'pauta_proposal'::text, 'community_audio'::text, 'authorized_testimony'::text, 'own_music'::text, 'agenda'::text, 'correction'::text, 'complement'::text, 'withdrawal'::text]));;

ALTER TABLE public.comun_radio_contributions ADD CONSTRAINT comun_radio_contributions_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_radio_contributions ADD CONSTRAINT comun_radio_contributions_public_protocol_key UNIQUE (public_protocol);;

ALTER TABLE public.comun_radio_contributions ADD CONSTRAINT comun_radio_contributions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'information_requested'::text, 'rights_review'::text, 'editorial_review'::text, 'processing'::text, 'approved'::text, 'rejected'::text, 'published'::text, 'withdrawn'::text, 'archived'::text]));;

GRANT ALL ON public.comun_radio_contributions TO service_role;;

CREATE INDEX comun_radio_contributions_member_idx ON public.comun_radio_contributions (member_user_id, created_at DESC);;

CREATE TRIGGER comun_radio_contributions_updated_at BEFORE UPDATE ON public.comun_radio_contributions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_radio_credits (id uuid DEFAULT gen_random_uuid() NOT NULL, episode_item_id uuid NOT NULL, agent_id uuid, credit_role text NOT NULL, public_credit text NOT NULL, "position" integer DEFAULT 0 NOT NULL, public_visibility text DEFAULT 'public'::text NOT NULL, private_notes text, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_credits ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_credits ADD CONSTRAINT comun_radio_credits_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.comun_archive_agents(id) ON DELETE RESTRICT;;

ALTER TABLE public.comun_radio_credits ADD CONSTRAINT comun_radio_credits_credit_role_check CHECK (credit_role = ANY (ARRAY['host'::text, 'co_host'::text, 'guest'::text, 'interviewer'::text, 'interviewee'::text, 'reporter'::text, 'producer'::text, 'editor'::text, 'sound_editor'::text, 'researcher'::text, 'writer'::text, 'musician'::text, 'composer'::text, 'performer'::text, 'collective'::text, 'rights_holder'::text, 'translator'::text, 'transcriber'::text, 'photographer'::text, 'cover_artist'::text, 'anonymous_participant'::text]));;

ALTER TABLE public.comun_radio_credits ADD CONSTRAINT comun_radio_credits_episode_item_id_fkey FOREIGN KEY (episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_credits ADD CONSTRAINT comun_radio_credits_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_radio_credits ADD CONSTRAINT comun_radio_credits_public_visibility_check CHECK (public_visibility = ANY (ARRAY['public'::text, 'private'::text]));;

GRANT ALL ON public.comun_radio_credits TO service_role;;

CREATE TABLE public.comun_radio_editorial_versions (id uuid DEFAULT gen_random_uuid() NOT NULL, episode_item_id uuid NOT NULL, version_number bigint NOT NULL, sanitized_snapshot jsonb NOT NULL, change_type text NOT NULL, created_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_editorial_versions ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_editorial_versions ADD CONSTRAINT comun_radio_editorial_version_episode_item_id_version_numbe_key UNIQUE (episode_item_id, version_number);;

ALTER TABLE public.comun_radio_editorial_versions ADD CONSTRAINT comun_radio_editorial_versions_episode_item_id_fkey FOREIGN KEY (episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_editorial_versions ADD CONSTRAINT comun_radio_editorial_versions_pkey PRIMARY KEY (id);;

GRANT ALL ON public.comun_radio_editorial_versions TO service_role;;

CREATE TABLE public.comun_radio_episode_chapters (id uuid DEFAULT gen_random_uuid() NOT NULL, episode_item_id uuid NOT NULL, start_seconds integer NOT NULL, end_seconds integer, title_public text NOT NULL, summary_public text, related_pauta_id uuid, related_archive_item_id uuid, "position" integer DEFAULT 0 NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_episode_chapters ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_episode_chapters ADD CONSTRAINT comun_radio_episode_chapters_check CHECK (end_seconds IS NULL OR end_seconds > start_seconds);;

ALTER TABLE public.comun_radio_episode_chapters ADD CONSTRAINT comun_radio_episode_chapters_episode_item_id_fkey FOREIGN KEY (episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_episode_chapters ADD CONSTRAINT comun_radio_episode_chapters_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_radio_episode_chapters ADD CONSTRAINT comun_radio_episode_chapters_related_archive_item_id_fkey FOREIGN KEY (related_archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_episode_chapters ADD CONSTRAINT comun_radio_episode_chapters_related_pauta_id_fkey FOREIGN KEY (related_pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_episode_chapters ADD CONSTRAINT comun_radio_episode_chapters_start_seconds_check CHECK (start_seconds >= 0);;

GRANT ALL ON public.comun_radio_episode_chapters TO service_role;;

CREATE TABLE public.comun_radio_episodes (archive_item_id uuid NOT NULL, program_item_id uuid NOT NULL, season_number integer, episode_number integer, title_public text NOT NULL, slug_public text NOT NULL, summary_public text NOT NULL, description_public text, recorded_at date, published_at timestamp with time zone, duration_seconds integer, territory_id uuid, pauta_id uuid, action_id uuid, cover_artwork_item_id uuid, publication_status text DEFAULT 'draft'::text NOT NULL, sensitivity_level text DEFAULT 'normal'::text NOT NULL, transcript_status text DEFAULT 'unavailable'::text NOT NULL, allow_download boolean DEFAULT false NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, sidewalk_record_id uuid);;

ALTER TABLE public.comun_radio_episodes ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.comun_mobilization_actions(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_cover_artwork_item_id_fkey FOREIGN KEY (cover_artwork_item_id) REFERENCES public.comun_archive_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_duration_seconds_check CHECK (duration_seconds >= 1 AND duration_seconds <= 7200);;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_pkey PRIMARY KEY (archive_item_id);;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_program_item_id_fkey FOREIGN KEY (program_item_id) REFERENCES public.comun_archive_items(id) ON DELETE RESTRICT;;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_publication_status_check CHECK (publication_status = ANY (ARRAY['draft'::text, 'audio_processing'::text, 'rights_review'::text, 'editorial_review'::text, 'published'::text, 'unpublished'::text, 'withdrawn'::text, 'archived'::text]));;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_sensitivity_level_check CHECK (sensitivity_level = ANY (ARRAY['normal'::text, 'attention'::text, 'restricted'::text]));;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_slug_public_key UNIQUE (slug_public);;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_transcript_status_check CHECK (transcript_status = ANY (ARRAY['unavailable'::text, 'pending'::text, 'draft'::text, 'review'::text, 'published'::text, 'withdrawn'::text]));;

GRANT ALL ON public.comun_radio_episodes TO service_role;;

CREATE INDEX comun_radio_episodes_program_idx ON public.comun_radio_episodes (program_item_id, publication_status, published_at DESC);;

CREATE TRIGGER comun_radio_episodes_updated_at BEFORE UPDATE ON public.comun_radio_episodes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_radio_music_uses (id uuid DEFAULT gen_random_uuid() NOT NULL, episode_item_id uuid NOT NULL, recording_agent_id uuid, composition_agent_id uuid, title_public text NOT NULL, performer_public text, composer_public text, usage_type text NOT NULL, start_seconds integer, end_seconds integer, rights_status text DEFAULT 'pending'::text NOT NULL, allow_streaming boolean DEFAULT false NOT NULL, allow_download boolean DEFAULT false NOT NULL, allow_social_clip boolean DEFAULT false NOT NULL, allow_campaign_use boolean DEFAULT false NOT NULL, license_public text, evidence_asset_id uuid, private_notes text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_music_uses ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_music_uses ADD CONSTRAINT comun_radio_music_uses_check CHECK (end_seconds IS NULL OR start_seconds IS NULL OR end_seconds > start_seconds);;

ALTER TABLE public.comun_radio_music_uses ADD CONSTRAINT comun_radio_music_uses_composition_agent_id_fkey FOREIGN KEY (composition_agent_id) REFERENCES public.comun_archive_agents(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_music_uses ADD CONSTRAINT comun_radio_music_uses_episode_item_id_fkey FOREIGN KEY (episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_music_uses ADD CONSTRAINT comun_radio_music_uses_evidence_asset_id_fkey FOREIGN KEY (evidence_asset_id) REFERENCES public.comun_archive_assets(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_music_uses ADD CONSTRAINT comun_radio_music_uses_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_radio_music_uses ADD CONSTRAINT comun_radio_music_uses_recording_agent_id_fkey FOREIGN KEY (recording_agent_id) REFERENCES public.comun_archive_agents(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_music_uses ADD CONSTRAINT comun_radio_music_uses_rights_status_check CHECK (rights_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'withdrawn'::text, 'public_domain_verified'::text]));;

ALTER TABLE public.comun_radio_music_uses ADD CONSTRAINT comun_radio_music_uses_usage_type_check CHECK (usage_type = ANY (ARRAY['full_track'::text, 'excerpt'::text, 'background'::text, 'theme'::text, 'incidental'::text, 'live_performance'::text, 'public_domain'::text, 'original_commission'::text, 'other'::text]));;

GRANT ALL ON public.comun_radio_music_uses TO service_role;;

CREATE TRIGGER comun_radio_music_uses_updated_at BEFORE UPDATE ON public.comun_radio_music_uses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_radio_programs (archive_item_id uuid NOT NULL, title_public text NOT NULL, slug_public text NOT NULL, subtitle_public text, description_public text NOT NULL, format_type text NOT NULL, status text DEFAULT 'draft'::text NOT NULL, territory_id uuid, pauta_id uuid, cover_artwork_item_id uuid, frequency_public text, publication_status text DEFAULT 'draft'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, sidewalk_record_id uuid);;

ALTER TABLE public.comun_radio_programs ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_cover_artwork_item_id_fkey FOREIGN KEY (cover_artwork_item_id) REFERENCES public.comun_archive_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_format_type_check CHECK (format_type = ANY (ARRAY['news'::text, 'interview'::text, 'debate'::text, 'storytelling'::text, 'music'::text, 'cultural'::text, 'educational'::text, 'bulletin'::text, 'documentary'::text, 'children'::text, 'mixed'::text, 'other'::text]));;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_pkey PRIMARY KEY (archive_item_id);;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_publication_status_check CHECK (publication_status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'unpublished'::text, 'archived'::text]));;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_slug_public_key UNIQUE (slug_public);;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'active'::text, 'paused'::text, 'archived'::text]));;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

GRANT ALL ON public.comun_radio_programs TO service_role;;

CREATE TRIGGER comun_radio_programs_updated_at BEFORE UPDATE ON public.comun_radio_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_radio_safety_reviews (episode_item_id uuid NOT NULL, minor_involved_private boolean DEFAULT false NOT NULL, guardian_authorization_confirmed boolean DEFAULT false NOT NULL, sensitive_location_private boolean DEFAULT false NOT NULL, identifiable_people_private boolean DEFAULT false NOT NULL, reinforced_review_status text DEFAULT 'not_required'::text NOT NULL, private_notes text, reviewed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_safety_reviews ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_safety_reviews ADD CONSTRAINT comun_radio_safety_reviews_episode_item_id_fkey FOREIGN KEY (episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_safety_reviews ADD CONSTRAINT comun_radio_safety_reviews_pkey PRIMARY KEY (episode_item_id);;

ALTER TABLE public.comun_radio_safety_reviews ADD CONSTRAINT comun_radio_safety_reviews_reinforced_review_status_check CHECK (reinforced_review_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'approved'::text, 'rejected'::text]));;

GRANT ALL ON public.comun_radio_safety_reviews TO service_role;;

CREATE TRIGGER comun_radio_safety_reviews_updated_at BEFORE UPDATE ON public.comun_radio_safety_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_radio_schedule_entries (id uuid DEFAULT gen_random_uuid() NOT NULL, program_item_id uuid NOT NULL, episode_item_id uuid, title_public text NOT NULL, starts_at timestamp with time zone NOT NULL, ends_at timestamp with time zone NOT NULL, schedule_type text NOT NULL, status text DEFAULT 'draft'::text NOT NULL, recurrence_public text, public_note text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_schedule_entries ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_schedule_entries ADD CONSTRAINT comun_radio_schedule_entries_check CHECK (ends_at > starts_at);;

ALTER TABLE public.comun_radio_schedule_entries ADD CONSTRAINT comun_radio_schedule_entries_episode_item_id_fkey FOREIGN KEY (episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_schedule_entries ADD CONSTRAINT comun_radio_schedule_entries_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_radio_schedule_entries ADD CONSTRAINT comun_radio_schedule_entries_program_item_id_fkey FOREIGN KEY (program_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_schedule_entries ADD CONSTRAINT comun_radio_schedule_entries_schedule_type_check CHECK (schedule_type = ANY (ARRAY['premiere'::text, 'replay'::text, 'special'::text, 'bulletin'::text, 'live_future'::text]));;

ALTER TABLE public.comun_radio_schedule_entries ADD CONSTRAINT comun_radio_schedule_entries_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'cancelled'::text, 'completed'::text]));;

GRANT ALL ON public.comun_radio_schedule_entries TO service_role;;

CREATE INDEX comun_radio_schedule_public_idx ON public.comun_radio_schedule_entries (status, starts_at);;

CREATE TRIGGER comun_radio_schedule_updated_at BEFORE UPDATE ON public.comun_radio_schedule_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_radio_transcript_versions (id uuid DEFAULT gen_random_uuid() NOT NULL, episode_item_id uuid NOT NULL, version_number integer NOT NULL, transcript_type text NOT NULL, content text NOT NULL, status text DEFAULT 'draft'::text NOT NULL, contains_redactions boolean DEFAULT false NOT NULL, reviewed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_transcript_versions ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_transcript_versions ADD CONSTRAINT comun_radio_transcript_versio_episode_item_id_version_numbe_key UNIQUE (episode_item_id, version_number);;

ALTER TABLE public.comun_radio_transcript_versions ADD CONSTRAINT comun_radio_transcript_versions_episode_item_id_fkey FOREIGN KEY (episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_transcript_versions ADD CONSTRAINT comun_radio_transcript_versions_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_radio_transcript_versions ADD CONSTRAINT comun_radio_transcript_versions_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'withdrawn'::text]));;

ALTER TABLE public.comun_radio_transcript_versions ADD CONSTRAINT comun_radio_transcript_versions_transcript_type_check CHECK (transcript_type = ANY (ARRAY['txt'::text, 'vtt'::text, 'manual_editorial'::text]));;

GRANT ALL ON public.comun_radio_transcript_versions TO service_role;;

CREATE TABLE public.comun_radio_voice_consents (id uuid DEFAULT gen_random_uuid() NOT NULL, episode_item_id uuid NOT NULL, agent_id uuid, participant_reference_private text, consent_status text DEFAULT 'pending'::text NOT NULL, allow_private_preservation boolean DEFAULT false NOT NULL, allow_comun_audio boolean DEFAULT false NOT NULL, allow_transcript boolean DEFAULT false NOT NULL, allow_social_clips boolean DEFAULT false NOT NULL, allow_print_quotes boolean DEFAULT false NOT NULL, allow_campaign_use boolean DEFAULT false NOT NULL, allow_educational_use boolean DEFAULT false NOT NULL, allow_name_publication boolean DEFAULT false NOT NULL, public_name_override text, valid_from date, valid_until date, withdrawal_requested_at timestamp with time zone, withdrawal_completed_at timestamp with time zone, evidence_asset_id uuid, private_notes text, reviewed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_radio_voice_consents ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_radio_voice_consents ADD CONSTRAINT comun_radio_voice_consents_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.comun_archive_agents(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_voice_consents ADD CONSTRAINT comun_radio_voice_consents_consent_status_check CHECK (consent_status = ANY (ARRAY['pending'::text, 'approved'::text, 'partially_approved'::text, 'rejected'::text, 'expired'::text, 'withdrawn'::text]));;

ALTER TABLE public.comun_radio_voice_consents ADD CONSTRAINT comun_radio_voice_consents_episode_item_id_fkey FOREIGN KEY (episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_radio_voice_consents ADD CONSTRAINT comun_radio_voice_consents_evidence_asset_id_fkey FOREIGN KEY (evidence_asset_id) REFERENCES public.comun_archive_assets(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_voice_consents ADD CONSTRAINT comun_radio_voice_consents_pkey PRIMARY KEY (id);;

GRANT ALL ON public.comun_radio_voice_consents TO service_role;;

CREATE TRIGGER comun_radio_voice_consents_updated_at BEFORE UPDATE ON public.comun_radio_voice_consents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_recycling_materials FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_recycling_materials FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_recycling_point_materials FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_recycling_point_materials FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_recycling_points FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_recycling_points FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_report_attachments FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_report_attachments FROM authenticated;;

REVOKE DELETE, SELECT, UPDATE ON public.comun_reports FROM anon;;

REVOKE DELETE, SELECT, UPDATE ON public.comun_reports FROM authenticated;;

CREATE TABLE public.comun_sidewalk_cycle_memories (id uuid DEFAULT gen_random_uuid() NOT NULL, pauta_id uuid NOT NULL, record_id uuid, slug text NOT NULL, title text NOT NULL, public_summary text NOT NULL, methodology_snapshot text, snapshot_id uuid, circle_id uuid, synthesis_id uuid, action_id uuid, protocol_id uuid, result_id uuid, artwork_item_id uuid, radio_episode_item_id uuid, status text DEFAULT 'draft'::text NOT NULL, visibility text DEFAULT 'internal'::text NOT NULL, published_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, forwarding_id uuid, priority_id uuid, territory_id uuid, community_slug text);;

ALTER TABLE public.comun_sidewalk_cycle_memories ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.comun_mobilization_actions(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_artwork_item_id_fkey FOREIGN KEY (artwork_item_id) REFERENCES public.comun_archive_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES public.comun_construction_circles(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_community_slug_fkey FOREIGN KEY (community_slug) REFERENCES public.comun_communities(slug) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_forwarding_id_key UNIQUE (forwarding_id);;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_protocol_id_fkey FOREIGN KEY (protocol_id) REFERENCES public.comun_official_protocols(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_radio_episode_item_id_fkey FOREIGN KEY (radio_episode_item_id) REFERENCES public.comun_archive_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.comun_hub_results(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_slug_key UNIQUE (slug);;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.comun_metric_snapshots(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'archived'::text]));;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_synthesis_id_fkey FOREIGN KEY (synthesis_id) REFERENCES public.comun_circle_syntheses(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_visibility_check CHECK (visibility = ANY (ARRAY['public'::text, 'internal'::text, 'archived'::text]));;

GRANT ALL ON public.comun_sidewalk_cycle_memories TO service_role;;

CREATE INDEX comun_sidewalk_cycle_memories_pauta_idx ON public.comun_sidewalk_cycle_memories (pauta_id, status, visibility);;

CREATE TRIGGER comun_sidewalk_cycle_memories_updated_at BEFORE UPDATE ON public.comun_sidewalk_cycle_memories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_sidewalk_forwarding_events (id uuid DEFAULT gen_random_uuid() NOT NULL, forwarding_id uuid NOT NULL, event_type text NOT NULL, public_summary text, private_note text, actor_private text NOT NULL, occurred_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_forwarding_events ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_forwarding_events ADD CONSTRAINT comun_sidewalk_forwarding_events_event_type_check CHECK (event_type = ANY (ARRAY['prepared'::text, 'submitted_for_review'::text, 'correction_requested'::text, 'approved'::text, 'protocol_registered'::text, 'response_received'::text, 'result_recorded'::text, 'memory_drafted'::text, 'memory_published'::text, 'archived'::text]));;

ALTER TABLE public.comun_sidewalk_forwarding_events ADD CONSTRAINT comun_sidewalk_forwarding_events_pkey PRIMARY KEY (id);;

GRANT ALL ON public.comun_sidewalk_forwarding_events TO service_role;;

CREATE INDEX comun_sidewalk_forwarding_events_forwarding_idx ON public.comun_sidewalk_forwarding_events (forwarding_id, occurred_at);;

CREATE TABLE public.comun_sidewalk_forwardings (id uuid DEFAULT gen_random_uuid() NOT NULL, pauta_id uuid NOT NULL, priority_id uuid NOT NULL, synthesis_id uuid, action_id uuid, report_id uuid, protocol_id uuid, result_id uuid, memory_id uuid, territory_id uuid, state text DEFAULT 'draft'::text NOT NULL, title_public text NOT NULL, objective_public text NOT NULL, territory_public text, summary_public text NOT NULL, methodology_public text NOT NULL, limitations_public text NOT NULL, proposal_public text NOT NULL, request_public text NOT NULL, records_public jsonb DEFAULT '[]'::jsonb NOT NULL, package_public jsonb DEFAULT '{}'::jsonb NOT NULL, excluded_fields text[] DEFAULT ARRAY['contato'::text, 'member id'::text, 'autoria privada'::text, 'original'::text, 'geometria privada'::text, 'notas editoriais'::text, 'object key'::text, 'URL assinada'::text, 'consentimento'::text, 'IDs técnicos privados'::text] NOT NULL, correction_request_public text, created_by text NOT NULL, reviewed_by text, approved_at timestamp with time zone, protocol_registered_at timestamp with time zone, response_received_at timestamp with time zone, closed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_forwardings ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.comun_mobilization_actions(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_check CHECK ((state <> ALL (ARRAY['approved'::text, 'protocol_pending'::text, 'protocol_registered'::text, 'response_received'::text, 'result_recorded'::text, 'memory_draft'::text, 'closed'::text])) OR reviewed_by IS NOT NULL);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_check1 CHECK ((state <> ALL (ARRAY['protocol_registered'::text, 'response_received'::text, 'result_recorded'::text, 'memory_draft'::text, 'closed'::text])) OR protocol_id IS NOT NULL);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_check2 CHECK ((state <> ALL (ARRAY['result_recorded'::text, 'memory_draft'::text, 'closed'::text])) OR result_id IS NOT NULL);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_check3 CHECK (state <> 'closed'::text OR memory_id IS NOT NULL);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_memory_id_fkey FOREIGN KEY (memory_id) REFERENCES public.comun_sidewalk_cycle_memories(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_package_public_check CHECK (jsonb_typeof(package_public) = 'object'::text);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_forwarding_id_fkey FOREIGN KEY (forwarding_id) REFERENCES public.comun_sidewalk_forwardings(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_forwarding_events ADD CONSTRAINT comun_sidewalk_forwarding_events_forwarding_id_fkey FOREIGN KEY (forwarding_id) REFERENCES public.comun_sidewalk_forwardings(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_priority_id_key UNIQUE (priority_id);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_protocol_id_fkey FOREIGN KEY (protocol_id) REFERENCES public.comun_official_protocols(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_protocol_id_key UNIQUE (protocol_id);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_records_public_check CHECK (jsonb_typeof(records_public) = 'array'::text);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.comun_reports(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_report_id_key UNIQUE (report_id);;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.comun_hub_results(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_state_check CHECK (state = ANY (ARRAY['draft'::text, 'ready_for_review'::text, 'needs_correction'::text, 'approved'::text, 'protocol_pending'::text, 'protocol_registered'::text, 'response_received'::text, 'result_recorded'::text, 'memory_draft'::text, 'closed'::text, 'archived'::text]));;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_synthesis_id_fkey FOREIGN KEY (synthesis_id) REFERENCES public.comun_circle_syntheses(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

GRANT ALL ON public.comun_sidewalk_forwardings TO service_role;;

CREATE INDEX comun_sidewalk_forwardings_pauta_state_idx ON public.comun_sidewalk_forwardings (pauta_id, state, updated_at DESC);;

CREATE INDEX comun_sidewalk_forwardings_action_idx ON public.comun_sidewalk_forwardings (action_id) WHERE action_id IS NOT NULL;;

CREATE TRIGGER comun_sidewalk_forwardings_updated_at BEFORE UPDATE ON public.comun_sidewalk_forwardings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_sidewalk_municipal_configs (id uuid DEFAULT gen_random_uuid() NOT NULL, slug text NOT NULL, name text NOT NULL, center_longitude double precision NOT NULL, center_latitude double precision NOT NULL, default_zoom numeric(4,2) DEFAULT 12 NOT NULL, bounds_geojson jsonb, neighborhoods text[] DEFAULT '{}'::text[] NOT NULL, responsible_community_slug text, methodology_public text NOT NULL, coverage_status text DEFAULT 'pilot'::text NOT NULL, is_active boolean DEFAULT false NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_municipal_configs ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_municipal_configs ADD CONSTRAINT comun_sidewalk_municipal_configs_coverage_status_check CHECK (coverage_status = ANY (ARRAY['pilot'::text, 'partial'::text, 'active'::text, 'paused'::text, 'closed'::text]));;

ALTER TABLE public.comun_sidewalk_municipal_configs ADD CONSTRAINT comun_sidewalk_municipal_configs_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_municipal_configs ADD CONSTRAINT comun_sidewalk_municipal_configs_slug_key UNIQUE (slug);;

GRANT ALL ON public.comun_sidewalk_municipal_configs TO service_role;;

CREATE TABLE public.comun_sidewalk_observations (id uuid DEFAULT gen_random_uuid() NOT NULL, record_id uuid NOT NULL, member_user_id uuid, observation_type text NOT NULL, note_private text, status text DEFAULT 'pending'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_observations ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_observations ADD CONSTRAINT comun_sidewalk_observations_member_user_id_fkey FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_observations ADD CONSTRAINT comun_sidewalk_observations_observation_type_check CHECK (observation_type = ANY (ARRAY['same'::text, 'worse'::text, 'resolved'::text, 'different'::text]));;

ALTER TABLE public.comun_sidewalk_observations ADD CONSTRAINT comun_sidewalk_observations_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_observations ADD CONSTRAINT comun_sidewalk_observations_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'withdrawn'::text]));;

GRANT ALL ON public.comun_sidewalk_observations TO service_role;;

CREATE INDEX comun_sidewalk_observations_record_idx ON public.comun_sidewalk_observations (record_id, created_at DESC);;

CREATE TABLE public.comun_sidewalk_priorities (id uuid DEFAULT gen_random_uuid() NOT NULL, pauta_id uuid NOT NULL, synthesis_id uuid, record_id uuid NOT NULL, decision_public text NOT NULL, criteria_public text[] DEFAULT '{}'::text[] NOT NULL, evidence_summary_public text, disagreements_public text[] DEFAULT '{}'::text[] NOT NULL, limitations_public text, decided_by text, decided_at timestamp with time zone, status text DEFAULT 'draft'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_priorities ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_priorities ADD CONSTRAINT comun_sidewalk_priorities_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_priorities ADD CONSTRAINT comun_sidewalk_priorities_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.comun_sidewalk_priorities(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_forwardings ADD CONSTRAINT comun_sidewalk_forwardings_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.comun_sidewalk_priorities(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_priorities ADD CONSTRAINT comun_sidewalk_priorities_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'approved'::text, 'rejected'::text, 'archived'::text]));;

ALTER TABLE public.comun_sidewalk_priorities ADD CONSTRAINT comun_sidewalk_priorities_synthesis_id_fkey FOREIGN KEY (synthesis_id) REFERENCES public.comun_circle_syntheses(id) ON DELETE SET NULL;;

GRANT ALL ON public.comun_sidewalk_priorities TO service_role;;

CREATE INDEX comun_sidewalk_priorities_pauta_idx ON public.comun_sidewalk_priorities (pauta_id, status);;

CREATE TRIGGER comun_sidewalk_priorities_updated_at BEFORE UPDATE ON public.comun_sidewalk_priorities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_sidewalk_record_corrections (id uuid DEFAULT gen_random_uuid() NOT NULL, record_id uuid NOT NULL, correction_type text NOT NULL, request_note_public text, previous_value jsonb, new_value jsonb, review_status text DEFAULT 'pending'::text NOT NULL, reviewed_by text, reviewed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_record_corrections ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_record_corrections ADD CONSTRAINT comun_sidewalk_record_corrections_correction_type_check CHECK (correction_type = ANY (ARRAY['category'::text, 'context'::text, 'photo_replacement'::text, 'location_hidden'::text, 'contest'::text, 'other'::text]));;

ALTER TABLE public.comun_sidewalk_record_corrections ADD CONSTRAINT comun_sidewalk_record_corrections_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_record_corrections ADD CONSTRAINT comun_sidewalk_record_corrections_review_status_check CHECK (review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));;

GRANT ALL ON public.comun_sidewalk_record_corrections TO service_role;;

CREATE INDEX comun_sidewalk_record_corrections_record_idx ON public.comun_sidewalk_record_corrections (record_id, review_status);;

CREATE TABLE public.comun_sidewalk_record_links (id uuid DEFAULT gen_random_uuid() NOT NULL, record_id uuid NOT NULL, target_type text NOT NULL, target_id uuid NOT NULL, public_note text, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_record_links ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_record_links ADD CONSTRAINT comun_sidewalk_record_links_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_record_links ADD CONSTRAINT comun_sidewalk_record_links_record_id_target_type_target_id_key UNIQUE (record_id, target_type, target_id);;

ALTER TABLE public.comun_sidewalk_record_links ADD CONSTRAINT comun_sidewalk_record_links_target_type_check CHECK (target_type = ANY (ARRAY['action'::text, 'task'::text, 'protocol'::text, 'result'::text, 'artwork'::text, 'radio_episode'::text, 'memory'::text]));;

GRANT ALL ON public.comun_sidewalk_record_links TO service_role;;

CREATE INDEX comun_sidewalk_record_links_target_idx ON public.comun_sidewalk_record_links (target_type, target_id);;

CREATE TABLE public.comun_sidewalk_record_photos (id uuid DEFAULT gen_random_uuid() NOT NULL, record_id uuid NOT NULL, archive_item_id uuid, original_asset_id uuid, derivative_asset_id uuid, review_status text DEFAULT 'pending'::text NOT NULL, review_notes_private text, checklist jsonb DEFAULT '{}'::jsonb NOT NULL, is_public boolean DEFAULT false NOT NULL, public_alt_text text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_record_photos ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_record_photos ADD CONSTRAINT comun_sidewalk_record_photos_archive_item_id_fkey FOREIGN KEY (archive_item_id) REFERENCES public.comun_archive_items(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_record_photos ADD CONSTRAINT comun_sidewalk_record_photos_checklist_check CHECK (jsonb_typeof(checklist) = 'object'::text);;

ALTER TABLE public.comun_sidewalk_record_photos ADD CONSTRAINT comun_sidewalk_record_photos_derivative_asset_id_fkey FOREIGN KEY (derivative_asset_id) REFERENCES public.comun_archive_assets(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_record_photos ADD CONSTRAINT comun_sidewalk_record_photos_original_asset_id_fkey FOREIGN KEY (original_asset_id) REFERENCES public.comun_archive_assets(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_record_photos ADD CONSTRAINT comun_sidewalk_record_photos_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_record_photos ADD CONSTRAINT comun_sidewalk_record_photos_review_status_check CHECK (review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'approved_without_image'::text, 'replacement_requested'::text, 'restricted'::text, 'rejected'::text]));;

GRANT ALL ON public.comun_sidewalk_record_photos TO service_role;;

CREATE INDEX comun_sidewalk_record_photos_record_idx ON public.comun_sidewalk_record_photos (record_id, review_status, is_public);;

CREATE TRIGGER comun_sidewalk_record_photos_updated_at BEFORE UPDATE ON public.comun_sidewalk_record_photos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE TABLE public.comun_sidewalk_record_withdrawals (id uuid DEFAULT gen_random_uuid() NOT NULL, record_id uuid NOT NULL, request_note_private text, review_status text DEFAULT 'pending'::text NOT NULL, reviewed_by text, withdrawn_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL);;

ALTER TABLE public.comun_sidewalk_record_withdrawals ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_record_withdrawals ADD CONSTRAINT comun_sidewalk_record_withdrawals_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_record_withdrawals ADD CONSTRAINT comun_sidewalk_record_withdrawals_review_status_check CHECK (review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));;

GRANT ALL ON public.comun_sidewalk_record_withdrawals TO service_role;;

CREATE INDEX comun_sidewalk_record_withdrawals_record_idx ON public.comun_sidewalk_record_withdrawals (record_id, review_status);;

CREATE TABLE public.comun_sidewalk_records (id uuid DEFAULT gen_random_uuid() NOT NULL, pauta_id uuid NOT NULL, territory_id uuid, slug text NOT NULL, name text NOT NULL, geometry_geojson jsonb, categories text[] DEFAULT '{}'::text[] NOT NULL, impact_level text NOT NULL, affected_groups text[] DEFAULT '{}'::text[] NOT NULL, status text DEFAULT 'pending'::text NOT NULL, verification_status text DEFAULT 'unverified'::text NOT NULL, visibility text DEFAULT 'internal'::text NOT NULL, public_summary text NOT NULL, private_notes text, methodology_version_id uuid, source_contribution_id uuid, source_observation_id uuid, public_location_level text DEFAULT 'approximate'::text NOT NULL, approximate_location text, resolved_at timestamp with time zone, resolved_result_id uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, member_user_id uuid, municipality text, neighborhood text, private_geometry_geojson jsonb, public_geometry_geojson jsonb, location_source text DEFAULT 'manual'::text NOT NULL, location_precision text DEFAULT 'approximate'::text NOT NULL, condition text DEFAULT 'regular'::text NOT NULL, forwarding_status text DEFAULT 'no_action'::text NOT NULL, last_observed_at timestamp with time zone DEFAULT now() NOT NULL, submitter_is_anonymous boolean DEFAULT false NOT NULL, location_accuracy_m numeric(10,2), suggested_public_geometry_geojson jsonb, inferred_street text, inferred_neighborhood text, geographic_risk text DEFAULT 'unreviewed'::text NOT NULL);;

COMMENT ON COLUMN public.comun_sidewalk_records.member_user_id IS 'Private ownership link. Never expose in public queries or HTML.';;

COMMENT ON COLUMN public.comun_sidewalk_records.private_geometry_geojson IS 'Geometria original privada; nunca selecionar em consultas públicas.';;

COMMENT ON COLUMN public.comun_sidewalk_records.public_geometry_geojson IS 'Geometria sanitizada aprovada para exibição pública.';;

COMMENT ON COLUMN public.comun_sidewalk_records.submitter_is_anonymous IS 'Sinal derivado do JWT no envio; não concede papel comunitário ou editorial.';;

COMMENT ON COLUMN public.comun_sidewalk_records.location_accuracy_m IS 'Precisão original privada do GPS; nunca selecionar em projeções públicas.';;

COMMENT ON COLUMN public.comun_sidewalk_records.suggested_public_geometry_geojson IS 'Sugestão interna do moderador, distinta da geometria pública aprovada.';;

ALTER TABLE public.comun_sidewalk_records ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_accuracy_check CHECK (location_accuracy_m IS NULL OR location_accuracy_m >= 0::numeric AND location_accuracy_m <= 100000::numeric);;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_private_geometry_check CHECK (private_geometry_geojson IS NULL OR jsonb_typeof(private_geometry_geojson) = 'object'::text AND ((private_geometry_geojson ->> 'type'::text) = ANY (ARRAY['Point'::text, 'LineString'::text])) AND private_geometry_geojson ? 'coordinates'::text);;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_public_geometry_check CHECK (public_geometry_geojson IS NULL OR jsonb_typeof(public_geometry_geojson) = 'object'::text AND ((public_geometry_geojson ->> 'type'::text) = ANY (ARRAY['Point'::text, 'LineString'::text])) AND public_geometry_geojson ? 'coordinates'::text);;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_condition_check CHECK (condition = ANY (ARRAY['good'::text, 'regular'::text, 'bad'::text, 'terrible'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_forwarding_status_check CHECK (forwarding_status = ANY (ARRAY['no_action'::text, 'priority'::text, 'forwarded'::text, 'waiting_response'::text, 'in_progress'::text, 'resolved'::text, 'reopened'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_geographic_risk_check CHECK (geographic_risk = ANY (ARRAY['unreviewed'::text, 'low'::text, 'medium'::text, 'high'::text, 'sensitive'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_geometry_geojson_check CHECK (jsonb_typeof(geometry_geojson) = 'object'::text AND ((geometry_geojson ->> 'type'::text) = ANY (ARRAY['Point'::text, 'LineString'::text])) AND geometry_geojson ? 'coordinates'::text AND (NOT geometry_geojson ? 'properties'::text OR (geometry_geojson -> 'properties'::text) = '{}'::jsonb));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_impact_level_check CHECK (impact_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_location_precision_check CHECK (location_precision = ANY (ARRAY['exact'::text, 'approximate'::text, 'neighborhood'::text, 'hidden'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_location_source_check CHECK (location_source = ANY (ARRAY['manual'::text, 'device'::text, 'neighborhood'::text, 'editorial'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_member_user_id_fkey FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_methodology_version_id_fkey FOREIGN KEY (methodology_version_id) REFERENCES public.comun_observatory_methodologies(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.comun_pauta_spaces(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_hub_results ADD CONSTRAINT comun_hub_results_sidewalk_record_id_fkey FOREIGN KEY (sidewalk_record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_mobilization_actions ADD CONSTRAINT comun_mobilization_actions_sidewalk_record_id_fkey FOREIGN KEY (sidewalk_record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_observations ADD CONSTRAINT comun_observations_sidewalk_record_id_fkey FOREIGN KEY (sidewalk_record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_official_protocols ADD CONSTRAINT comun_official_protocols_sidewalk_record_id_fkey FOREIGN KEY (sidewalk_record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_episodes ADD CONSTRAINT comun_radio_episodes_sidewalk_record_id_fkey FOREIGN KEY (sidewalk_record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_radio_programs ADD CONSTRAINT comun_radio_programs_sidewalk_record_id_fkey FOREIGN KEY (sidewalk_record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_cycle_memories ADD CONSTRAINT comun_sidewalk_cycle_memories_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_observations ADD CONSTRAINT comun_sidewalk_observations_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_priorities ADD CONSTRAINT comun_sidewalk_priorities_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_record_corrections ADD CONSTRAINT comun_sidewalk_record_corrections_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_record_links ADD CONSTRAINT comun_sidewalk_record_links_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_record_photos ADD CONSTRAINT comun_sidewalk_record_photos_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_record_withdrawals ADD CONSTRAINT comun_sidewalk_record_withdrawals_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_public_location_level_check CHECK (public_location_level = ANY (ARRAY['exact'::text, 'approximate'::text, 'neighborhood'::text, 'hidden'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_resolved_result_id_fkey FOREIGN KEY (resolved_result_id) REFERENCES public.comun_hub_results(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_slug_key UNIQUE (slug);;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_source_contribution_id_fkey FOREIGN KEY (source_contribution_id) REFERENCES public.comun_territorial_contributions(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_source_observation_id_fkey FOREIGN KEY (source_observation_id) REFERENCES public.comun_observations(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_status_check CHECK (status = ANY (ARRAY['pending'::text, 'under_review'::text, 'verified'::text, 'published'::text, 'rejected'::text, 'withdrawn'::text, 'archived'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.comun_hub_territories(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_verification_status_check CHECK (verification_status = ANY (ARRAY['unverified'::text, 'community_report'::text, 'source_checked'::text, 'verified'::text, 'disputed'::text, 'outdated'::text]));;

ALTER TABLE public.comun_sidewalk_records ADD CONSTRAINT comun_sidewalk_records_visibility_check CHECK (visibility = ANY (ARRAY['public'::text, 'internal'::text, 'archived'::text]));;

GRANT ALL ON public.comun_sidewalk_records TO service_role;;

CREATE INDEX comun_sidewalk_records_territory_idx ON public.comun_sidewalk_records (territory_id, status);;

CREATE INDEX comun_sidewalk_records_filter_idx ON public.comun_sidewalk_records (pauta_id, condition, forwarding_status, last_observed_at DESC) WHERE visibility = 'public'::text AND (status = ANY (ARRAY['verified'::text, 'published'::text]));;

CREATE INDEX comun_sidewalk_anonymous_rate_idx ON public.comun_sidewalk_records (member_user_id, created_at DESC) WHERE submitter_is_anonymous IS TRUE;;

CREATE INDEX comun_sidewalk_records_member_idx ON public.comun_sidewalk_records (member_user_id, created_at DESC) WHERE member_user_id IS NOT NULL;;

CREATE INDEX comun_sidewalk_records_public_idx ON public.comun_sidewalk_records (pauta_id, status, visibility, impact_level);;

CREATE TRIGGER comun_sidewalk_records_updated_at BEFORE UPDATE ON public.comun_sidewalk_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;

CREATE POLICY member_reads_own_sidewalk_records ON public.comun_sidewalk_records FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = member_user_id));;

CREATE TABLE public.comun_sidewalk_uploads (id uuid DEFAULT gen_random_uuid() NOT NULL, member_user_id uuid NOT NULL, object_key text NOT NULL, original_filename text NOT NULL, declared_mime_type text NOT NULL, declared_size_bytes bigint NOT NULL, submission_payload jsonb DEFAULT '{}'::jsonb NOT NULL, status text DEFAULT 'awaiting_upload'::text NOT NULL, expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL, uploaded_at timestamp with time zone, confirmed_at timestamp with time zone, failure_code text, record_id uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);;

COMMENT ON TABLE public.comun_sidewalk_uploads IS 'Autorizações efêmeras de upload direto. Payload e object_key são privados.';;

COMMENT ON COLUMN public.comun_sidewalk_uploads.submission_payload IS 'Metadados privados necessários à confirmação; nunca projetar publicamente.';;

ALTER TABLE public.comun_sidewalk_uploads ENABLE ROW LEVEL SECURITY;;

ALTER TABLE public.comun_sidewalk_uploads ADD CONSTRAINT comun_sidewalk_uploads_declared_mime_type_check CHECK (declared_mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]));;

ALTER TABLE public.comun_sidewalk_uploads ADD CONSTRAINT comun_sidewalk_uploads_declared_size_bytes_check CHECK (declared_size_bytes >= 12 AND declared_size_bytes <= 31457280);;

ALTER TABLE public.comun_sidewalk_uploads ADD CONSTRAINT comun_sidewalk_uploads_member_user_id_fkey FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;;

ALTER TABLE public.comun_sidewalk_uploads ADD CONSTRAINT comun_sidewalk_uploads_object_key_key UNIQUE (object_key);;

ALTER TABLE public.comun_sidewalk_uploads ADD CONSTRAINT comun_sidewalk_uploads_pkey PRIMARY KEY (id);;

ALTER TABLE public.comun_sidewalk_uploads ADD CONSTRAINT comun_sidewalk_uploads_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.comun_sidewalk_records(id) ON DELETE SET NULL;;

ALTER TABLE public.comun_sidewalk_uploads ADD CONSTRAINT comun_sidewalk_uploads_status_check CHECK (status = ANY (ARRAY['draft'::text, 'awaiting_upload'::text, 'uploaded'::text, 'confirmed'::text, 'upload_failed'::text, 'abandoned'::text]));;

GRANT SELECT ON public.comun_sidewalk_uploads TO authenticated;;

GRANT ALL ON public.comun_sidewalk_uploads TO service_role;;

CREATE INDEX comun_sidewalk_uploads_owner_idx ON public.comun_sidewalk_uploads (member_user_id, created_at DESC);;

CREATE INDEX comun_sidewalk_uploads_cleanup_idx ON public.comun_sidewalk_uploads (status, expires_at) WHERE status = ANY (ARRAY['draft'::text, 'awaiting_upload'::text, 'uploaded'::text, 'upload_failed'::text]);;

CREATE POLICY member_reads_own_sidewalk_uploads ON public.comun_sidewalk_uploads FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = member_user_id));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_system_verification_runs FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_system_verification_runs FROM authenticated;;

ALTER TABLE public.comun_territorial_contributions ADD CONSTRAINT comun_territorial_contributions_contribution_type_check CHECK (contribution_type = ANY (ARRAY['new_point'::text, 'correct_point'::text, 'material_acceptance'::text, 'point_full'::text, 'organization'::text, 'need_update'::text, 'property'::text, 'document'::text, 'social_use'::text, 'history'::text, 'sidewalk_observation'::text, 'sidewalk_photo'::text]));;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_contributions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_contributions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_layers FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_layers FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_need_interests FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_need_interests FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_needs FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_needs FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_organization_materials FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_organization_materials FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_organizations FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_organizations FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_ownership_assertions FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_ownership_assertions FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_properties FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_properties FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_social_use_proposals FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_social_use_proposals FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_sources FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territorial_sources FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territory_layers FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_territory_layers FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_transport_lines FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_transport_lines FROM authenticated;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_transport_stops FROM anon;;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comun_transport_stops FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_public_reports FROM anon;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_public_reports FROM authenticated;;

REVOKE DELETE, INSERT, UPDATE ON public.comun_public_reports FROM service_role;;
