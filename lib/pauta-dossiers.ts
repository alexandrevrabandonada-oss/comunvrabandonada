import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { PautaDossier, PautaDossierEvidence, PautaEvidenceItem, PautaSpace } from "@/lib/types";
import {
  getAdminPautaSpace,
  listAdminPautaTasks,
  listPublicPautaEvidence,
  listSafePautaOfficialProtocols,
  listSafePautaReports,
  slugifyPauta,
} from "@/lib/pauta-spaces";

export type PautaDossierWithPauta = PautaDossier & {
  pauta: Pick<PautaSpace, "id" | "slug" | "title" | "community" | "category"> | null;
};

export type PautaDossierEvidenceWithItem = PautaDossierEvidence & {
  evidence: Pick<PautaEvidenceItem, "id" | "title" | "summary" | "evidence_type" | "public_note" | "status" | "sensitivity"> | null;
};

export type PautaDossierDetail = PautaDossierWithPauta & {
  evidence_items: PautaDossierEvidenceWithItem[];
};

export type GeneratedPautaDossierDraft = Omit<PautaDossier, "id" | "created_at" | "updated_at"> & {
  evidence_ids: string[];
};

export async function listAdminPautaDossiers(filters: { pautaId?: string } = {}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PautaDossierWithPauta[];

  let query = supabase
    .from("comun_pauta_dossiers")
    .select("id, pauta_id, slug, title, status, executive_summary, problem_statement, affected_communities, evidence_summary, official_protocols_summary, demands, next_steps, public_version, internal_notes, created_at, updated_at, pauta:comun_pauta_spaces(id, slug, title, community, category)")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters.pautaId) query = query.eq("pauta_id", filters.pautaId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(normalizeDossierJoin) as PautaDossierWithPauta[];
}

export async function getAdminPautaDossier(id: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comun_pauta_dossiers")
    .select("id, pauta_id, slug, title, status, executive_summary, problem_statement, affected_communities, evidence_summary, official_protocols_summary, demands, next_steps, public_version, internal_notes, created_at, updated_at, pauta:comun_pauta_spaces(id, slug, title, community, category), evidence_items:comun_pauta_dossier_evidence(id, dossier_id, evidence_id, position, included_note, created_at, evidence:comun_pauta_evidence_items(id, title, summary, evidence_type, public_note, status, sensitivity))")
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
  return normalized;
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
