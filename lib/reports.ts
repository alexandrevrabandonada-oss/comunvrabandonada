import { unstable_noStore as noStore } from "next/cache";
import { createPublicSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { AdminReport, PublicProtocolReport, PublicProtocolStatus, PublicReport } from "@/lib/types";

async function fetchPublicReports(
  client: ReturnType<typeof createPublicSupabaseClient> | ReturnType<typeof createServiceSupabaseClient>,
  filters?: { communitySlug?: string; issueSlug?: string },
) {
  if (!client) return null;

  let query = client
    .from("comun_public_reports")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (filters?.communitySlug) query = query.eq("community_slug", filters.communitySlug);
  if (filters?.issueSlug) query = query.eq("issue_slug", filters.issueSlug);

  const { data, error } = await query;
  if (error) return null;
  return (data ?? []) as PublicReport[];
}

export async function listPublicReports(filters?: { communitySlug?: string; issueSlug?: string }) {
  const publicReports = await fetchPublicReports(createPublicSupabaseClient(), filters);
  if (publicReports) return publicReports;

  const serviceReports = await fetchPublicReports(createServiceSupabaseClient(), filters);
  return serviceReports ?? ([] as PublicReport[]);
}

export async function listAdminReports() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as AdminReport[];

  const { data } = await supabase
    .from("comun_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as AdminReport[];
}

export async function getAdminReport(id: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.from("comun_reports").select("*").eq("id", id).single();
  return data as AdminReport | null;
}

type ProtocolReportRow = {
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
  published_at: string | null;
};

const protocolPattern = /^COMUN-\d{8}-\d{6}$/;

export function normalizeProtocol(value: string) {
  return value.trim().toUpperCase();
}

export function isValidProtocol(value: string) {
  return protocolPattern.test(normalizeProtocol(value));
}

function statusLabel(status: PublicProtocolStatus) {
  const labels: Record<PublicProtocolStatus, string> = {
    received: "Recebido",
    under_review: "Em analise",
    needs_more_info: "Em analise",
    sanitized: "Em analise",
    published: "Publicado",
    linked_to_issue: "Relacionado a pauta",
    archived: "Arquivado",
    not_found: "Nao encontrado",
    invalid: "Protocolo invalido",
  };

  return labels[status];
}

function buildState(
  status: PublicProtocolStatus,
  protocol: string,
  overrides?: Partial<Omit<PublicProtocolReport, "status" | "protocol" | "state_label">>,
): PublicProtocolReport {
  const messages: Record<PublicProtocolStatus, string> = {
    received: "Recebido pelo COMUN. A equipe ainda nao revisou.",
    under_review: "Em analise pela curadoria.",
    needs_more_info: "Seu relato foi recebido e esta em analise. Ele ainda nao foi publicado.",
    sanitized: "Seu relato foi recebido e esta em analise. Ele ainda nao foi publicado.",
    published: "Uma versao sanitizada foi publicada.",
    linked_to_issue: "Este relato ajudou a compor uma pauta em acompanhamento.",
    archived: "Este relato nao esta disponivel para publicacao publica.",
    not_found: "Nao foi possivel localizar um relato publico com esse protocolo.",
    invalid: "Digite um protocolo COMUN valido para consultar o andamento publico do relato.",
  };

  return {
    protocol,
    status,
    community_slug: null,
    issue_slug: null,
    title: null,
    public_text: null,
    period_text: null,
    approximate_location: null,
    neighborhood: null,
    created_at: null,
    published_at: null,
    public_message: messages[status],
    state_label: statusLabel(status),
    is_publicly_available: status === "published",
    found: !["not_found", "invalid"].includes(status),
    ...overrides,
  };
}

export async function getPublicReportByProtocol(protocol: string): Promise<PublicProtocolReport> {
  noStore();
  const normalizedProtocol = normalizeProtocol(protocol);
  if (!isValidProtocol(normalizedProtocol)) {
    return buildState("invalid", normalizedProtocol || protocol);
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return buildState("not_found", normalizedProtocol);
  }

  const { data, error } = await supabase
    .from("comun_reports")
    .select(
      "protocol, community_slug, issue_slug, title, public_text, period_text, approximate_location, neighborhood, status, can_publish_sanitized, created_at, published_at",
    )
    .eq("protocol", normalizedProtocol)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return buildState("not_found", normalizedProtocol);
  }

  const report = data as ProtocolReportRow;
  const safeBase = {
    community_slug: report.community_slug,
    issue_slug: report.issue_slug,
    period_text: report.period_text,
    approximate_location: report.approximate_location,
    neighborhood: report.neighborhood,
    created_at: report.created_at,
    published_at: report.published_at,
  };

  if (!report.can_publish_sanitized) {
    return buildState(
      report.status === "archived" ? "archived" : report.status === "linked_to_issue" ? "linked_to_issue" : "under_review",
      normalizedProtocol,
      safeBase,
    );
  }

  if (report.status === "published" && report.public_text) {
    return buildState("published", normalizedProtocol, {
      ...safeBase,
      title: report.title,
      public_text: report.public_text,
      is_publicly_available: true,
    });
  }

  if (report.status === "linked_to_issue") {
    return buildState("linked_to_issue", normalizedProtocol, safeBase);
  }

  if (report.status === "archived") {
    return buildState("archived", normalizedProtocol, safeBase);
  }

  if (report.status === "received") {
    return buildState("received", normalizedProtocol, safeBase);
  }

  if (report.status === "needs_more_info") {
    return buildState("needs_more_info", normalizedProtocol, safeBase);
  }

  if (report.status === "sanitized") {
    return buildState("sanitized", normalizedProtocol, safeBase);
  }

  return buildState("under_review", normalizedProtocol, safeBase);
}
