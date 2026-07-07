import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getOfficialChannel } from "@/lib/official-channels";
import type { OfficialProtocol, PublicOfficialProtocol } from "@/lib/types";

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
