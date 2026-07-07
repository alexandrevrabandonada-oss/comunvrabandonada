import { unstable_noStore as noStore } from "next/cache";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { PautaDossier, PautaDossierEvidence, PautaDossierReview, PautaEvidenceItem, PautaSpace } from "@/lib/types";
import {
  getAdminPautaSpace,
  listAdminPautaTasks,
  listPublicPautaEvidence,
  listSafePautaOfficialProtocols,
  listSafePautaReports,
  slugifyPauta,
} from "@/lib/pauta-spaces";

const dossierSelect = "id, pauta_id, slug, title, status, review_status, reviewed_by_editor_at, approved_for_publication_at, published_at, unpublished_at, public_slug, public_title, public_body, public_summary, publication_notes, executive_summary, problem_statement, affected_communities, evidence_summary, official_protocols_summary, demands, next_steps, public_version, internal_notes, created_at, updated_at";

export type PautaDossierWithPauta = PautaDossier & {
  pauta: Pick<PautaSpace, "id" | "slug" | "title" | "community" | "category"> | null;
};

export type PautaDossierEvidenceWithItem = PautaDossierEvidence & {
  evidence: Pick<PautaEvidenceItem, "id" | "title" | "summary" | "evidence_type" | "public_note" | "status" | "sensitivity"> | null;
};

export type PautaDossierDetail = PautaDossierWithPauta & {
  evidence_items: PautaDossierEvidenceWithItem[];
  reviews: PautaDossierReview[];
  review_state: PautaDossierReviewState;
};

export type PautaDossierReviewState = {
  factualApproved: boolean;
  editorialApproved: boolean;
  reviewersDistinct: boolean;
  factualReviewer: string | null;
  editorialReviewer: string | null;
  canPublish: boolean;
  missingReasons: string[];
};

export type GeneratedPautaDossierDraft = Omit<PautaDossier, "id" | "created_at" | "updated_at"> & {
  evidence_ids: string[];
};

export async function listAdminPautaDossiers(filters: { pautaId?: string; reviewStatus?: string } = {}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaDossierWithPauta[];

  let query = supabase
    .from("comun_pauta_dossiers")
    .select(`${dossierSelect}, pauta:comun_pauta_spaces(id, slug, title, community, category)`)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters.pautaId) query = query.eq("pauta_id", filters.pautaId);
  if (filters.reviewStatus) query = query.eq("review_status", filters.reviewStatus);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(normalizeDossierJoin) as PautaDossierWithPauta[];
}

export async function getAdminPautaDossier(id: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_pauta_dossiers")
    .select(`${dossierSelect}, pauta:comun_pauta_spaces(id, slug, title, community, category), evidence_items:comun_pauta_dossier_evidence(id, dossier_id, evidence_id, position, included_note, created_at, evidence:comun_pauta_evidence_items(id, title, summary, evidence_type, public_note, status, sensitivity)), reviews:comun_pauta_dossier_reviews(id, dossier_id, review_stage, reviewer_name, reviewer_role, decision, checklist, notes, created_at)`)
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const normalized = normalizeDossierJoin(data) as PautaDossierDetail;
  normalized.evidence_items = ((data as any).evidence_items ?? [])
    .map((row: any) => ({
      ...row,
      evidence: Array.isArray(row.evidence) ? row.evidence[0] ?? null : row.evidence ?? null,
    }))
    .sort((a: PautaDossierEvidenceWithItem, b: PautaDossierEvidenceWithItem) => a.position - b.position);
  normalized.reviews = ((data as any).reviews ?? [])
    .map((row: any) => ({ ...row, checklist: row.checklist ?? {} }))
    .sort((a: PautaDossierReview, b: PautaDossierReview) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  normalized.review_state = getDossierReviewState(normalized.reviews);
  return normalized;
}

export async function listPublishedPautaDossiers() {
  noStore();
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaDossierWithPauta[];

  const { data, error } = await supabase
    .from("comun_pauta_dossiers")
    .select(`${dossierSelect}, pauta:comun_pauta_spaces(id, slug, title, community, category)`)
    .eq("review_status", "published")
    .not("published_at", "is", null)
    .is("unpublished_at", null)
    .not("public_slug", "is", null)
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return data.map(normalizeDossierJoin) as PautaDossierWithPauta[];
}

export async function getPublishedPautaDossierBySlug(slug: string) {
  noStore();
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_pauta_dossiers")
    .select(`${dossierSelect}, pauta:comun_pauta_spaces(id, slug, title, community, category)`)
    .eq("public_slug", slug)
    .eq("review_status", "published")
    .not("published_at", "is", null)
    .is("unpublished_at", null)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeDossierJoin(data) as PautaDossierWithPauta;
}

export async function generatePautaDossierDraft(pautaId: string): Promise<GeneratedPautaDossierDraft> {
  const space = await getAdminPautaSpace(pautaId);
  if (!space) throw new Error("Pauta nao encontrada.");

  const [evidence, reports, protocols, tasks] = await Promise.all([
    listPublicPautaEvidence(space.id),
    listSafePautaReports(space),
    listSafePautaOfficialProtocols(space),
    listAdminPautaTasks(space.id),
  ]);
  const openTasks = tasks.filter((task) => ["open", "in_progress", "blocked"].includes(task.status));
  const resolvedProtocols = protocols.filter((protocol: any) => ["resolved", "satisfactory_response"].includes(protocol.status)).length;
  const unresolvedProtocols = protocols.filter((protocol: any) => ["unresolved", "unsatisfactory_response"].includes(protocol.status)).length;
  const overdueProtocols = protocols.filter((protocol: any) => protocol.timing?.isOverdue).length;

  const title = `Dossie: ${space.title}`;
  const affectedCommunities = space.community || "Comunidade em definicao";
  const evidenceSummary = evidence.length
    ? evidence.map((item, index) => `${index + 1}. ${item.title}${item.summary ? ` - ${item.summary}` : ""}${item.public_note ? ` (${item.public_note})` : ""}`).join("\n")
    : "Ainda nao ha evidencias publicas aprovadas para esta pauta.";
  const protocolSummary = [
    `${protocols.length} protocolo(s) oficial(is) relacionado(s).`,
    `${overdueProtocols} vencido(s), ${resolvedProtocols} resolvido(s), ${unresolvedProtocols} nao resolvido(s).`,
    ...protocols.slice(0, 8).map((protocol: any) => {
      const number = protocol.official_protocol_number ? ` oficial ${protocol.official_protocol_number}` : " sem numero oficial";
      const summary = protocol.public_summary ? ` Resumo publico: ${protocol.public_summary}` : "";
      return `- ${protocol.comun_protocol}, ${protocol.channel}${number}, status ${protocol.status}.${summary}`;
    }),
  ].join("\n");
  const metrics = [
    `${reports.length} relato(s) sanitizado(s).`,
    `${evidence.length} evidencia(s) publica(s) aprovada(s).`,
    `${protocols.length} protocolo(s) oficial(is).`,
    `${openTasks.length} tarefa(s) aberta(s).`,
  ].join(" ");
  const nextSteps = [
    space.next_step || "Definir proximo encaminhamento editorial.",
    ...openTasks.slice(0, 6).map((task) => `- ${task.title}${task.status === "blocked" ? " (bloqueada)" : ""}`),
  ].join("\n");
  const demands = [
    "1. Reconhecer publicamente o problema descrito pela comunidade.",
    "2. Informar providencias, responsaveis e prazo de execucao.",
    "3. Registrar retorno oficial em linguagem compreensivel para acompanhamento publico.",
  ].join("\n");
  const executiveSummary = [
    space.public_synthesis || space.summary || "Sintese publica em construcao pela curadoria COMUN.",
    metrics,
  ].join("\n\n");
  const problemStatement = space.public_synthesis || space.summary || "Problema ainda precisa ser sintetizado com base nas evidencias aprovadas.";
  const publicVersion = [
    `# ${title}`,
    "",
    "## Sintese executiva",
    executiveSummary,
    "",
    "## Comunidades afetadas",
    affectedCommunities,
    "",
    "## Evidencias publicas",
    evidenceSummary,
    "",
    "## Protocolos oficiais",
    protocolSummary,
    "",
    "## Demandas",
    demands,
    "",
    "## Proximos passos",
    nextSteps,
  ].join("\n");

  return {
    pauta_id: space.id,
    slug: await nextDossierSlug(space.slug),
    title,
    status: "draft",
    review_status: "draft",
    reviewed_by_editor_at: null,
    approved_for_publication_at: null,
    published_at: null,
    unpublished_at: null,
    public_slug: null,
    public_title: null,
    public_body: null,
    public_summary: null,
    publication_notes: null,
    executive_summary: executiveSummary,
    problem_statement: problemStatement,
    affected_communities: affectedCommunities,
    evidence_summary: evidenceSummary,
    official_protocols_summary: protocolSummary,
    demands,
    next_steps: nextSteps,
    public_version: publicVersion,
    internal_notes: null,
    evidence_ids: evidence.map((item) => item.id),
  };
}

export async function createPautaDossierDraft(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");
  const draft = await generatePautaDossierDraft(pautaId);
  const { evidence_ids: evidenceIds, ...payload } = draft;
  const { data, error } = await supabase.from("comun_pauta_dossiers").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await replaceDossierEvidence(data.id, evidenceIds);
  return data.id as string;
}

export async function regeneratePautaDossierDraft(dossierId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");
  const current = await getAdminPautaDossier(dossierId);
  if (!current) throw new Error("Dossie nao encontrado.");
  const draft = await generatePautaDossierDraft(current.pauta_id);
  const { evidence_ids: evidenceIds, slug: _slug, status: _status, internal_notes: _internalNotes, ...payload } = draft;
  const { error } = await supabase.from("comun_pauta_dossiers").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", dossierId);
  if (error) throw new Error(error.message);
  await replaceDossierEvidence(dossierId, evidenceIds);
}

export async function replaceDossierEvidence(dossierId: string, evidenceIds: string[]) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");
  await supabase.from("comun_pauta_dossier_evidence").delete().eq("dossier_id", dossierId);
  if (!evidenceIds.length) return;
  const rows = evidenceIds.map((evidenceId, index) => ({ dossier_id: dossierId, evidence_id: evidenceId, position: index }));
  const { error } = await supabase.from("comun_pauta_dossier_evidence").insert(rows);
  if (error) throw new Error(error.message);
}

export function getDossierReviewState(reviews: PautaDossierReview[]): PautaDossierReviewState {
  const factual = latestApprovedReview(reviews, "factual_review");
  const editorial = latestApprovedReview(reviews, "editorial_review");
  const factualName = normalizeReviewerName(factual?.reviewer_name ?? "");
  const editorialName = normalizeReviewerName(editorial?.reviewer_name ?? "");
  const missingReasons = [] as string[];
  if (!factual) missingReasons.push("factual_review_missing");
  if (!editorial) missingReasons.push("editorial_review_missing");
  if (factual && editorial && factualName === editorialName) missingReasons.push("reviewers_not_distinct");
  return {
    factualApproved: Boolean(factual),
    editorialApproved: Boolean(editorial),
    reviewersDistinct: Boolean(factual && editorial && factualName !== editorialName),
    factualReviewer: factual?.reviewer_name ?? null,
    editorialReviewer: editorial?.reviewer_name ?? null,
    canPublish: missingReasons.length === 0,
    missingReasons,
  };
}

function latestApprovedReview(reviews: PautaDossierReview[], stage: "factual_review" | "editorial_review") {
  return reviews
    .filter((review) => review.review_stage === stage && review.decision === "approved")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
}

function normalizeReviewerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function nextDossierSlug(pautaSlug: string) {
  const supabase = createServiceSupabaseClient();
  const base = slugifyPauta(`dossie-${pautaSlug}`);
  if (!supabase) return `${base}-${Date.now()}`;
  const { data } = await supabase.from("comun_pauta_dossiers").select("slug").like("slug", `${base}%`);
  const existing = new Set((data ?? []).map((row) => row.slug));
  if (!existing.has(base)) return base;
  for (let index = 2; index < 50; index += 1) {
    const candidate = `${base}-${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function normalizeDossierJoin(row: any) {
  return {
    ...row,
    pauta: Array.isArray(row.pauta) ? row.pauta[0] ?? null : row.pauta ?? null,
  };
}
