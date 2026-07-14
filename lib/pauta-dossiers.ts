import { unstable_noStore as noStore } from "next/cache";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { PublicDossierFeature, PautaDossier, PautaDossierEvidence, PautaDossierPublicationSnapshot, PautaDossierReview, PautaDossierReviewPriority, PautaEvidenceItem, PautaSpace } from "@/lib/types";
import {
  getAdminPautaSpace,
  listAdminPautaTasks,
  listPublicPautaEvidence,
  listSafePautaOfficialProtocols,
  listSafePautaReports,
  slugifyPauta,
} from "@/lib/pauta-spaces";

const dossierSelect = "id, pauta_id, slug, title, status, review_status, reviewed_by_editor_at, approved_for_publication_at, published_at, unpublished_at, public_slug, public_title, public_body, public_summary, publication_notes, executive_summary, problem_statement, affected_communities, evidence_summary, official_protocols_summary, demands, next_steps, public_version, internal_notes, factual_reviewer_assigned, editorial_reviewer_assigned, factual_reviewer_assigned_user_id, editorial_reviewer_assigned_user_id, review_priority, review_due_at, review_notes_internal, final_publication_checklist, final_publication_notes, created_at, updated_at";
const publicationSnapshotSelect = "id, dossier_id, public_title, public_summary, public_body, public_slug, published_by_user_id, published_by_name_snapshot, published_at, unpublished_at, unpublished_by_user_id, unpublish_reason, snapshot_status, public_change_note, public_version_label, public_updated_at, created_at";

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
  publication_snapshots: PautaDossierPublicationSnapshot[];
  active_publication_snapshot: PautaDossierPublicationSnapshot | null;
};

export type PublishedPautaDossierSnapshot = PautaDossierPublicationSnapshot & {
  dossier: Pick<PautaDossier, "id" | "title" | "review_status"> | null;
  pauta: Pick<PautaSpace, "id" | "slug" | "title" | "community" | "category"> | null;
};

export type PublicDossierFeatureWithSnapshot = PublicDossierFeature & {
  snapshot: PublishedPautaDossierSnapshot;
};

export type PublicDossierRecommendationGroups = {
  featured: PublicDossierFeatureWithSnapshot[];
  recent: PublishedPautaDossierSnapshot[];
  recentlyUpdated: PublishedPautaDossierSnapshot[];
  byPauta: Array<{ key: string; title: string; dossiers: PublishedPautaDossierSnapshot[] }>;
  byCommunity: Array<{ key: string; title: string; dossiers: PublishedPautaDossierSnapshot[] }>;
  byCategory: Array<{ key: string; title: string; dossiers: PublishedPautaDossierSnapshot[] }>;
};

export type PautaDossierReviewState = {
  factualApproved: boolean;
  editorialApproved: boolean;
  reviewersDistinct: boolean;
  reviewerIdentitiesBound: boolean;
  reviewerUsersDistinct: boolean;
  factualReviewer: string | null;
  editorialReviewer: string | null;
  factualReviewerUserId: string | null;
  editorialReviewerUserId: string | null;
  canPublish: boolean;
  missingReasons: string[];
};

export type PautaDossierReviewQueueFilter =
  | "pending_factual"
  | "pending_editorial"
  | "factual_without_editorial"
  | "editorial_without_factual"
  | "blocked_same_reviewer"
  | "changes_requested"
  | "rejected"
  | "ready_to_publish";

export type PautaDossierReviewQueueItem = PautaDossierWithPauta & {
  reviews: PautaDossierReview[];
  review_state: PautaDossierReviewState;
  queue_tags: PautaDossierReviewQueueFilter[];
  pending_stage: string;
  latest_review: PautaDossierReview | null;
  age_days: number;
  due_state: PautaDossierDueState;
};

export type PautaDossierReviewQueueSummary = {
  pendingFactual: number;
  pendingEditorial: number;
  blocked: number;
  readyToPublish: number;
  dueToday: number;
  overdue: number;
};

export type PautaDossierDueState = {
  dueAt: string | null;
  daysUntilDue: number | null;
  isDueToday: boolean;
  isOverdue: boolean;
};

export type PautaDossierReviewQueueFilters = {
  queueFilter?: string;
  responsible?: string;
  priority?: string;
  overdue?: boolean;
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
    .select(`${dossierSelect}, pauta:comun_pauta_spaces(id, slug, title, community, category), evidence_items:comun_pauta_dossier_evidence(id, dossier_id, evidence_id, position, included_note, created_at, evidence:comun_pauta_evidence_items(id, title, summary, evidence_type, public_note, status, sensitivity)), reviews:comun_pauta_dossier_reviews(id, dossier_id, review_stage, reviewer_name, reviewer_role, reviewer_user_id, decision, checklist, notes, created_at)`)
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
  normalized.publication_snapshots = await listDossierPublicationSnapshots(normalized.id);
  normalized.active_publication_snapshot = normalized.publication_snapshots.find((snapshot) => isActiveSnapshot(snapshot)) ?? null;
  return normalized;
}

export async function listAdminPautaDossierReviewQueue(filters: PautaDossierReviewQueueFilters | string = {}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return { items: [] as PautaDossierReviewQueueItem[], summary: emptyQueueSummary() };
  const normalizedFilters = typeof filters === "string" ? { queueFilter: filters } : filters;

  const { data, error } = await supabase
    .from("comun_pauta_dossiers")
    .select(`${dossierSelect}, pauta:comun_pauta_spaces(id, slug, title, community, category), reviews:comun_pauta_dossier_reviews(id, dossier_id, review_stage, reviewer_name, reviewer_role, reviewer_user_id, decision, checklist, notes, created_at)`)
    .in("review_status", ["draft", "editorial_review", "changes_requested", "approved", "unpublished"])
    .order("updated_at", { ascending: false })
    .limit(250);

  if (error || !data) return { items: [] as PautaDossierReviewQueueItem[], summary: emptyQueueSummary() };
  const items = data.map(toReviewQueueItem).sort(compareReviewQueueItems);
  const selected = normalizeQueueFilter(normalizedFilters.queueFilter);
  const responsible = normalizeReviewerName(normalizedFilters.responsible ?? "");
  const priority = normalizeReviewPriority(normalizedFilters.priority ?? "");
  const filtered = items.filter((item) => {
    if (selected && !item.queue_tags.includes(selected)) return false;
    if (priority && item.review_priority !== priority) return false;
    if (normalizedFilters.overdue && !item.due_state.isOverdue) return false;
    if (responsible) {
      const factual = normalizeReviewerName(item.factual_reviewer_assigned ?? "");
      const editorial = normalizeReviewerName(item.editorial_reviewer_assigned ?? "");
      if (!factual.includes(responsible) && !editorial.includes(responsible)) return false;
    }
    return true;
  });
  return { items: filtered, summary: summarizeReviewQueue(items) };
}

export async function listPublishedPautaDossiers() {
  noStore();
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublishedPautaDossierSnapshot[];

  const { data, error } = await supabase
    .from("comun_pauta_dossier_publication_snapshots")
    .select(publicationSnapshotSelect)
    .in("snapshot_status", ["published", "rollback"])
    .is("unpublished_at", null)
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return hydratePublishedSnapshots(data as PautaDossierPublicationSnapshot[]);
}

export async function listPublicDossierFeatures(slot = "featured") {
  noStore();
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublicDossierFeatureWithSnapshot[];

  const { data, error } = await supabase
    .from("comun_public_dossier_features")
    .select("id, snapshot_id, slot, public_label, public_note, priority, active, created_at, updated_at")
    .eq("active", true)
    .eq("slot", slot)
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error || !data?.length) return [];
  const features = data as PublicDossierFeature[];
  const snapshotIds = Array.from(new Set(features.map((feature) => feature.snapshot_id)));
  const { data: snapshots } = await supabase
    .from("comun_pauta_dossier_publication_snapshots")
    .select(publicationSnapshotSelect)
    .in("id", snapshotIds)
    .in("snapshot_status", ["published", "rollback"])
    .is("unpublished_at", null);
  const hydrated = await hydratePublishedSnapshots((snapshots ?? []) as PautaDossierPublicationSnapshot[]);
  const byId = new Map(hydrated.map((snapshot) => [snapshot.id, snapshot]));
  return features
    .map((feature) => {
      const snapshot = byId.get(feature.snapshot_id);
      return snapshot ? { ...feature, snapshot } : null;
    })
    .filter(Boolean) as PublicDossierFeatureWithSnapshot[];
}

export async function listPublicDossierRecommendations() {
  const [dossiers, featured] = await Promise.all([listPublishedPautaDossiers(), listPublicDossierFeatures()]);
  return buildPublicDossierRecommendations(dossiers, featured);
}

export async function getPublishedPautaDossierBySlug(slug: string) {
  noStore();
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_pauta_dossier_publication_snapshots")
    .select(publicationSnapshotSelect)
    .eq("public_slug", slug)
    .in("snapshot_status", ["published", "rollback"])
    .is("unpublished_at", null)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const [snapshot] = await hydratePublishedSnapshots([data as PautaDossierPublicationSnapshot]);
  return snapshot ?? null;
}

export async function listPublishedPautaDossiersByPauta(pautaId: string, excludeSlug?: string) {
  const dossiers = await listPublishedPautaDossiers();
  return dossiers.filter((dossier) => dossier.pauta?.id === pautaId && dossier.public_slug !== excludeSlug);
}

export async function listPublishedPautaDossiersByCommunity(community: string, excludeSlug?: string) {
  const dossiers = await listPublishedPautaDossiers();
  return dossiers.filter((dossier) => dossier.pauta?.community === community && dossier.public_slug !== excludeSlug);
}

export async function listRelatedPublishedPautaDossiers(dossier: PublishedPautaDossierSnapshot, limit = 4) {
  const all = await listPublishedPautaDossiers();
  const scored = all
    .filter((item) => item.public_slug !== dossier.public_slug)
    .map((item) => {
      let score = 0;
      if (dossier.pauta?.id && item.pauta?.id === dossier.pauta.id) score += 4;
      if (dossier.pauta?.category && item.pauta?.category === dossier.pauta.category) score += 2;
      if (dossier.pauta?.community && item.pauta?.community === dossier.pauta.community) score += 2;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.item.public_updated_at ?? b.item.published_at).getTime() - new Date(a.item.public_updated_at ?? a.item.published_at).getTime());
  return scored.slice(0, limit).map(({ item }) => item);
}

export async function listDossierPublicationSnapshots(dossierId: string) {
  noStore();
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaDossierPublicationSnapshot[];
  const { data, error } = await supabase
    .from("comun_pauta_dossier_publication_snapshots")
    .select(publicationSnapshotSelect)
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as PautaDossierPublicationSnapshot[];
}

export async function getDossierPublicationSnapshot(snapshotId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("comun_pauta_dossier_publication_snapshots")
    .select(publicationSnapshotSelect)
    .eq("id", snapshotId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as PautaDossierPublicationSnapshot;
}

export async function listDossierPublicFeatures(snapshotIds: string[]) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !snapshotIds.length) return [] as PublicDossierFeature[];
  const { data } = await supabase
    .from("comun_public_dossier_features")
    .select("id, snapshot_id, slot, public_label, public_note, priority, active, created_at, updated_at")
    .in("snapshot_id", snapshotIds)
    .order("priority", { ascending: true });
  return (data ?? []) as PublicDossierFeature[];
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
    factual_reviewer_assigned: null,
    editorial_reviewer_assigned: null,
    review_priority: "normal",
    review_due_at: null,
    review_notes_internal: null,
    factual_reviewer_assigned_user_id: null,
    editorial_reviewer_assigned_user_id: null,
    final_publication_checklist: {},
    final_publication_notes: null,
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
  const {
    evidence_ids: evidenceIds,
    slug: _slug,
    status: _status,
    internal_notes: _internalNotes,
    factual_reviewer_assigned: _factualAssigned,
    editorial_reviewer_assigned: _editorialAssigned,
    review_priority: _reviewPriority,
    review_due_at: _reviewDueAt,
    review_notes_internal: _reviewNotesInternal,
    factual_reviewer_assigned_user_id: _factualAssignedUser,
    editorial_reviewer_assigned_user_id: _editorialAssignedUser,
    ...payload
  } = draft;
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
  const factualUserId = factual?.reviewer_user_id ?? null;
  const editorialUserId = editorial?.reviewer_user_id ?? null;
  const missingReasons = [] as string[];
  if (!factual) missingReasons.push("factual_review_missing");
  if (!editorial) missingReasons.push("editorial_review_missing");
  if (factual && !factualUserId) missingReasons.push("factual_reviewer_identity_missing");
  if (editorial && !editorialUserId) missingReasons.push("editorial_reviewer_identity_missing");
  if (factual && editorial && factualName === editorialName) missingReasons.push("reviewers_not_distinct");
  if (factualUserId && editorialUserId && factualUserId === editorialUserId) missingReasons.push("reviewer_user_not_distinct");
  return {
    factualApproved: Boolean(factual),
    editorialApproved: Boolean(editorial),
    reviewersDistinct: Boolean(factual && editorial && factualName !== editorialName),
    reviewerIdentitiesBound: Boolean(factualUserId && editorialUserId),
    reviewerUsersDistinct: Boolean(factualUserId && editorialUserId && factualUserId !== editorialUserId),
    factualReviewer: factual?.reviewer_name ?? null,
    editorialReviewer: editorial?.reviewer_name ?? null,
    factualReviewerUserId: factualUserId,
    editorialReviewerUserId: editorialUserId,
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
    final_publication_checklist: row.final_publication_checklist ?? {},
    pauta: Array.isArray(row.pauta) ? row.pauta[0] ?? null : row.pauta ?? null,
  };
}

async function hydratePublishedSnapshots(snapshots: PautaDossierPublicationSnapshot[]) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !snapshots.length) return snapshots.map((snapshot) => ({ ...snapshot, dossier: null, pauta: null })) as PublishedPautaDossierSnapshot[];
  const dossierIds = Array.from(new Set(snapshots.map((snapshot) => snapshot.dossier_id)));
  const { data } = await supabase
    .from("comun_pauta_dossiers")
    .select("id, title, review_status, pauta_id")
    .in("id", dossierIds);
  const pautaIds = Array.from(new Set((data ?? []).map((row: any) => row.pauta_id).filter(Boolean)));
  const { data: pautas } = pautaIds.length
    ? await supabase.from("comun_pauta_spaces").select("id, slug, title, community, category").in("id", pautaIds)
    : { data: [] };
  const pautaById = new Map((pautas ?? []).map((pauta: any) => [pauta.id, pauta]));
  const byId = new Map((data ?? []).map((row: any) => {
    const dossier = { id: row.id, title: row.title, review_status: row.review_status };
    return [row.id, { dossier, pauta: pautaById.get(row.pauta_id) ?? null }];
  }));
  return snapshots.map((snapshot) => {
    const relation = byId.get(snapshot.dossier_id);
    return { ...snapshot, dossier: relation?.dossier ?? null, pauta: relation?.pauta ?? null };
  }) as PublishedPautaDossierSnapshot[];
}

function buildPublicDossierRecommendations(dossiers: PublishedPautaDossierSnapshot[], featured: PublicDossierFeatureWithSnapshot[]): PublicDossierRecommendationGroups {
  const recent = [...dossiers].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()).slice(0, 6);
  const recentlyUpdated = [...dossiers]
    .sort((a, b) => new Date(b.public_updated_at ?? b.published_at).getTime() - new Date(a.public_updated_at ?? a.published_at).getTime())
    .slice(0, 6);
  return {
    featured,
    recent,
    recentlyUpdated,
    byPauta: groupPublicDossiers(dossiers, (dossier) => dossier.pauta?.id ?? "", (dossier) => dossier.pauta?.title ?? ""),
    byCommunity: groupPublicDossiers(dossiers, (dossier) => dossier.pauta?.community ?? "", (dossier) => dossier.pauta?.community ?? ""),
    byCategory: groupPublicDossiers(dossiers, (dossier) => dossier.pauta?.category ?? "", (dossier) => dossier.pauta?.category ?? ""),
  };
}

function groupPublicDossiers(dossiers: PublishedPautaDossierSnapshot[], keyFor: (dossier: PublishedPautaDossierSnapshot) => string, titleFor: (dossier: PublishedPautaDossierSnapshot) => string) {
  const groups = new Map<string, { key: string; title: string; dossiers: PublishedPautaDossierSnapshot[] }>();
  for (const dossier of dossiers) {
    const key = keyFor(dossier).trim();
    const title = titleFor(dossier).trim();
    if (!key || !title) continue;
    const group = groups.get(key) ?? { key, title, dossiers: [] };
    group.dossiers.push(dossier);
    groups.set(key, group);
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      dossiers: group.dossiers
        .sort((a, b) => new Date(b.public_updated_at ?? b.published_at).getTime() - new Date(a.public_updated_at ?? a.published_at).getTime())
        .slice(0, 4),
    }))
    .sort((a, b) => b.dossiers.length - a.dossiers.length || a.title.localeCompare(b.title, "pt-BR"))
    .slice(0, 6);
}

function isActiveSnapshot(snapshot: PautaDossierPublicationSnapshot) {
  return ["published", "rollback"].includes(snapshot.snapshot_status) && !snapshot.unpublished_at;
}

function toReviewQueueItem(row: any): PautaDossierReviewQueueItem {
  const normalized = normalizeDossierJoin(row) as PautaDossierWithPauta;
  const reviews = ((row.reviews ?? []) as PautaDossierReview[])
    .map((review: any) => ({ ...review, checklist: review.checklist ?? {} }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const reviewState = getDossierReviewState(reviews);
  const latestReview = reviews[0] ?? null;
  const queueTags = getReviewQueueTags(normalized, reviews, reviewState);
  return {
    ...normalized,
    reviews,
    review_state: reviewState,
    queue_tags: queueTags,
    pending_stage: getPendingStage(queueTags),
    latest_review: latestReview,
    age_days: daysSince(normalized.created_at),
    due_state: getDossierDueState(normalized.review_due_at),
  };
}

function getReviewQueueTags(dossier: PautaDossierWithPauta, reviews: PautaDossierReview[], state: PautaDossierReviewState) {
  const tags = [] as PautaDossierReviewQueueFilter[];
  const hasFactual = state.factualApproved;
  const hasEditorial = state.editorialApproved;
  const latestRejected = reviews.some((review) => review.decision === "rejected");
  const latestChangesRequested = reviews.some((review) => review.decision === "changes_requested");

  if (!hasFactual) tags.push("pending_factual");
  if (!hasEditorial) tags.push("pending_editorial");
  if (hasFactual && !hasEditorial) tags.push("factual_without_editorial");
  if (hasEditorial && !hasFactual) tags.push("editorial_without_factual");
  if (hasFactual && hasEditorial && !state.reviewersDistinct) tags.push("blocked_same_reviewer");
  if (latestChangesRequested) tags.push("changes_requested");
  if (latestRejected) tags.push("rejected");
  if (state.canPublish && dossier.review_status === "approved" && dossier.public_title && dossier.public_summary && dossier.public_body && dossier.public_slug) {
    tags.push("ready_to_publish");
  }
  return tags;
}

function getPendingStage(tags: PautaDossierReviewQueueFilter[]) {
  if (tags.includes("ready_to_publish")) return "Pronto para publicar";
  if (tags.includes("blocked_same_reviewer")) return "Bloqueado por mesmo revisor";
  if (tags.includes("rejected")) return "Rejeitado";
  if (tags.includes("changes_requested")) return "Ajustes solicitados";
  if (tags.includes("factual_without_editorial")) return "Falta revisao editorial";
  if (tags.includes("editorial_without_factual")) return "Falta revisao factual";
  if (tags.includes("pending_factual") && tags.includes("pending_editorial")) return "Faltam revisoes";
  if (tags.includes("pending_factual")) return "Falta revisao factual";
  if (tags.includes("pending_editorial")) return "Falta revisao editorial";
  return "Sem pendencia calculada";
}

function summarizeReviewQueue(items: PautaDossierReviewQueueItem[]): PautaDossierReviewQueueSummary {
  return {
    pendingFactual: items.filter((item) => item.queue_tags.includes("pending_factual")).length,
    pendingEditorial: items.filter((item) => item.queue_tags.includes("pending_editorial")).length,
    blocked: items.filter((item) => item.queue_tags.includes("blocked_same_reviewer")).length,
    readyToPublish: items.filter((item) => item.queue_tags.includes("ready_to_publish")).length,
    dueToday: items.filter((item) => item.due_state.isDueToday).length,
    overdue: items.filter((item) => item.due_state.isOverdue).length,
  };
}

function normalizeQueueFilter(value?: string): PautaDossierReviewQueueFilter | "" {
  const valid = ["pending_factual", "pending_editorial", "factual_without_editorial", "editorial_without_factual", "blocked_same_reviewer", "changes_requested", "rejected", "ready_to_publish"];
  return valid.includes(value ?? "") ? (value as PautaDossierReviewQueueFilter) : "";
}

function emptyQueueSummary(): PautaDossierReviewQueueSummary {
  return { pendingFactual: 0, pendingEditorial: 0, blocked: 0, readyToPublish: 0, dueToday: 0, overdue: 0 };
}

function daysSince(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000)));
}

function getDossierDueState(value: string | null): PautaDossierDueState {
  if (!value) return { dueAt: null, daysUntilDue: null, isDueToday: false, isOverdue: false };
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.getTime())) return { dueAt: null, daysUntilDue: null, isDueToday: false, isOverdue: false };
  const today = startOfLocalDay(new Date());
  const dueDay = startOfLocalDay(dueAt);
  const daysUntilDue = Math.round((dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return {
    dueAt: value,
    daysUntilDue,
    isDueToday: daysUntilDue === 0,
    isOverdue: daysUntilDue < 0,
  };
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function normalizeReviewPriority(value?: string): PautaDossierReviewPriority | "" {
  const valid = ["low", "normal", "high", "urgent"];
  return valid.includes(value ?? "") ? (value as PautaDossierReviewPriority) : "";
}

function priorityWeight(value: PautaDossierReviewPriority) {
  return { urgent: 0, high: 1, normal: 2, low: 3 }[value] ?? 2;
}

function compareReviewQueueItems(a: PautaDossierReviewQueueItem, b: PautaDossierReviewQueueItem) {
  if (a.due_state.isOverdue !== b.due_state.isOverdue) return a.due_state.isOverdue ? -1 : 1;
  if (a.due_state.isDueToday !== b.due_state.isDueToday) return a.due_state.isDueToday ? -1 : 1;
  const priorityDiff = priorityWeight(a.review_priority) - priorityWeight(b.review_priority);
  if (priorityDiff !== 0) return priorityDiff;
  const aDue = a.review_due_at ? new Date(a.review_due_at).getTime() : Number.POSITIVE_INFINITY;
  const bDue = b.review_due_at ? new Date(b.review_due_at).getTime() : Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}
