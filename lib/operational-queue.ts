import {
  OPERATION_QUEUES,
  type OperationQueue,
} from "@/lib/editorial-operation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const STATES = [
  "pending",
  "assigned",
  "in_review",
  "blocked",
  "ready",
  "published",
  "resolved",
  "withdrawn",
] as const;
const SOURCE_TYPES = [
  "contribution",
  "record",
  "photo",
  "observation",
  "proposal",
  "task",
  "protocol",
  "correction",
  "withdrawal",
  "alert",
  "community_request",
  "role_review",
  "synthesis",
  "decision",
  "action",
  "forwarding",
  "response",
  "result",
  "sidewalk_record",
  "sidewalk_upload",
  "archive_submission",
  "archive_asset",
  "radio_item",
  "artwork",
  "incident",
] as const;
const SORTS = [
  "urgent",
  "deadline",
  "oldest",
  "newest",
  "priority",
  "next_action",
] as const;
const MAX_PAGE_SIZE = 25;
const DEFAULT_PAGE_SIZE = 20;

export type OperationalQuery = {
  page: number;
  pageSize: number;
  queue?: OperationQueue;
  status?: (typeof STATES)[number];
  priority?: 1 | 2 | 3 | 4;
  assignedTo?: string;
  unassigned?: boolean;
  pautaId?: string;
  territoryId?: string;
  dueState?: "overdue" | "soon" | "blocked_by_third_party";
  sourceType?: (typeof SOURCE_TYPES)[number];
  search?: string;
  sort: (typeof SORTS)[number];
};
export type OperationalItem = {
  id: string;
  queue: OperationQueue;
  state: string;
  title: string;
  publicReason: string | null;
  nextAction: string | null;
  priority: number;
  indicativeDueAt: string | null;
  humanGate: string | null;
  sourceType: string;
  sourceDomain: string;
  requiredRole: string | null;
  slaState: string;
  lastSyncedAt: string;
  pautaId: string | null;
  pautaTitle: string | null;
  territoryId: string | null;
  territoryName: string | null;
  createdAt: string;
  assignees: { id: string; displayName: string; role: string; kind?: string }[];
};
export type OperationalSummary = {
  p1: number;
  overdue: number;
  unassigned: number;
  blocked: number;
  waitingThirdParty: number;
  withdrawals: number;
  incidents: number;
};
export type OperationalResult = {
  items: OperationalItem[];
  pageInfo: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
  queueCounts: Record<string, number>;
  summary: OperationalSummary;
  totalGeneral: number;
  activeFilters: OperationalQuery;
};
type ParamValue = string | string[] | undefined;

function value(params: Record<string, ParamValue>, key: string) {
  const candidate = params[key];
  return Array.isArray(candidate) ? candidate[0] : candidate;
}
function positiveInteger(raw: string | undefined, fallback: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function oneOf<T extends readonly string[]>(
  candidate: string | undefined,
  values: T,
): T[number] | undefined {
  return candidate && values.includes(candidate)
    ? (candidate as T[number])
    : undefined;
}
function uuid(candidate: string | undefined) {
  return candidate &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      candidate,
    )
    ? candidate
    : undefined;
}

export function normalizeOperationalQuery(
  params: Record<string, ParamValue>,
): OperationalQuery {
  const search = value(params, "search")?.trim().slice(0, 120);
  const rawPriority = positiveInteger(value(params, "priority"), 0);
  return {
    page: positiveInteger(value(params, "page"), 1),
    pageSize: Math.min(
      positiveInteger(value(params, "pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    ),
    queue: oneOf(value(params, "queue"), OPERATION_QUEUES),
    status: oneOf(value(params, "status"), STATES),
    priority:
      rawPriority >= 1 && rawPriority <= 4
        ? (rawPriority as 1 | 2 | 3 | 4)
        : undefined,
    assignedTo: uuid(value(params, "assignedTo")),
    unassigned: value(params, "unassigned") === "1",
    pautaId: uuid(value(params, "pautaId")),
    territoryId: uuid(value(params, "territoryId")),
    dueState: oneOf(value(params, "dueState"), [
      "overdue",
      "soon",
      "blocked_by_third_party",
    ] as const),
    sourceType: oneOf(value(params, "type"), SOURCE_TYPES),
    search: search || undefined,
    sort: oneOf(value(params, "sort"), SORTS) ?? "urgent",
  };
}

export function operationalQueryHref(
  query: OperationalQuery,
  changes: Partial<OperationalQuery> = {},
) {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();
  const put = (key: string, val: string | number | boolean | undefined) => {
    if (val !== undefined && val !== false && val !== "")
      params.set(key, String(val));
  };
  put("page", next.page);
  put("pageSize", next.pageSize);
  put("queue", next.queue);
  put("status", next.status);
  put("priority", next.priority);
  put("assignedTo", next.assignedTo);
  put("unassigned", next.unassigned ? "1" : undefined);
  put("pautaId", next.pautaId);
  put("territoryId", next.territoryId);
  put("dueState", next.dueState);
  put("type", next.sourceType);
  put("search", next.search);
  put("sort", next.sort);
  return `/comun/admin/operacao?${params.toString()}`;
}

export async function listOperationalItems(
  query: OperationalQuery,
): Promise<OperationalResult> {
  const db = createServiceSupabaseClient();
  const fallback: OperationalResult = {
    items: [],
    pageInfo: {
      page: 1,
      pageSize: query.pageSize,
      totalItems: 0,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    },
    queueCounts: {},
    summary: {
      p1: 0,
      overdue: 0,
      unassigned: 0,
      blocked: 0,
      waitingThirdParty: 0,
      withdrawals: 0,
      incidents: 0,
    },
    totalGeneral: 0,
    activeFilters: query,
  };
  if (!db) return fallback;
  const call = db.rpc.bind(db) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await call("list_comun_operational_items", {
    p_page: query.page,
    p_page_size: query.pageSize,
    p_queue: query.queue ?? null,
    p_status: query.status ?? null,
    p_priority: query.priority ?? null,
    p_assigned_to: query.assignedTo ?? null,
    p_unassigned: query.unassigned ?? false,
    p_pauta_id: query.pautaId ?? null,
    p_territory_id: query.territoryId ?? null,
    p_due_state: query.dueState ?? null,
    p_source_type: query.sourceType ?? null,
    p_search: query.search ?? null,
    p_sort: query.sort,
  });
  if (error)
    throw new Error(
      `Não foi possível consultar a fila operacional: ${error.message}`,
    );
  const raw = data as Omit<OperationalResult, "activeFilters">;
  return {
    ...raw,
    items: Array.isArray(raw?.items) ? raw.items : [],
    queueCounts: raw?.queueCounts ?? {},
    summary: raw?.summary ?? fallback.summary,
    pageInfo: raw?.pageInfo ?? fallback.pageInfo,
    totalGeneral: raw?.totalGeneral ?? 0,
    activeFilters: query,
  };
}

export type OperationalFilterOptions = {
  assignees: { id: string; name: string }[];
  pautas: { id: string; name: string }[];
  territories: { id: string; name: string }[];
};
export async function listOperationalFilterOptions(): Promise<OperationalFilterOptions> {
  const db = createServiceSupabaseClient();
  const fallback: OperationalFilterOptions = {
    assignees: [],
    pautas: [],
    territories: [],
  };
  if (!db) return fallback;
  const [assignees, pautas, territories] = await Promise.all([
    db
      .from("comun_admin_profiles")
      .select("id,display_name")
      .eq("active", true)
      .order("display_name")
      .limit(100),
    db.from("comun_pauta_spaces").select("id,title").order("title").limit(100),
    db.from("comun_hub_territories").select("id,name").order("name").limit(100),
  ]);
  return {
    assignees: (assignees.data ?? []).map((item) => ({
      id: item.id,
      name: item.display_name,
    })),
    pautas: (pautas.data ?? []).map((item) => ({
      id: item.id,
      name: item.title,
    })),
    territories: (territories.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
    })),
  };
}

export function activeOperationalFilters(query: OperationalQuery) {
  return Object.entries({
    queue: query.queue,
    status: query.status,
    prioridade: query.priority,
    responsável: query.assignedTo,
    sem_responsável: query.unassigned ? "sim" : undefined,
    prazo: query.dueState,
    tipo: query.sourceType,
    busca: query.search,
  }).filter(([, item]) => item !== undefined);
}
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SORTS, STATES, SOURCE_TYPES };
