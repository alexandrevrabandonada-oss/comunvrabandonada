import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const publicCollectiveActionStatuses = [
  "open",
  "active",
  "awaiting_result",
  "completed",
] as const;
export const publicCollectiveTaskStates = [
  "open",
  "in_progress",
  "done",
] as const;
export const publicCollectiveUpdateTypes = [
  "announcement",
  "progress",
  "meeting",
  "protocol",
  "response",
  "result",
  "memory",
] as const;

export type PublicCollectiveActionStatusV1 =
  (typeof publicCollectiveActionStatuses)[number];
export type PublicCollectiveTaskStateV1 =
  (typeof publicCollectiveTaskStates)[number];

export type PublicCollectiveActionRelationV1 = {
  slug: string;
  title: string;
};

export type PublicCollectiveActionSummaryV1 = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  objective: string;
  actionType: string;
  status: PublicCollectiveActionStatusV1;
  territoryLabel: string | null;
  meetingPlace: string | null;
  startsAt: string | null;
  endsAt: string | null;
  participationMode: string;
  pauta: PublicCollectiveActionRelationV1 | null;
  community: PublicCollectiveActionRelationV1 | null;
};

export type PublicCollectiveActionTaskV1 = {
  id: string;
  title: string;
  description: string;
  desiredCount: number;
  assumedCount: number;
  dueAt: string | null;
  state: PublicCollectiveTaskStateV1;
  effortLevel: string;
  participationMode: string;
  availability: "available" | "full" | "closed" | "expired";
};

export type PublicCollectiveActionUpdateV1 = {
  id: string;
  updateType: (typeof publicCollectiveUpdateTypes)[number];
  title: string;
  publicSummary: string;
  occurredAt: string;
};

export type PublicCollectiveActionForwardingV1 = {
  recipientName: string | null;
  publicSummary: string | null;
  sentAt: string | null;
  protocolCode: string | null;
  expectedResponseAt: string | null;
  state: string;
  responsePublic: string | null;
  publicDocumentUrl: string | null;
  publicDocumentLabel: string | null;
};

export type PublicCollectiveActionMemoryAssetV1 = {
  id: string;
  assetKind: "document" | "photograph";
  title: string;
  publicUrl: string;
};

export type PublicCollectiveActionDetailV1 = PublicCollectiveActionSummaryV1 & {
  tasks: readonly PublicCollectiveActionTaskV1[];
  publicUpdates: readonly PublicCollectiveActionUpdateV1[];
  publicForwarding: PublicCollectiveActionForwardingV1 | null;
  publicMemory: {
    publishedAt: string | null;
    resultStatus: string | null;
    resultSummary: string | null;
    memorySummary: string | null;
    learnedSummary: string | null;
    nextStepsSummary: string | null;
    assets: readonly PublicCollectiveActionMemoryAssetV1[];
  };
  aggregateCounts: {
    interested: number;
    participating: number;
    tasksAssumed: number;
    updates: number;
    results: number;
  };
};

type UnknownRow = Record<string, unknown>;

function row(value: unknown): UnknownRow | null {
  return value && typeof value === "object" ? (value as UnknownRow) : null;
}
function text(value: unknown) {
  return typeof value === "string" ? value : null;
}
function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function relation(value: unknown): PublicCollectiveActionRelationV1 | null {
  const item = Array.isArray(value) ? row(value[0]) : row(value);
  const slug = text(item?.slug);
  const title = text(item?.title) ?? text(item?.name);
  return slug && title ? { slug, title } : null;
}
function isPublicStatus(
  value: unknown,
): value is PublicCollectiveActionStatusV1 {
  return publicCollectiveActionStatuses.includes(
    value as PublicCollectiveActionStatusV1,
  );
}

export function projectPublicCollectiveActionSummary(
  value: unknown,
): PublicCollectiveActionSummaryV1 | null {
  const item = row(value);
  if (!item || item.visibility !== "public" || !isPublicStatus(item.status))
    return null;
  const id = text(item.id);
  const slug = text(item.slug);
  const title = text(item.title);
  const summary = text(item.summary);
  const objective = text(item.objective);
  const actionType = text(item.action_type);
  const participationMode = text(item.participation_mode);
  if (
    !id ||
    !slug ||
    !title ||
    !summary ||
    !objective ||
    !actionType ||
    !participationMode
  )
    return null;
  return {
    id,
    slug,
    title,
    summary,
    objective,
    actionType,
    status: item.status,
    territoryLabel: text(item.territory_label),
    meetingPlace: text(item.meeting_place),
    startsAt: text(item.starts_at),
    endsAt: text(item.ends_at),
    participationMode,
    pauta: relation(item.pauta),
    community: relation(item.community),
  };
}

export function collectiveActionProcessOrder(
  status: PublicCollectiveActionStatusV1,
) {
  return { open: 0, active: 1, awaiting_result: 2, completed: 3 }[status];
}

export function sortPublicCollectiveActions<
  T extends PublicCollectiveActionSummaryV1,
>(actions: readonly T[]) {
  return [...actions].sort((a, b) => {
    const state =
      collectiveActionProcessOrder(a.status) -
      collectiveActionProcessOrder(b.status);
    if (state) return state;
    const aTime = Date.parse(a.startsAt ?? "") || Number.MAX_SAFE_INTEGER;
    const bTime = Date.parse(b.startsAt ?? "") || Number.MAX_SAFE_INTEGER;
    return aTime - bTime || a.slug.localeCompare(b.slug);
  });
}

function projectTask(value: unknown): PublicCollectiveActionTaskV1 | null {
  const item = row(value);
  const state = text(item?.state);
  if (
    !item ||
    !publicCollectiveTaskStates.includes(state as PublicCollectiveTaskStateV1)
  )
    return null;
  const id = text(item.id),
    title = text(item.title),
    description = text(item.description);
  const effortLevel = text(item.effort_level),
    participationMode = text(item.participation_mode);
  if (!id || !title || !description || !effortLevel || !participationMode)
    return null;
  const desiredCount = count(item.desired_count);
  const assumedCount = count(item.assumed_count);
  const dueAt = text(item.due_at);
  const expired = dueAt ? Date.parse(dueAt) < Date.now() : false;
  return {
    id,
    title,
    description,
    desiredCount,
    assumedCount,
    dueAt,
    state: state as PublicCollectiveTaskStateV1,
    effortLevel,
    participationMode,
    availability:
      state === "done"
        ? "closed"
        : expired
          ? "expired"
          : assumedCount >= desiredCount
            ? "full"
            : "available",
  };
}

function projectUpdate(value: unknown): PublicCollectiveActionUpdateV1 | null {
  const item = row(value);
  const updateType = text(item?.update_type);
  if (
    !item ||
    item.visibility !== "public" ||
    !publicCollectiveUpdateTypes.includes(
      updateType as PublicCollectiveActionUpdateV1["updateType"],
    )
  )
    return null;
  const id = text(item.id),
    title = text(item.title),
    publicSummary = text(item.public_summary),
    occurredAt = text(item.occurred_at);
  return id && title && publicSummary && occurredAt
    ? {
        id,
        updateType: updateType as PublicCollectiveActionUpdateV1["updateType"],
        title,
        publicSummary,
        occurredAt,
      }
    : null;
}

export function projectPublicCollectiveActionDetail(
  value: unknown,
): PublicCollectiveActionDetailV1 | null {
  const item = row(value);
  const action = projectPublicCollectiveActionSummary(value);
  if (!item || !action) return null;
  const forwardingCandidate = row(item.forwarding);
  const forwarding =
    forwardingCandidate?.public_visible === true ? forwardingCandidate : null;
  const counts = row(item.counts);
  const assets = (
    Array.isArray(item.memoryAssets) ? item.memoryAssets : []
  ).flatMap((value) => {
    const asset = row(value);
    const id = text(asset?.id),
      title = text(asset?.title),
      publicUrl = text(asset?.public_url),
      kind = text(asset?.asset_kind);
    return id &&
      title &&
      publicUrl &&
      asset?.public_visible === true &&
      text(asset.reviewed_at) &&
      (kind === "document" || kind === "photograph")
      ? [
          {
            id,
            title,
            publicUrl,
            assetKind: kind,
          } satisfies PublicCollectiveActionMemoryAssetV1,
        ]
      : [];
  });
  return {
    ...action,
    tasks: (Array.isArray(item.tasks) ? item.tasks : []).flatMap(
      (task) => projectTask(task) ?? [],
    ),
    publicUpdates: (Array.isArray(item.updates) ? item.updates : []).flatMap(
      (update) => projectUpdate(update) ?? [],
    ),
    publicForwarding: forwarding
      ? {
          recipientName: text(forwarding.recipient_name),
          publicSummary: text(forwarding.public_summary),
          sentAt: text(forwarding.sent_at),
          protocolCode: text(forwarding.protocol_code),
          expectedResponseAt: text(forwarding.expected_response_at),
          state: text(forwarding.state) ?? "preparing",
          responsePublic: text(forwarding.response_public),
          publicDocumentUrl: text(forwarding.public_document_url),
          publicDocumentLabel: text(forwarding.public_document_label),
        }
      : null,
    publicMemory: {
      publishedAt: text(item.memory_published_at),
      resultStatus: text(item.memory_published_at)
        ? text(item.result_status)
        : null,
      resultSummary: text(item.memory_published_at)
        ? text(item.result_summary)
        : null,
      memorySummary: text(item.memory_published_at)
        ? text(item.memory_summary)
        : null,
      learnedSummary: text(item.memory_published_at)
        ? text(item.learned_summary)
        : null,
      nextStepsSummary: text(item.memory_published_at)
        ? text(item.next_steps_summary)
        : null,
      assets: text(item.memory_published_at) ? assets : [],
    },
    aggregateCounts: {
      interested: count(counts?.interested),
      participating: count(counts?.participating),
      tasksAssumed: count(counts?.tasksAssumed),
      updates: count(counts?.updates),
      results: count(counts?.results),
    },
  };
}

const summarySelect =
  "id,slug,title,summary,objective,action_type,status,visibility,territory_label,meeting_place,starts_at,ends_at,participation_mode,pauta:comun_pauta_spaces(slug,title),community:comun_communities(slug,name)";

export async function listPublicCollectiveActionsCanonical(filters?: {
  territory?: string;
  type?: string;
}): Promise<PublicCollectiveActionSummaryV1[]> {
  const client = createServiceSupabaseClient();
  if (!client) return [];
  let query = client
    .from("comun_collective_actions")
    .select(summarySelect)
    .eq("visibility", "public")
    .in("status", publicCollectiveActionStatuses)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (filters?.territory)
    query = query.eq("territory_label", filters.territory);
  if (filters?.type) query = query.eq("action_type", filters.type);
  const { data } = await query;
  return sortPublicCollectiveActions(
    (data ?? []).flatMap(
      (item: unknown) => projectPublicCollectiveActionSummary(item) ?? [],
    ),
  );
}

export async function listPublicCollectiveActionsByPauta(
  pautaId: string,
): Promise<PublicCollectiveActionSummaryV1[]> {
  const client = createServiceSupabaseClient();
  if (!client || !pautaId) return [];
  const { data } = await client
    .from("comun_collective_actions")
    .select(summarySelect)
    .eq("pauta_id", pautaId)
    .eq("visibility", "public")
    .in("status", publicCollectiveActionStatuses)
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(20);
  return sortPublicCollectiveActions(
    (data ?? []).flatMap(
      (item: unknown) => projectPublicCollectiveActionSummary(item) ?? [],
    ),
  );
}

export async function listPublicCollectiveActionMemoryDetailsByPauta(
  pautaId: string,
  limit = 8,
): Promise<PublicCollectiveActionDetailV1[]> {
  const client = createServiceSupabaseClient();
  if (!client || !pautaId) return [];
  const { data: actions } = await client
    .from("comun_collective_actions")
    .select(
      "id,slug,title,summary,objective,action_type,status,visibility,territory_label,meeting_place,starts_at,ends_at,participation_mode,result_status,result_summary,memory_summary,learned_summary,next_steps_summary,memory_published_at,pauta:comun_pauta_spaces(slug,title),community:comun_communities(slug,name)",
    )
    .eq("pauta_id", pautaId)
    .eq("visibility", "public")
    .in("status", publicCollectiveActionStatuses)
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(Math.min(Math.max(limit, 1), 8));
  const actionRows = (actions ?? []) as UnknownRow[];
  const actionIds = actionRows.flatMap((action) => text(action.id) ?? []);
  if (!actionIds.length) return [];

  const [updatesResult, forwardingsResult, assetsResult] = await Promise.all([
    client
      .from("comun_collective_action_updates")
      .select("id,action_id,update_type,title,public_summary,occurred_at,visibility")
      .in("action_id", actionIds)
      .eq("visibility", "public")
      .order("occurred_at", { ascending: false })
      .limit(48),
    client
      .from("comun_collective_action_forwardings")
      .select(
        "action_id,recipient_name,public_summary,sent_at,protocol_code,expected_response_at,state,response_public,public_document_url,public_document_label,public_visible",
      )
      .in("action_id", actionIds)
      .eq("public_visible", true),
    client
      .from("comun_collective_action_memory_assets")
      .select(
        "id,action_id,asset_kind,title,public_url,public_visible,reviewed_at",
      )
      .in("action_id", actionIds)
      .eq("public_visible", true)
      .not("reviewed_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(48),
  ]);
  const updates = (updatesResult.data ?? []) as UnknownRow[];
  const forwardings = (forwardingsResult.data ?? []) as UnknownRow[];
  const assets = (assetsResult.data ?? []) as UnknownRow[];

  return sortPublicCollectiveActions(
    actionRows.flatMap((action) =>
      projectPublicCollectiveActionDetail({
        ...action,
        tasks: [],
        updates: updates.filter(
          (update) => text(update.action_id) === text(action.id),
        ),
        forwarding:
          forwardings.find(
            (forwarding) => text(forwarding.action_id) === text(action.id),
          ) ?? null,
        memoryAssets: assets.filter(
          (asset) => text(asset.action_id) === text(action.id),
        ),
        counts: {},
      }) ?? [],
    ),
  );
}

export async function getPublicCollectiveActionCanonical(
  slug: string,
): Promise<PublicCollectiveActionDetailV1 | null> {
  const { getPublicCollectiveAction } = await import(
    "@/lib/collective-actions"
  );
  return projectPublicCollectiveActionDetail(
    await getPublicCollectiveAction(slug),
  );
}
