"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireComunAdminRole } from "@/lib/admin-auth";

import {
  COMUN_COLLECTIVE_ENTITY_REVIEW_BASIS,
  COMUN_COLLECTIVE_ENTITY_REVIEW_DECISIONS,
  COMUN_COLLECTIVE_ENTITY_REVIEW_STAGES,
  listCollectiveEntityLegitimacyReviewQueue,
  reviewCollectiveEntityCandidate,
  type ComunCollectiveEntityReviewBasis,
  type ComunCollectiveEntityReviewDecision,
  type ComunCollectiveEntityReviewStage,
} from "@/lib/comun-collective-entity-legitimacy-runtime";
import {
  COMUN_COLLECTIVE_ENTITY_PROJECTION_DECISIONS,
  decideCollectiveEntityProjection,
  listCollectiveEntityProjectionReviewQueue,
  type ComunCollectiveEntityProjectionDecision,
} from "@/lib/comun-collective-entity-projection-runtime";

/**
 * Reviewer identity is intentionally absent from action input. The runtime
 * derives it from auth.getUser(); the database independently validates the
 * active reviewer profile and rejects self-review.
 */
export async function listCollectiveEntityLegitimacyReviewQueueAction() {
  return listCollectiveEntityLegitimacyReviewQueue();
}

export async function reviewCollectiveEntityCandidateAction(input: {
  requestId: string;
  candidateId: string;
  reviewStage: ComunCollectiveEntityReviewStage;
  decision: ComunCollectiveEntityReviewDecision;
  basisKind: ComunCollectiveEntityReviewBasis;
  basisReferencePrivate?: string | null;
}) {
  return reviewCollectiveEntityCandidate(input);
}


/**
 * R5 publisher identity is intentionally absent from action input. The server
 * derives it from auth.getUser(); the database independently requires the
 * dedicated publisher role and rejects self-publication.
 */
export async function listCollectiveEntityProjectionReviewQueueAction() {
  return listCollectiveEntityProjectionReviewQueue();
}

export async function decideCollectiveEntityProjectionAction(input: {
  requestId: string;
  candidateId: string;
  decision: ComunCollectiveEntityProjectionDecision;
  rationalePrivate: string;
}) {
  return decideCollectiveEntityProjection(input);
}


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeProjectionDecisionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("COMUN_RELATA_PROJECTION_SELF_PUBLISH_FORBIDDEN"))
    return "autopublicacao-bloqueada";
  if (
    message.includes("COMUN_RELATA_CANDIDATE_PUBLISHER_FORBIDDEN") ||
    message.includes("COMUN_RELATA_CANDIDATE_PUBLISHER_REQUIRED")
  )
    return "publisher-invalido";
  if (message.includes("COMUN_RELATA_PROJECTION_REVIEW_UNAVAILABLE"))
    return "candidato-indisponivel";
  if (message.includes("COMUN_RELATA_PROJECTION_DECISION_REQUEST_CONFLICT"))
    return "requisicao-conflitante";
  return "falha-segura";
}

export async function decideCollectiveEntityProjectionFormAction(
  formData: FormData,
) {
  await requireComunAdminRole(["publisher"]);

  const requestId = String(formData.get("request_id") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const rationalePrivate = String(
    formData.get("rationale_private") ?? "",
  ).trim();

  if (
    !UUID_PATTERN.test(requestId) ||
    !UUID_PATTERN.test(candidateId) ||
    !COMUN_COLLECTIVE_ENTITY_PROJECTION_DECISIONS.includes(
      decision as ComunCollectiveEntityProjectionDecision,
    ) ||
    rationalePrivate.length < 3 ||
    rationalePrivate.length > 1000
  ) {
    redirect("/comun/admin/entidades?erro=entrada-invalida");
  }

  if (
    decision === "publish" &&
    formData.get("confirm_publication") !== "on"
  ) {
    redirect("/comun/admin/entidades?erro=confirmacao-publicacao");
  }

  let result;
  try {
    result = await decideCollectiveEntityProjection({
      requestId,
      candidateId,
      decision: decision as ComunCollectiveEntityProjectionDecision,
      rationalePrivate,
    });
  } catch (error) {
    redirect(
      `/comun/admin/entidades?erro=${safeProjectionDecisionError(error)}`,
    );
  }

  if (!result) redirect("/comun/admin/entidades?erro=resultado-ausente");

  revalidatePath("/comun/admin/entidades");
  redirect(
    `/comun/admin/entidades?resultado=${result.decision}&estado=${result.projectionState}`,
  );
}


function safeLegitimacyReviewError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("COMUN_RELATA_CANDIDATE_SELF_REVIEW_FORBIDDEN"))
    return "autorevisao-bloqueada";
  if (
    message.includes("COMUN_RELATA_CANDIDATE_REVIEWER_FORBIDDEN") ||
    message.includes("COMUN_RELATA_CANDIDATE_REVIEWER_REQUIRED")
  )
    return "revisor-invalido";
  if (message.includes("COMUN_RELATA_CANDIDATE_REVIEW_UNAVAILABLE"))
    return "candidato-indisponivel";
  if (message.includes("COMUN_RELATA_CANDIDATE_REVIEW_REQUEST_CONFLICT"))
    return "requisicao-conflitante";
  return "falha-segura";
}

export async function reviewCollectiveEntityCandidateFormAction(
  formData: FormData,
) {
  await requireComunAdminRole(["admin", "editor", "factual_reviewer"]);

  const requestId = String(formData.get("request_id") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const reviewStage = String(formData.get("review_stage") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const basisKind = String(formData.get("basis_kind") ?? "").trim();
  const basisReferencePrivate =
    String(formData.get("basis_reference_private") ?? "").trim() || null;

  const referenceRequired =
    decision === "supported" ||
    decision === "contested" ||
    decision === "unsupported";
  const basisShapeValid =
    (decision === "supported" && basisKind !== "insufficient_or_conflicting") ||
    (decision === "needs_evidence" &&
      basisKind === "insufficient_or_conflicting") ||
    (decision === "contested" &&
      basisKind === "insufficient_or_conflicting") ||
    decision === "unsupported";

  if (
    !UUID_PATTERN.test(requestId) ||
    !UUID_PATTERN.test(candidateId) ||
    !COMUN_COLLECTIVE_ENTITY_REVIEW_STAGES.includes(
      reviewStage as ComunCollectiveEntityReviewStage,
    ) ||
    !COMUN_COLLECTIVE_ENTITY_REVIEW_DECISIONS.includes(
      decision as ComunCollectiveEntityReviewDecision,
    ) ||
    !COMUN_COLLECTIVE_ENTITY_REVIEW_BASIS.includes(
      basisKind as ComunCollectiveEntityReviewBasis,
    ) ||
    !basisShapeValid ||
    (referenceRequired && !basisReferencePrivate) ||
    (basisReferencePrivate !== null &&
      (basisReferencePrivate.length < 3 ||
        basisReferencePrivate.length > 1000))
  ) {
    redirect("/comun/admin/entidades/revisao?erro=entrada-invalida");
  }

  let result;
  try {
    result = await reviewCollectiveEntityCandidate({
      requestId,
      candidateId,
      reviewStage: reviewStage as ComunCollectiveEntityReviewStage,
      decision: decision as ComunCollectiveEntityReviewDecision,
      basisKind: basisKind as ComunCollectiveEntityReviewBasis,
      basisReferencePrivate,
    });
  } catch (error) {
    redirect(
      `/comun/admin/entidades/revisao?erro=${safeLegitimacyReviewError(error)}`,
    );
  }

  if (!result)
    redirect("/comun/admin/entidades/revisao?erro=resultado-ausente");

  revalidatePath("/comun/admin/entidades/revisao");
  revalidatePath("/comun/admin/entidades");
  redirect(
    `/comun/admin/entidades/revisao?resultado=revisao-registrada&estado=${result.eligibilityState}`,
  );
}
