import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { PautaContribution, PautaSpace, PautaTask } from "@/lib/types";
import { calculateOfficialProtocolTiming } from "@/lib/official-protocols";

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

export async function listPublicPautaSpaces() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublicPautaSpace[];

  const { data, error } = await supabase
    .from("comun_pauta_spaces")
    .select("id, slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal, created_at, updated_at")
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
    .select("id, slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal, created_at, updated_at")
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
    .select("id, slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return Promise.all((data as PautaSpace[]).map(withPautaStats));
}

export async function getAdminPautaSpace(id: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_pauta_spaces")
    .select("id, slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal, created_at, updated_at")
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
    .select("id, pauta_id, contribution_type, author_alias, body, contact_private, status, moderator_notes, created_at, updated_at")
    .eq("pauta_id", pautaId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PautaContribution[];
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

export async function listAdminPautaTasks(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaTask[];

  const { data, error } = await supabase
    .from("comun_pauta_tasks")
    .select("id, pauta_id, title, description, status, help_needed, owner_alias, due_at, created_at, updated_at")
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
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase.from("comun_pauta_contributions").insert({
    pauta_id: input.pautaId,
    contribution_type: input.contributionType,
    author_alias: input.authorAlias || null,
    body: input.body,
    contact_private: input.contactPrivate || null,
    status: "pending",
  });

  if (error) throw new Error(error.message);
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
