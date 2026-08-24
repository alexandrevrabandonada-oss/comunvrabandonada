"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import {
  resolveArtworkSubmissionReadiness,
  resolveOralHistorySuggestionReadiness,
  resolveRadioContributionReadiness,
} from "@/lib/archive/cultural-curation-readiness";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const value = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const canonicalSlug = (slug: string) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error("Use um slug canônico: letras minúsculas, números e hífens.");
};
const requirePrivateRootReadiness = (ready: { readyForPrivateRootCreation: boolean; blockers: string[] }) => {
  if (!ready.readyForPrivateRootCreation)
    throw new Error(`A contribuição ainda não pode criar rascunho privado: ${ready.blockers.join(", ") || "revisão pendente"}.`);
};

/** The DB RPC owns locking and idempotency; this action authenticates and refetches evidence. */
export async function materializeOralHistorySuggestionPrivateRoot(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const suggestionId = value(formData, "suggestion_id"), title = value(formData, "title"), slug = value(formData, "slug");
  canonicalSlug(slug);
  if (!title) throw new Error("Título obrigatório para o rascunho privado.");
  const { data: suggestion, error: sourceError } = await db.from("comun_archive_oral_history_suggestions")
    .select("id,suggested_person_or_theme,story_summary,city,neighborhood,period_public,relationship_public,status,private_root_archive_item_id")
    .eq("id", suggestionId).maybeSingle();
  if (sourceError || !suggestion) throw new Error("Sugestão de História Oral não encontrada.");
  requirePrivateRootReadiness(resolveOralHistorySuggestionReadiness(suggestion, { explicitEditorialDecision: true }));
  const { data, error } = await (db as any).rpc("comun_materialize_oral_history_suggestion_private_root_v1", {
    p_suggestion_id: suggestionId, p_title: title, p_slug: slug,
  });
  if (error || !data) throw new Error(error?.message || "Não foi possível materializar a raiz privada.");
  await logComunAdminAction({
    session, action: "oral_history_private_root_materialized", targetType: "oral_history_suggestion", targetId: suggestionId,
    metadata: { private_root_archive_item_id: data, readiness_contract: "a5-a2-v1", publication: "not_authorized", provenance: "immutable_specialized_link" },
  });
  revalidatePath("/comun/admin/acervo/historias-orais");
  revalidatePath("/comun/admin/acervo/historias-orais/sugestoes");
  redirect(`/comun/admin/acervo/historias-orais/${data}`);
}

export async function materializeRadioContributionPrivateRoot(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const contributionId = value(formData, "contribution_id"), title = value(formData, "title"), slug = value(formData, "slug"), programItemId = value(formData, "program_item_id") || null;
  canonicalSlug(slug);
  if (!title) throw new Error("Título obrigatório para o rascunho privado.");
  const { data: contribution, error: sourceError } = await db.from("comun_radio_contributions")
    .select("id,public_protocol,contribution_type,title_suggestion,context_suggestion,status,rights_state,publication_scope,reuse_permission,license_code,voice_source,material_source,private_root_kind,private_root_archive_item_id")
    .eq("id", contributionId).maybeSingle();
  if (sourceError || !contribution) throw new Error("Contribuição de Rádio não encontrada.");
  const privateRootKind = contribution.contribution_type === "program_proposal" ? "program"
    : ["community_audio", "authorized_testimony"].includes(contribution.contribution_type) ? "episode" : null;
  if (!privateRootKind) throw new Error("Esta contribuição não cria uma nova raiz de Rádio; escolha o encaminhamento editorial apropriado.");
  if (privateRootKind === "episode" && !programItemId) throw new Error("Escolha explicitamente o programa canônico para este episódio privado.");
  if (privateRootKind === "episode") {
    const { data: program } = await db.from("comun_radio_programs").select("archive_item_id").eq("archive_item_id", programItemId).maybeSingle();
    if (!program) throw new Error("Programa canônico inválido para o episódio privado.");
  }
  requirePrivateRootReadiness(resolveRadioContributionReadiness(contribution, {
    explicitEditorialDecision: true, targetKind: privateRootKind, programSelected: Boolean(programItemId),
  }));
  const { data, error } = await (db as any).rpc("comun_materialize_radio_contribution_private_root_v1", {
    p_contribution_id: contributionId, p_private_root_kind: privateRootKind, p_title: title, p_slug: slug, p_program_item_id: programItemId,
  });
  if (error || !data) throw new Error(error?.message || "Não foi possível materializar a raiz privada.");
  await logComunAdminAction({
    session, action: "radio_private_root_materialized", targetType: "radio_contribution", targetId: contributionId,
    metadata: { private_root_archive_item_id: data, private_root_kind: privateRootKind, readiness_contract: "a5-a2-v1", publication: "not_authorized", provenance: "immutable_specialized_link" },
  });
  revalidatePath("/comun/admin/radio/contribuicoes");
  redirect(privateRootKind === "program" ? `/comun/admin/radio/programas/${data}` : `/comun/admin/radio/episodios/${data}`);
}

export async function linkRadioContributionPrivateRoot(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const contributionId = value(formData, "contribution_id"), targetKind = value(formData, "target_kind"), targetId = value(formData, "target_id");
  if (!["program", "episode"].includes(targetKind) || !targetId) throw new Error("Escolha uma raiz canônica de programa ou episódio.");
  const { data: contribution } = await db.from("comun_radio_contributions")
    .select("id,public_protocol,contribution_type,title_suggestion,context_suggestion,status,rights_state,publication_scope,reuse_permission,license_code,voice_source,material_source,private_root_kind,private_root_archive_item_id")
    .eq("id", contributionId).maybeSingle();
  if (!contribution) throw new Error("Contribuição de Rádio não encontrada.");
  if (!["correction", "complement", "withdrawal"].includes(contribution.contribution_type)) throw new Error("Somente correções, complementos e retiradas podem reconciliar uma raiz existente.");
  const targetTable = targetKind === "program" ? "comun_radio_programs" : "comun_radio_episodes";
  const { data: target } = await db.from(targetTable).select("archive_item_id").eq("archive_item_id", targetId).maybeSingle();
  if (!target) throw new Error("A raiz canônica escolhida não corresponde ao tipo informado.");
  const readiness = resolveRadioContributionReadiness(contribution, {
    explicitEditorialDecision: true, targetKind: targetKind as "program" | "episode", existingTargetSelected: true,
  });
  if (!readiness.readyForExistingRootLink) throw new Error(`A contribuição ainda não pode ser reconciliada: ${readiness.blockers.join(", ") || "revisão pendente"}.`);
  const { data, error } = await (db as any).rpc("comun_link_radio_contribution_private_root_v1", {
    p_contribution_id: contributionId, p_private_root_kind: targetKind, p_private_root_archive_item_id: targetId,
  });
  if (error || !data) throw new Error(error?.message || "Não foi possível vincular a raiz privada.");
  await logComunAdminAction({
    session, action: "radio_existing_root_linked", targetType: "radio_contribution", targetId: contributionId,
    metadata: { private_root_archive_item_id: data, private_root_kind: targetKind, publication: "not_authorized" },
  });
  revalidatePath("/comun/admin/radio/contribuicoes");
  redirect(targetKind === "program" ? `/comun/admin/radio/programas/${data}` : `/comun/admin/radio/episodios/${data}`);
}

export async function materializeArtworkSubmissionPrivateRoot(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const submissionId = value(formData, "submission_id"), title = value(formData, "title"), slug = value(formData, "slug");
  canonicalSlug(slug);
  if (!title) throw new Error("Título obrigatório para o rascunho privado.");
  const { data: submission } = await db.from("comun_archive_artwork_submissions")
    .select("id,public_protocol,submission_kind,title_suggestion,artwork_type,context_suggestion,territory_id,authorship_source,status,archive_item_id,rights_state,publication_scope,reuse_permission,license_code")
    .eq("id", submissionId).maybeSingle();
  if (!submission) throw new Error("Contribuição de Arte não encontrada.");
  requirePrivateRootReadiness(resolveArtworkSubmissionReadiness(submission, { explicitEditorialDecision: true }));
  const { data, error } = await (db as any).rpc("comun_materialize_artwork_submission_private_root_v1", {
    p_submission_id: submissionId, p_title: title, p_slug: slug,
  });
  if (error || !data) throw new Error(error?.message || "Não foi possível materializar a obra privada.");
  await logComunAdminAction({
    session, action: "artwork_private_root_materialized", targetType: "artwork_submission", targetId: submissionId,
    metadata: { private_root_archive_item_id: data, readiness_contract: "a5-a2-r1-v1", publication: "not_authorized", provenance: "immutable_specialized_link" },
  });
  revalidatePath("/comun/admin/acervo/arte/contribuicoes");
  redirect(`/comun/admin/acervo/arte/${data}`);
}

export async function linkArtworkSubmissionPrivateRoot(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const submissionId = value(formData, "submission_id");
  const targetId = value(formData, "target_id");
  if (!targetId) throw new Error("Escolha explicitamente uma obra privada existente.");
  const { data: submission } = await db.from("comun_archive_artwork_submissions")
    .select("id,public_protocol,submission_kind,title_suggestion,artwork_type,context_suggestion,territory_id,authorship_source,status,archive_item_id,rights_state,publication_scope,reuse_permission,license_code")
    .eq("id", submissionId).maybeSingle();
  if (!submission) throw new Error("Contribuição de Arte não encontrada.");
  if (!["existing_work_complement", "credit_correction"].includes(submission.submission_kind))
    throw new Error("Somente complementos e correções podem ser vinculados a uma obra existente.");
  const { data: target } = await db.from("comun_archive_items")
    .select("id,item_type,status,visibility").eq("id", targetId)
    .eq("item_type", "territorial_artwork").eq("status", "draft").eq("visibility", "private").maybeSingle();
  if (!target) throw new Error("A obra escolhida não é um rascunho privado compatível.");
  const { data: artwork } = await db.from("comun_archive_artworks")
    .select("archive_item_id").eq("archive_item_id", targetId).maybeSingle();
  if (!artwork) throw new Error("A raiz escolhida não possui uma obra de Arte válida.");
  const readiness = resolveArtworkSubmissionReadiness(submission, { explicitEditorialDecision: true, existingTargetSelected: true });
  if (!readiness.readyForExistingRootLink)
    throw new Error("Precisamos de mais contexto antes de vincular esta contribuição.");
  const { data, error } = await (db as any).rpc("comun_link_artwork_submission_private_root_v1", {
    p_submission_id: submissionId, p_private_root_archive_item_id: targetId,
  });
  if (error || !data) throw new Error(error?.message || "Não foi possível vincular a obra privada.");
  await logComunAdminAction({
    session, action: "artwork_existing_root_linked", targetType: "artwork_submission", targetId: submissionId,
    metadata: { private_root_archive_item_id: data, readiness_contract: "a5-a2-r1-v1", publication: "not_authorized", provenance: "immutable_specialized_link" },
  });
  revalidatePath("/comun/admin/acervo/arte/contribuicoes");
  redirect(`/comun/admin/acervo/arte/${data}`);
}
