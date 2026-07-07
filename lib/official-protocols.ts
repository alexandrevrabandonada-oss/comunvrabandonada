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
    return {
      items: [] as OfficialProtocolQueueItem[],
      stats: emptyOfficialProtocolStats(),
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
  if (error) return { items: [] as OfficialProtocolQueueItem[], stats: emptyOfficialProtocolStats() };

  const items = (data ?? [])
    .map((row) => sanitizeOfficialProtocolQueueItem(row))
    .filter((item) => !filters.overdueOnly || item.timing.isOverdue)
    .sort(compareOfficialProtocolQueueItems);

  return {
    items,
    stats: buildOfficialProtocolStats(items),
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
