-- One service-role RPC keeps the operational central finite: aggregate counts and
-- the current page are computed in the database, rather than transferring a
-- growing queue to React.  Existing queue/state/priority/created_at index covers
-- the measured default path; no additional index is introduced without evidence.
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
$$;

revoke all on function public.list_comun_operational_items(integer, integer, text, text, smallint, uuid, boolean, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.list_comun_operational_items(integer, integer, text, text, smallint, uuid, boolean, uuid, uuid, text, text, text, text) to service_role;
