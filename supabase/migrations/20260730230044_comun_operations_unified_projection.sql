-- A Central continua sendo uma projeção reconstruível. As fontes canônicas
-- permanecem donas das decisões e do conteúdo privado.
alter table public.comun_editorial_operation_items
  add column source_domain text not null default 'legacy',
  add column source_key text,
  add column source_version text not null default 'legacy',
  add column work_category text not null default 'legacy_triage',
  add column idempotency_key text,
  add column required_role text,
  add column sla_state text not null default 'not_applicable',
  add column pause_reason text,
  add column source_updated_at timestamptz,
  add column last_synced_at timestamptz not null default now(),
  add column resolved_at timestamptz,
  add column projection_contract text not null default 'legacy';

update public.comun_editorial_operation_items
set source_key = coalesce(source_id::text, id::text),
    idempotency_key = concat('legacy:', id::text)
where source_key is null or idempotency_key is null;

alter table public.comun_editorial_operation_items
  alter column source_key set not null,
  alter column idempotency_key set not null,
  add constraint comun_editorial_operation_source_domain_check
    check (source_domain in (
      'legacy','communities','pautas','actions','protocols','sidewalks',
      'archive','radio','art','platform'
    )),
  add constraint comun_editorial_operation_sla_state_check
    check (sla_state in (
      'within_sla','due_soon','overdue','paused_for_information',
      'blocked_by_third_party','not_applicable'
    )),
  add constraint comun_editorial_operation_required_role_check
    check (
      required_role is null or required_role in (
        'operations_admin','privacy_reviewer','rights_reviewer','archive_curator',
        'coordinator','facilitator','contribution_reviewer','image_reviewer',
        'protocol_operator','result_editor','radio_editor','art_editor'
      )
    ),
  add constraint comun_editorial_operation_projection_contract_check
    check (projection_contract in ('legacy','operations-v1')),
  add constraint comun_editorial_operation_source_key_check
    check (char_length(source_key) between 1 and 180),
  add constraint comun_editorial_operation_source_version_check
    check (char_length(source_version) between 1 and 180),
  add constraint comun_editorial_operation_work_category_check
    check (char_length(work_category) between 3 and 80),
  add constraint comun_editorial_operation_idempotency_key_check
    check (char_length(idempotency_key) between 8 and 300);

create unique index comun_editorial_operation_idempotency_key_unique
  on public.comun_editorial_operation_items(idempotency_key);
create index comun_editorial_operation_domain_queue_idx
  on public.comun_editorial_operation_items(source_domain, queue, state, priority);
create index comun_editorial_operation_sla_idx
  on public.comun_editorial_operation_items(sla_state, indicative_due_at)
  where state not in ('resolved','withdrawn');
create index comun_editorial_operation_sync_idx
  on public.comun_editorial_operation_items(projection_contract, last_synced_at);

alter table public.comun_editorial_operation_assignments
  add column assignment_kind text not null default 'responsible',
  add constraint comun_editorial_operation_assignment_kind_check
    check (assignment_kind in ('responsible','support'));

alter table public.comun_editorial_operation_assignments
  drop constraint comun_editorial_operation_assignments_role_at_assignment_check,
  drop constraint comun_editorial_operation_assignments_status_check;
alter table public.comun_editorial_operation_assignments
  add constraint comun_editorial_operation_assignments_role_at_assignment_check
    check (role_at_assignment in (
      'admin','editor','factual_reviewer','editorial_reviewer','publisher','viewer',
      'operations_admin','privacy_reviewer','rights_reviewer','archive_curator',
      'coordinator','facilitator','contribution_reviewer','image_reviewer',
      'protocol_operator','result_editor','radio_editor','art_editor'
    )),
  add constraint comun_editorial_operation_assignments_status_check
    check (status in ('active','completed','cancelled','released'));

alter table public.comun_editorial_operation_items
  drop constraint comun_editorial_operation_items_source_type_check;
alter table public.comun_editorial_operation_items
  add constraint comun_editorial_operation_items_source_type_check
    check (source_type in (
      'contribution','record','photo','observation','proposal','task','protocol',
      'correction','withdrawal','alert','community_request','role_review',
      'synthesis','decision','action','forwarding','response','result',
      'sidewalk_record','sidewalk_upload','archive_submission','archive_asset',
      'radio_item','artwork','incident'
    ));

-- A consulta continua service-role only. Ela agrega recortes cotidianos sem
-- devolver qualquer conteúdo da fonte.
create or replace function public.list_comun_operational_items(
  p_page integer default 1,
  p_page_size integer default 20,
  p_queue text default null,
  p_status text default null,
  p_priority smallint default null,
  p_assigned_to uuid default null,
  p_unassigned boolean default false,
  p_pauta_id uuid default null,
  p_territory_id uuid default null,
  p_due_state text default null,
  p_source_type text default null,
  p_search text default null,
  p_sort text default 'urgent'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
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
      and (p_assigned_to is null or exists (
        select 1 from public.comun_editorial_operation_assignments a
        where a.item_id = i.id and a.status = 'active'
          and a.assignee_profile_id = p_assigned_to
      ))
      and (not coalesce(p_unassigned, false) or not exists (
        select 1 from public.comun_editorial_operation_assignments a
        where a.item_id = i.id and a.status = 'active'
      ))
      and (p_due_state is null
        or (p_due_state = 'overdue' and i.sla_state = 'overdue')
        or (p_due_state = 'soon' and i.sla_state = 'due_soon')
        or (p_due_state = 'blocked_by_third_party' and i.sla_state = 'blocked_by_third_party'))
      and (nullif(btrim(p_search), '') is null
        or concat_ws(' ', i.title, i.public_reason, i.next_action)
          ilike '%' || btrim(p_search) || '%')
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
        and (p_assigned_to is null or exists (
          select 1 from public.comun_editorial_operation_assignments a
          where a.item_id = i.id and a.status = 'active'
            and a.assignee_profile_id = p_assigned_to
        ))
        and (not coalesce(p_unassigned, false) or not exists (
          select 1 from public.comun_editorial_operation_assignments a
          where a.item_id = i.id and a.status = 'active'
        ))
        and (p_due_state is null
          or (p_due_state = 'overdue' and i.sla_state = 'overdue')
          or (p_due_state = 'soon' and i.sla_state = 'due_soon')
          or (p_due_state = 'blocked_by_third_party' and i.sla_state = 'blocked_by_third_party'))
        and (nullif(btrim(p_search), '') is null
          or concat_ws(' ', i.title, i.public_reason, i.next_action)
            ilike '%' || btrim(p_search) || '%')
    ), ordered as (
      select * from filtered
      order by
        case when p_sort = 'urgent' and queue in ('withdrawals','safety') then 0 else 1 end,
        case when p_sort = 'urgent' and sla_state = 'overdue' then 0 else 1 end,
        case when p_sort in ('urgent','priority') then priority end asc nulls last,
        case when p_sort in ('urgent','deadline') then indicative_due_at end asc nulls last,
        case when p_sort = 'oldest' then created_at end asc nulls last,
        case when p_sort = 'newest' then created_at end desc nulls last,
        case when p_sort = 'next_action' then lower(coalesce(next_action, '')) end asc nulls last,
        id asc
      limit safe_size offset page_offset
    ), queue_counts as (
      select coalesce(jsonb_object_agg(queue, total), '{}'::jsonb) as value
      from (select queue, count(*)::integer as total from filtered group by queue) counted
    ), summary as (
      select jsonb_build_object(
        'p1', count(*) filter (where priority = 1),
        'overdue', count(*) filter (where sla_state = 'overdue'),
        'unassigned', count(*) filter (where not exists (
          select 1 from public.comun_editorial_operation_assignments a
          where a.item_id = filtered.id and a.status = 'active'
        )),
        'blocked', count(*) filter (where state = 'blocked'),
        'waitingThirdParty', count(*) filter (where sla_state = 'blocked_by_third_party'),
        'withdrawals', count(*) filter (where queue = 'withdrawals'),
        'incidents', count(*) filter (where source_type = 'incident')
      ) as value from filtered
    )
    select jsonb_build_object(
      'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'queue', o.queue, 'state', o.state, 'title', o.title,
        'publicReason', o.public_reason, 'nextAction', o.next_action,
        'priority', o.priority, 'indicativeDueAt', o.indicative_due_at,
        'humanGate', o.human_gate, 'sourceType', o.source_type,
        'sourceDomain', o.source_domain, 'requiredRole', o.required_role,
        'slaState', o.sla_state, 'lastSyncedAt', o.last_synced_at,
        'pautaId', o.pauta_id, 'pautaTitle', o.pauta_title,
        'territoryId', o.territory_id, 'territoryName', o.territory_name,
        'createdAt', o.created_at,
        'assignees', coalesce((select jsonb_agg(jsonb_build_object(
          'id', ap.id, 'displayName', ap.display_name,
          'role', a.role_at_assignment, 'kind', a.assignment_kind
        )) from public.comun_editorial_operation_assignments a
          join public.comun_admin_profiles ap on ap.id = a.assignee_profile_id
          where a.item_id = o.id and a.status = 'active'), '[]'::jsonb)
      ) order by o.id) from ordered o), '[]'::jsonb),
      'pageInfo', jsonb_build_object(
        'page', safe_page, 'pageSize', safe_size, 'totalItems', total_items,
        'totalPages', total_pages, 'hasPrevious', safe_page > 1,
        'hasNext', safe_page < total_pages
      ),
      'queueCounts', (select value from queue_counts),
      'summary', (select value from summary),
      'totalGeneral', (select count(*)::integer from public.comun_editorial_operation_items)
    )
  );
end;
$$;

revoke all on function public.list_comun_operational_items(
  integer, integer, text, text, smallint, uuid, boolean, uuid, uuid,
  text, text, text, text
) from public, anon, authenticated;
grant execute on function public.list_comun_operational_items(
  integer, integer, text, text, smallint, uuid, boolean, uuid, uuid,
  text, text, text, text
) to service_role;
