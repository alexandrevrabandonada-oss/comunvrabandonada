import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { PautaContribution, PautaEvidenceItem, PautaSpace, PautaSynthesisVersion, PautaTask } from "@/lib/types";
import { calculateOfficialProtocolTiming } from "@/lib/official-protocols";
import { getClientFingerprint, hashLookupValue } from "@/lib/rate-limit";

export type PublicPautaSpace = PautaSpace & {
  stats: PautaSpaceStats;
};

export type PautaSpaceStats = {
  reportCount: number;
  officialProtocolCount: number;
  overdueProtocolCount: number;
  waitingResponseCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  pendingContributionCount: number;
  openTaskCount: number;
};

export type PublicPautaContribution = Pick<PautaContribution, "id" | "pauta_id" | "contribution_type" | "author_alias" | "body" | "status" | "created_at">;
export type PublicPautaTask = Pick<PautaTask, "id" | "pauta_id" | "title" | "description" | "status" | "help_needed" | "owner_alias" | "due_at" | "created_at">;
export type PublicPautaEvidenceItem = Pick<PautaEvidenceItem, "id" | "pauta_id" | "title" | "summary" | "evidence_type" | "sensitivity" | "status" | "public_note" | "created_at">;
export type PautaContributionSafetyDecision = {
  allowed: boolean;
  status: "pending" | "archived";
  risk_level: "normal" | "attention" | "high";
  risk_reasons: string[];
  moderation_priority: "normal" | "review_first" | "possible_abuse";
  submitter_hash: string | null;
  user_agent_hash: string | null;
  rateLimitReason?: "hour" | "day";
};

export async function listPublicPautaSpaces() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublicPautaSpace[];

  const { data, error } = await supabase
    .from("comun_pauta_spaces")
    .select("id, slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal, editorial_checklist, public_status, priority, urgency, risk_level, responsible_public, territory_id, affected_people_public, problem_public, demand_public, proposals_public, participation_public, last_operational_update_at, created_at, updated_at")
    .eq("visibility", "public")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return Promise.all((data as PautaSpace[]).map(withPautaStats));
}

export async function getPublicPautaSpaceBySlug(slug: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_pauta_spaces")
    .select("id, slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal, editorial_checklist, public_status, priority, urgency, risk_level, responsible_public, territory_id, affected_people_public, problem_public, demand_public, proposals_public, participation_public, last_operational_update_at, created_at, updated_at")
    .eq("slug", slug)
    .eq("visibility", "public")
    .neq("status", "archived")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return withPautaStats(data as PautaSpace);
}

export async function listAdminPautaSpaces() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublicPautaSpace[];

  const { data, error } = await supabase
    .from("comun_pauta_spaces")
    .select("id, slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal, editorial_checklist, public_status, priority, urgency, risk_level, responsible_internal, responsible_public, territory_id, affected_people_public, problem_public, demand_public, proposals_public, participation_public, last_operational_update_at, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return Promise.all((data as PautaSpace[]).map(withPautaStats));
}

export async function getAdminPautaSpace(id: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_pauta_spaces")
    .select("id, slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal, editorial_checklist, public_status, internal_status, priority, urgency, risk_level, responsible_internal, responsible_public, territory_id, affected_people_public, problem_public, demand_public, proposals_public, participation_public, last_operational_update_at, created_at, updated_at")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return withPautaStats(data as PautaSpace);
}

export async function listApprovedPautaContributions(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublicPautaContribution[];

  const { data, error } = await supabase
    .from("comun_pauta_contributions")
    .select("id, pauta_id, contribution_type, author_alias, body, status, created_at")
    .eq("pauta_id", pautaId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PublicPautaContribution[];
}

export async function listAdminPautaContributions(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaContribution[];

  const { data, error } = await supabase
    .from("comun_pauta_contributions")
    .select("id, pauta_id, contribution_type, author_alias, body, contact_private, status, risk_level, risk_reasons, moderation_priority, submitter_hash, user_agent_hash, reviewed_at, reviewed_by, moderator_notes, created_at, updated_at")
    .eq("pauta_id", pautaId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PautaContribution[];
}

export async function listAdminPautaContributionQueue(filters: {
  status?: string;
  riskLevel?: string;
  contributionType?: string;
  pautaId?: string;
  createdFrom?: string;
  createdTo?: string;
} = {}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as Array<PautaContribution & { pauta: Pick<PautaSpace, "id" | "slug" | "title"> | null }>;

  let query = supabase
    .from("comun_pauta_contributions")
    .select("id, pauta_id, contribution_type, author_alias, body, contact_private, status, risk_level, risk_reasons, moderation_priority, submitter_hash, user_agent_hash, reviewed_at, reviewed_by, moderator_notes, created_at, updated_at, pauta:comun_pauta_spaces(id, slug, title)")
    .order("moderation_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.riskLevel) query = query.eq("risk_level", filters.riskLevel);
  if (filters.contributionType) query = query.eq("contribution_type", filters.contributionType);
  if (filters.pautaId) query = query.eq("pauta_id", filters.pautaId);
  if (filters.createdFrom) query = query.gte("created_at", `${filters.createdFrom}T00:00:00`);
  if (filters.createdTo) query = query.lte("created_at", `${filters.createdTo}T23:59:59.999`);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row: any) => ({
    ...row,
    pauta: Array.isArray(row.pauta) ? row.pauta[0] ?? null : row.pauta ?? null,
  })) as Array<PautaContribution & { pauta: Pick<PautaSpace, "id" | "slug" | "title"> | null }>;
}

export async function listPublicPautaTasks(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublicPautaTask[];

  const { data, error } = await supabase
    .from("comun_pauta_tasks")
    .select("id, pauta_id, title, description, status, help_needed, owner_alias, due_at, created_at")
    .eq("pauta_id", pautaId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PublicPautaTask[];
}

export async function listPublicPautaEvidence(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublicPautaEvidenceItem[];

  const { data, error } = await supabase
    .from("comun_pauta_evidence_items")
    .select("id, pauta_id, title, summary, evidence_type, sensitivity, status, public_note, created_at")
    .eq("pauta_id", pautaId)
    .eq("status", "approved")
    .eq("sensitivity", "public_safe")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PublicPautaEvidenceItem[];
}

export async function listAdminPautaEvidence(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaEvidenceItem[];

  const { data, error } = await supabase
    .from("comun_pauta_evidence_items")
    .select("id, pauta_id, source_type, source_id, title, summary, evidence_type, sensitivity, status, public_note, internal_note, created_at, updated_at")
    .eq("pauta_id", pautaId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PautaEvidenceItem[];
}

export async function listPautaSynthesisVersions(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaSynthesisVersion[];

  const { data, error } = await supabase
    .from("comun_pauta_synthesis_versions")
    .select("id, pauta_id, previous_public_synthesis, new_public_synthesis, previous_next_step, new_next_step, editor_note, created_at")
    .eq("pauta_id", pautaId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return data as PautaSynthesisVersion[];
}

export async function listAdminPautaTasks(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaTask[];

  const { data, error } = await supabase
    .from("comun_pauta_tasks")
    .select("id, pauta_id, title, description, status, help_needed, owner_alias, due_at, action_id, project_id, required_skill, priority, visibility, accepts_volunteers, participant_limit, result_public, created_at, updated_at")
    .eq("pauta_id", pautaId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PautaTask[];
}

export async function listSafePautaReports(space: Pick<PautaSpace, "category" | "community">) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("comun_reports")
    .select("id, protocol, community_slug, issue_slug, title, public_text, period_text, approximate_location, neighborhood, created_at, published_at")
    .eq("can_publish_sanitized", true)
    .eq("status", "published")
    .limit(20)
    .order("created_at", { ascending: false });

  if (space.community) query = query.eq("community_slug", space.community);
  if (space.category) query = query.eq("issue_slug", space.category);

  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

export async function listSafePautaOfficialProtocols(space: Pick<PautaSpace, "category" | "community">) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("comun_official_protocols")
    .select("id, comun_protocol, channel, agency, official_protocol_number, submitted_at, expected_response_at, status, response_received_at, satisfaction, public_summary, updated_at, report:comun_reports!inner(community_slug, issue_slug)")
    .limit(50)
    .order("updated_at", { ascending: false });

  if (space.community) query = query.eq("comun_reports.community_slug", space.community);
  if (space.category) query = query.eq("comun_reports.issue_slug", space.category);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    comun_protocol: row.comun_protocol,
    channel: row.channel,
    agency: row.agency,
    official_protocol_number: row.official_protocol_number,
    submitted_at: row.submitted_at,
    expected_response_at: row.expected_response_at,
    status: row.status,
    response_received_at: row.response_received_at,
    satisfaction: row.satisfaction,
    public_summary: row.public_summary,
    timing: calculateOfficialProtocolTiming(row),
  }));
}

export async function createPendingPautaContribution(input: {
  pautaId: string;
  contributionType: string;
  authorAlias: string;
  body: string;
  contactPrivate: string;
  safety: PautaContributionSafetyDecision;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase.from("comun_pauta_contributions").insert({
    pauta_id: input.pautaId,
    contribution_type: input.contributionType,
    author_alias: input.authorAlias || null,
    body: input.body,
    contact_private: input.contactPrivate || null,
    status: input.safety.status,
    risk_level: input.safety.risk_level,
    risk_reasons: input.safety.risk_reasons,
    moderation_priority: input.safety.moderation_priority,
    submitter_hash: input.safety.submitter_hash,
    user_agent_hash: input.safety.user_agent_hash,
  });

  if (error) throw new Error(error.message);
}

export async function assessPautaContributionSafety(input: {
  pautaId: string;
  body: string;
  honeypot: string;
  challengeAnswer: string;
}) {
  const fingerprint = await getClientFingerprint();
  const bodyHash = hashLookupValue(input.body.toLowerCase().replace(/\s+/g, " ").slice(0, 500));
  const riskReasons = [] as string[];
  const recentCounts = await getRecentContributionCounts(fingerprint.ip_hash);

  if (input.body.length < 24) riskReasons.push("texto_curto");
  if ((input.body.match(/https?:\/\//gi) ?? []).length >= 2) riskReasons.push("muitos_links");
  if (containsOffensiveTerm(input.body)) riskReasons.push("termo_ofensivo");
  if (input.honeypot.trim()) riskReasons.push("honeypot_preenchido");
  if (input.challengeAnswer.trim() !== "5") riskReasons.push("desafio_invalido");
  if (bodyHash && await hasRepeatedRecentBody(input.pautaId, bodyHash)) riskReasons.push("texto_repetido");
  if (recentCounts.hour >= 3) riskReasons.push("muitas_recentes");

  if (recentCounts.hour >= getContributionLimits().hour) {
    return {
      allowed: false,
      status: "archived",
      risk_level: "high",
      risk_reasons: [...new Set([...riskReasons, "limite_hora"])],
      moderation_priority: "possible_abuse",
      submitter_hash: fingerprint.ip_hash,
      user_agent_hash: fingerprint.user_agent_hash,
      rateLimitReason: "hour",
    } satisfies PautaContributionSafetyDecision;
  }

  if (recentCounts.day >= getContributionLimits().day) {
    return {
      allowed: false,
      status: "archived",
      risk_level: "high",
      risk_reasons: [...new Set([...riskReasons, "limite_dia"])],
      moderation_priority: "possible_abuse",
      submitter_hash: fingerprint.ip_hash,
      user_agent_hash: fingerprint.user_agent_hash,
      rateLimitReason: "day",
    } satisfies PautaContributionSafetyDecision;
  }

  const hasHardSignal = riskReasons.includes("honeypot_preenchido") || riskReasons.includes("desafio_invalido");
  const highRisk = hasHardSignal || riskReasons.length >= 3;
  const attention = riskReasons.length > 0 || recentCounts.hour >= 3;
  return {
    allowed: !hasHardSignal,
    status: hasHardSignal ? "archived" : "pending",
    risk_level: highRisk ? "high" : attention ? "attention" : "normal",
    risk_reasons: [...new Set(riskReasons)],
    moderation_priority: highRisk ? "possible_abuse" : attention ? "review_first" : "normal",
    submitter_hash: fingerprint.ip_hash,
    user_agent_hash: fingerprint.user_agent_hash,
  } satisfies PautaContributionSafetyDecision;
}

export function slugifyPauta(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `pauta-${Date.now()}`;
}

async function withPautaStats(space: PautaSpace): Promise<PublicPautaSpace> {
  const [reports, protocols, contributions, tasks] = await Promise.all([
    listSafePautaReports(space),
    listSafePautaOfficialProtocols(space),
    listAdminPautaContributions(space.id),
    listAdminPautaTasks(space.id),
  ]);

  return {
    ...space,
    stats: {
      reportCount: reports.length,
      officialProtocolCount: protocols.length,
      overdueProtocolCount: protocols.filter((protocol) => protocol.timing.isOverdue).length,
      waitingResponseCount: protocols.filter((protocol) => protocol.status === "waiting_response").length,
      resolvedCount: protocols.filter((protocol) => ["resolved", "satisfactory_response"].includes(protocol.status)).length,
      unresolvedCount: protocols.filter((protocol) => ["unresolved", "unsatisfactory_response"].includes(protocol.status)).length,
      pendingContributionCount: contributions.filter((contribution) => contribution.status === "pending").length,
      openTaskCount: tasks.filter((task) => ["open", "in_progress", "blocked"].includes(task.status)).length,
    },
  };
}

function getContributionLimits() {
  if (process.env.COMUN_PAUTA_CONTRIBUTION_LIMIT_TEST_MODE === "1") {
    return { hour: 3, day: 6 };
  }
  return { hour: 5, day: 20 };
}

async function getRecentContributionCounts(submitterHash: string | null) {
  if (!submitterHash) return { hour: 0, day: 0 };
  const supabase = createServiceSupabaseClient();
  if (!supabase) return { hour: 0, day: 0 };
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [hour, day] = await Promise.all([
    supabase.from("comun_pauta_contributions").select("id", { count: "exact", head: true }).eq("submitter_hash", submitterHash).gte("created_at", hourAgo),
    supabase.from("comun_pauta_contributions").select("id", { count: "exact", head: true }).eq("submitter_hash", submitterHash).gte("created_at", dayAgo),
  ]);
  return { hour: hour.count ?? 0, day: day.count ?? 0 };
}

async function hasRepeatedRecentBody(pautaId: string, bodyHash: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("comun_pauta_contributions")
    .select("body")
    .eq("pauta_id", pautaId)
    .gte("created_at", since)
    .limit(30);
  return (data ?? []).some((row) => hashLookupValue(String(row.body ?? "").toLowerCase().replace(/\s+/g, " ").slice(0, 500)) === bodyHash);
}

function containsOffensiveTerm(body: string) {
  const text = body.toLowerCase();
  return ["idiota", "burro", "otario", "lixo humano"].some((term) => text.includes(term));
}
