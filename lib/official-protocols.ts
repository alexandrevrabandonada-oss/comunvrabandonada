import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getOfficialChannel } from "@/lib/official-channels";
import type { OfficialProtocol, OfficialProtocolStatus, PublicOfficialProtocol } from "@/lib/types";

export type OfficialProtocolReportSurface = {
  id: string;
  protocol: string;
  community_slug: string;
  issue_slug: string | null;
  title: string | null;
  public_text: string | null;
  period_text: string | null;
  approximate_location: string | null;
  neighborhood: string | null;
  status: string;
  can_publish_sanitized: boolean;
  created_at: string;
};

export type OfficialProtocolQueueFilters = {
  status?: string;
  communitySlug?: string;
  issueSlug?: string;
  channel?: string;
  numberState?: "with" | "without";
  responseState?: "with" | "without";
  overdueOnly?: boolean;
  createdFrom?: string;
  createdTo?: string;
};

export type OfficialProtocolQueueItem = Omit<OfficialProtocol, "response_text" | "internal_notes"> & {
  has_response_text: boolean;
  has_internal_notes: boolean;
  report: Pick<OfficialProtocolReportSurface, "id" | "protocol" | "community_slug" | "issue_slug" | "title" | "created_at"> | null;
  timing: OfficialProtocolTiming;
};

export type OfficialProtocolTiming = {
  daysOpen: number | null;
  isOverdue: boolean;
  isNearDue: boolean;
};

export type OfficialProtocolMetrics = ReturnType<typeof buildOfficialProtocolMetrics>;

export async function getOfficialProtocolReportSurface(comunProtocol: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_reports")
    .select(
      "id, protocol, community_slug, issue_slug, title, public_text, period_text, approximate_location, neighborhood, status, can_publish_sanitized, created_at",
    )
    .eq("protocol", comunProtocol)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as OfficialProtocolReportSurface;
}

export async function getOfficialProtocolByComunProtocol(comunProtocol: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_official_protocols")
    .select("*")
    .eq("comun_protocol", comunProtocol)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as OfficialProtocol;
}

export async function listAdminOfficialProtocols(filters: OfficialProtocolQueueFilters = {}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    const items = [] as OfficialProtocolQueueItem[];
    return {
      items,
      stats: emptyOfficialProtocolStats(),
      metrics: buildOfficialProtocolMetrics(items),
    };
  }

  let query = supabase
    .from("comun_official_protocols")
    .select(
      "id, report_id, comun_protocol, channel, agency, official_protocol_number, generated_text, submitted_by_user, submitted_at, expected_response_at, status, response_text, response_received_at, satisfaction, public_summary, internal_notes, created_at, updated_at, report:comun_reports!inner(id, protocol, community_slug, issue_slug, title, created_at)",
    )
    .limit(200);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.communitySlug) query = query.eq("comun_reports.community_slug", filters.communitySlug);
  if (filters.issueSlug) query = query.eq("comun_reports.issue_slug", filters.issueSlug);
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.numberState === "with") query = query.not("official_protocol_number", "is", null);
  if (filters.numberState === "without") query = query.is("official_protocol_number", null);
  if (filters.responseState === "with") query = query.not("response_received_at", "is", null);
  if (filters.responseState === "without") query = query.is("response_received_at", null);
  if (filters.createdFrom) query = query.gte("created_at", `${filters.createdFrom}T00:00:00`);
  if (filters.createdTo) query = query.lte("created_at", `${filters.createdTo}T23:59:59.999`);

  const { data, error } = await query;
  if (error) {
    const items = [] as OfficialProtocolQueueItem[];
    return { items, stats: emptyOfficialProtocolStats(), metrics: buildOfficialProtocolMetrics(items) };
  }

  const items = (data ?? [])
    .map((row) => sanitizeOfficialProtocolQueueItem(row))
    .filter((item) => !filters.overdueOnly || item.timing.isOverdue)
    .sort(compareOfficialProtocolQueueItems);

  return {
    items,
    stats: buildOfficialProtocolStats(items),
    metrics: buildOfficialProtocolMetrics(items),
  };
}

export function calculateOfficialProtocolTiming(input: Pick<OfficialProtocol, "submitted_at" | "expected_response_at" | "status">) {
  const submittedAt = input.submitted_at ? new Date(input.submitted_at).getTime() : null;
  const expectedAt = input.expected_response_at ? new Date(input.expected_response_at).getTime() : null;
  const now = Date.now();
  const waiting = input.status === "waiting_response";

  return {
    daysOpen: submittedAt ? Math.max(0, Math.floor((now - submittedAt) / (24 * 60 * 60 * 1000))) : null,
    isOverdue: Boolean(waiting && expectedAt && expectedAt < now),
    isNearDue: Boolean(waiting && expectedAt && expectedAt >= now && expectedAt - now <= 3 * 24 * 60 * 60 * 1000),
  };
}

function sanitizeOfficialProtocolQueueItem(row: any): OfficialProtocolQueueItem {
  const report = Array.isArray(row.report) ? row.report[0] ?? null : row.report ?? null;
  return {
    id: row.id,
    report_id: row.report_id,
    comun_protocol: row.comun_protocol,
    channel: row.channel,
    agency: row.agency,
    official_protocol_number: row.official_protocol_number,
    generated_text: row.generated_text,
    submitted_by_user: row.submitted_by_user,
    submitted_at: row.submitted_at,
    expected_response_at: row.expected_response_at,
    status: row.status,
    response_received_at: row.response_received_at,
    satisfaction: row.satisfaction,
    public_summary: row.public_summary,
    created_at: row.created_at,
    updated_at: row.updated_at,
    has_response_text: Boolean(row.response_text),
    has_internal_notes: Boolean(row.internal_notes),
    report,
    timing: calculateOfficialProtocolTiming(row),
  };
}

function buildOfficialProtocolStats(items: OfficialProtocolQueueItem[]) {
  return {
    total: items.length,
    drafts: items.filter((item) => ["draft", "text_generated"].includes(item.status)).length,
    sent_by_user: items.filter((item) => item.submitted_by_user || item.status === "sent_by_user").length,
    waiting_response: items.filter((item) => item.status === "waiting_response").length,
    overdue: items.filter((item) => item.timing.isOverdue).length,
    response_received: items.filter((item) => item.response_received_at || item.status === "response_received").length,
    resolved: items.filter((item) => item.status === "resolved" || item.status === "satisfactory_response").length,
    unresolved: items.filter((item) => item.status === "unresolved" || item.status === "unsatisfactory_response").length,
  };
}

export function buildOfficialProtocolMetrics(items: OfficialProtocolQueueItem[]) {
  const byStatus = countBy(items, (item) => item.status);
  const byIssue = buildGroupMetrics(items, (item) => item.report?.issue_slug ?? "sem-pauta");
  const byCommunity = buildGroupMetrics(items, (item) => item.report?.community_slug ?? "sem-comunidade");
  const byChannel = buildGroupMetrics(items, (item) => item.channel || item.agency || "sem-canal");
  const byIssueAndStatus = buildIssueStatusMetrics(items);
  const dossierSignals = buildDossierSignals(items, byIssue, byCommunity);

  return {
    byStatus,
    byIssue,
    byCommunity,
    byChannel,
    byIssueAndStatus,
    dossierSignals,
    overdueCount: items.filter((item) => item.timing.isOverdue).length,
    averageDaysToResponse: averageDays(
      items
        .filter((item) => item.submitted_at && item.response_received_at)
        .map((item) => daysBetween(item.submitted_at, item.response_received_at)),
    ),
    averageDaysToResolution: averageDays(
      items
        .filter((item) => item.submitted_at && isResolutionStatus(item.status))
        .map((item) => daysBetween(item.submitted_at, item.response_received_at ?? item.updated_at)),
    ),
    waitingResponse: items.filter((item) => item.status === "waiting_response").length,
    withoutOfficialNumber: items.filter((item) => !item.official_protocol_number).length,
    responseWithoutPublicSummary: items.filter((item) => item.has_response_text && !item.public_summary).length,
    topIssue: byIssue[0] ?? null,
    topCommunity: byCommunity[0] ?? null,
    topPendingChannel: byChannel
      .filter((group) => group.waitingResponse || group.overdue)
      .sort((a, b) => b.waitingResponse + b.overdue - (a.waitingResponse + a.overdue))[0] ?? null,
  };
}

function emptyOfficialProtocolStats() {
  return {
    total: 0,
    drafts: 0,
    sent_by_user: 0,
    waiting_response: 0,
    overdue: 0,
    response_received: 0,
    resolved: 0,
    unresolved: 0,
  };
}

function countBy<T>(items: T[], keyFor: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFor(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function buildGroupMetrics(items: OfficialProtocolQueueItem[], keyFor: (item: OfficialProtocolQueueItem) => string) {
  const groups = new Map<string, OfficialProtocolQueueItem[]>();
  for (const item of items) {
    const key = keyFor(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()]
    .map(([key, groupItems]) => ({
      key,
      total: groupItems.length,
      overdue: groupItems.filter((item) => item.timing.isOverdue).length,
      waitingResponse: groupItems.filter((item) => item.status === "waiting_response").length,
      responseReceived: groupItems.filter((item) => item.response_received_at || item.status === "response_received").length,
      resolved: groupItems.filter((item) => item.status === "resolved" || item.status === "satisfactory_response").length,
      unresolved: groupItems.filter((item) => item.status === "unresolved" || item.status === "unsatisfactory_response").length,
      responseWithoutPublicSummary: groupItems.filter((item) => item.has_response_text && !item.public_summary).length,
    }))
    .sort((a, b) => b.total - a.total || b.overdue - a.overdue || a.key.localeCompare(b.key));
}

function buildIssueStatusMetrics(items: OfficialProtocolQueueItem[]) {
  return buildGroupMetrics(items, (item) => item.report?.issue_slug ?? "sem-pauta").map((group) => ({
    ...group,
    statuses: countBy(
      items.filter((item) => (item.report?.issue_slug ?? "sem-pauta") === group.key),
      (item) => item.status,
    ),
  }));
}

function buildDossierSignals(
  items: OfficialProtocolQueueItem[],
  byIssue: ReturnType<typeof buildGroupMetrics>,
  byCommunity: ReturnType<typeof buildGroupMetrics>,
) {
  const signals = byIssue
    .filter((group) => group.total >= 3 || group.overdue >= 2 || group.unresolved > 0)
    .map((group) => ({
      type: "pauta" as const,
      issue: group.key,
      community: null as string | null,
      total: group.total,
      overdue: group.overdue,
      resolved: group.resolved,
      unresolved: group.unresolved,
      reason: group.total >= 3 ? "volume" : group.overdue >= 2 ? "prazo" : "nao_resolvidos",
    }));

  const communityIssueGroups = buildGroupMetrics(items, (item) => `${item.report?.community_slug ?? "sem-comunidade"}|${item.report?.issue_slug ?? "sem-pauta"}`)
    .filter((group) => group.total >= 3 || group.unresolved > 0)
    .map((group) => {
      const [community, issue] = group.key.split("|");
      return {
        type: "comunidade_pauta" as const,
        issue,
        community,
        total: group.total,
        overdue: group.overdue,
        resolved: group.resolved,
        unresolved: group.unresolved,
        reason: group.total >= 3 ? "volume_local" : "nao_resolvidos",
      };
    });

  const unsatisfactory = items
    .filter((item) => item.satisfaction === "unsatisfactory" || item.status === "unsatisfactory_response")
    .map((item) => ({
      type: "resposta" as const,
      issue: item.report?.issue_slug ?? "sem-pauta",
      community: item.report?.community_slug ?? null,
      total: 1,
      overdue: item.timing.isOverdue ? 1 : 0,
      resolved: 0,
      unresolved: 1,
      reason: "resposta_insatisfatoria",
    }));

  return [...signals, ...communityIssueGroups, ...unsatisfactory]
    .sort((a, b) => b.unresolved - a.unresolved || b.overdue - a.overdue || b.total - a.total)
    .slice(0, 12);
}

function averageDays(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10;
}

function daysBetween(from: string | null, to: string | null) {
  if (!from || !to) return null;
  return Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));
}

function isResolutionStatus(status: string) {
  return ["resolved", "unresolved", "satisfactory_response", "unsatisfactory_response"].includes(status);
}

function compareOfficialProtocolQueueItems(a: OfficialProtocolQueueItem, b: OfficialProtocolQueueItem) {
  const priority = (item: OfficialProtocolQueueItem) => {
    if (item.timing.isOverdue) return 0;
    if (item.status === "waiting_response") return 1;
    if (item.status === "response_received") return 2;
    return 3;
  };
  const diff = priority(a) - priority(b);
  if (diff !== 0) return diff;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

export function isOfficialProtocolStatus(value: string): value is OfficialProtocolStatus {
  return [
    "draft",
    "text_generated",
    "sent_by_user",
    "official_protocol_informed",
    "waiting_response",
    "response_received",
    "satisfactory_response",
    "unsatisfactory_response",
    "overdue",
    "resolved",
    "unresolved",
    "archived",
  ].includes(value);
}

export async function getPublicOfficialProtocol(comunProtocol: string) {
  const protocol = await getOfficialProtocolByComunProtocol(comunProtocol);
  if (!protocol) return null;

  return {
    comun_protocol: protocol.comun_protocol,
    channel: protocol.channel,
    agency: protocol.agency,
    official_protocol_number: protocol.official_protocol_number,
    generated_text: protocol.generated_text,
    submitted_by_user: protocol.submitted_by_user,
    submitted_at: protocol.submitted_at,
    expected_response_at: protocol.expected_response_at,
    status: protocol.status,
    response_received_at: protocol.response_received_at,
    satisfaction: protocol.satisfaction,
    public_summary: protocol.public_summary,
    created_at: protocol.created_at,
    updated_at: protocol.updated_at,
  } satisfies PublicOfficialProtocol;
}

export async function createOrUpdateOfficialProtocolDraftForReport(report: OfficialProtocolReportSurface, channelId = "ouvidoria-municipal") {
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const channel = getOfficialChannel(channelId);
  const generatedText = generateOfficialComplaintText(report);
  const existing = await getOfficialProtocolByComunProtocol(report.protocol);
  const payload = {
    report_id: report.id,
    comun_protocol: report.protocol,
    channel: channel.id,
    agency: channel.agency,
    generated_text: generatedText,
    status: existing && !["draft", "text_generated"].includes(existing.status) ? existing.status : "text_generated",
  };
  const query = existing
    ? supabase.from("comun_official_protocols").update(payload).eq("id", existing.id)
    : supabase.from("comun_official_protocols").insert(payload);
  const { data, error } = await query.select("*").single();

  if (error) throw new Error(error.message);
  return data as OfficialProtocol;
}

export function generateOfficialComplaintText(report: OfficialProtocolReportSurface) {
  const location = [report.neighborhood, report.approximate_location].filter(Boolean).join(" - ") || "Nao informado";
  const period = report.period_text || "Nao informado";
  const category = formatCategory(report.community_slug, report.title);
  const description = buildSafeDescription(report);
  const riskNote = shouldAddSidewalkRiskNote(report)
    ? "\n\nO problema pode representar risco de queda e dificuldade de circulacao de pedestres, especialmente pessoas idosas, criancas, pessoas com deficiencia e moradores da regiao."
    : "";

  return `Solicito providencias sobre o seguinte problema:

Local aproximado: ${location}
Data ou periodo: ${period}
Tipo de problema: ${category}
Descricao: ${description}${riskNote}

Ha registro comunitario no COMUN pelo protocolo ${report.protocol}.

Pedido objetivo:
Solicito vistoria, providencia e resposta formal com prazo, orgao responsavel e medida adotada.`;
}

function buildSafeDescription(report: OfficialProtocolReportSurface) {
  if (report.public_text?.trim()) return report.public_text.trim();
  const parts = [
    report.title?.replace(/^\[[^\]]+\]\s*/, "").trim(),
    report.approximate_location ? `Local aproximado informado: ${report.approximate_location}.` : null,
    report.period_text ? `Periodo informado: ${report.period_text}.` : null,
  ].filter(Boolean);

  return parts.join(" ") || "Relato comunitario recebido pelo COMUN aguardando versao publica sanitizada.";
}

function formatCategory(communitySlug: string, title: string | null) {
  const match = title?.match(/^\[([^\]]+)\]/);
  if (match?.[1]) return match[1].replace("Rapido: ", "");
  const labels: Record<string, string> = {
    cidade: "Cidade / servico urbano",
    trabalho: "Trabalho",
    escola: "Escola",
    saude: "Saude",
    transporte: "Transporte",
  };
  return labels[communitySlug] ?? communitySlug;
}

function shouldAddSidewalkRiskNote(report: OfficialProtocolReportSurface) {
  const text = `${report.title ?? ""} ${report.public_text ?? ""} ${report.approximate_location ?? ""}`.toLowerCase();
  return ["buraco", "calcada", "calçada", "queda", "pedestre"].some((term) => text.includes(term));
}
