"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCommunitySession } from "@/lib/community-auth";
import {
  COMUN_COLLECTIVE_ENTITY_TYPES,
} from "@/lib/comun-collective-entity-consent";

import {
  createOwnCollectiveEntity,
  prepareOwnCollectiveEntityCandidate,
  revokeOwnCollectiveRepresentation,
  setOwnCollectiveEntityConsent,
} from "@/lib/comun-collective-entity-runtime";
import type { ComunCollectiveEntityType } from "@/lib/comun-collective-entity-consent";
import { listOwnCollectiveEntityLegitimacyStates } from "@/lib/comun-collective-entity-legitimacy-runtime";

/**
 * These actions intentionally accept no user id. The database entry points
 * obtain the actor only from the server-validated session before the
 * service-only database bridge receives it as an audit attribute.
 */
export async function createCollectiveEntityAction(input: {
  requestId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
}) {
  return createOwnCollectiveEntity(input);
}

export async function setCollectiveEntityConsentAction(
  entityId: string,
  active: boolean,
) {
  return setOwnCollectiveEntityConsent(entityId, active);
}

export async function revokeCollectiveRepresentationAction(entityId: string) {
  return revokeOwnCollectiveRepresentation(entityId);
}

export async function prepareOwnCollectiveEntityCandidateAction(input: {
  entityId: string;
  requestId: string;
}) {
  return prepareOwnCollectiveEntityCandidate(input);
}


export async function listOwnCollectiveEntityLegitimacyAction() {
  return listOwnCollectiveEntityLegitimacyStates();
}


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeOwnerEntityError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("COMUN_RELATA_CANDIDATE_CONSENT_REQUIRED") ||
    message.includes("COMUN_RELATA_ENTITY_REPRESENTATION_REQUIRED")
  )
    return "consentimento-necessario";
  if (message.includes("COMUN_RELATA_CANDIDATE_REPRESENTATION_REQUIRED"))
    return "representacao-necessaria";
  if (message.includes("COMUN_RELATA_CANDIDATE_ALREADY_PENDING"))
    return "candidato-ja-pendente";
  if (
    message.includes("COMUN_RELATA_CANDIDATE_ENTITY_UNAVAILABLE") ||
    message.includes("COMUN_RELATA_ENTITY_NOT_FOUND")
  )
    return "entidade-indisponivel";
  if (
    message.includes("REQUEST_CONFLICT") ||
    message.includes("REQUEST_FORBIDDEN")
  )
    return "requisicao-conflitante";
  if (message.includes("REVOKE_FORBIDDEN"))
    return "revogacao-bloqueada";
  return "falha-segura";
}

function requireUuid(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!UUID_PATTERN.test(normalized))
    redirect("/comun/entidades?erro=entrada-invalida");
  return normalized;
}

export async function createCollectiveEntityFormAction(formData: FormData) {
  await requireCommunitySession("/comun/entidades");

  const requestId = requireUuid(formData.get("request_id"));
  const publicName = String(formData.get("public_name") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const entityType = String(formData.get("entity_type") ?? "").trim();

  if (
    publicName.length < 3 ||
    publicName.length > 160 ||
    !COMUN_COLLECTIVE_ENTITY_TYPES.includes(
      entityType as ComunCollectiveEntityType,
    )
  ) {
    redirect("/comun/entidades?erro=entrada-invalida");
  }

  try {
    await createOwnCollectiveEntity({
      requestId,
      publicName,
      entityType: entityType as ComunCollectiveEntityType,
    });
  } catch (error) {
    redirect(`/comun/entidades?erro=${safeOwnerEntityError(error)}`);
  }

  revalidatePath("/comun/entidades");
  redirect("/comun/entidades?resultado=entidade-criada");
}

export async function setCollectiveEntityConsentFormAction(formData: FormData) {
  await requireCommunitySession("/comun/entidades");

  const entityId = requireUuid(formData.get("entity_id"));
  const active = String(formData.get("active") ?? "") === "true";
  const confirmation = active
    ? formData.get("confirm_consent") === "on"
    : formData.get("confirm_revocation") === "on";

  if (!confirmation)
    redirect(
      `/comun/entidades?erro=${active ? "confirmacao-consentimento" : "confirmacao-revogacao"}`,
    );

  try {
    await setOwnCollectiveEntityConsent(entityId, active);
  } catch (error) {
    redirect(`/comun/entidades?erro=${safeOwnerEntityError(error)}`);
  }

  revalidatePath("/comun/entidades");
  redirect(
    `/comun/entidades?resultado=${active ? "consentimento-ativo" : "consentimento-revogado"}`,
  );
}

export async function prepareCollectiveEntityCandidateFormAction(
  formData: FormData,
) {
  await requireCommunitySession("/comun/entidades");

  const entityId = requireUuid(formData.get("entity_id"));
  const requestId = requireUuid(formData.get("request_id"));

  try {
    await prepareOwnCollectiveEntityCandidate({ entityId, requestId });
  } catch (error) {
    redirect(`/comun/entidades?erro=${safeOwnerEntityError(error)}`);
  }

  revalidatePath("/comun/entidades");
  revalidatePath("/comun/admin/entidades/revisao");
  redirect("/comun/entidades?resultado=candidato-enviado");
}

export async function revokeCollectiveRepresentationFormAction(
  formData: FormData,
) {
  await requireCommunitySession("/comun/entidades");

  const entityId = requireUuid(formData.get("entity_id"));
  if (formData.get("confirm_representation_revocation") !== "on")
    redirect("/comun/entidades?erro=confirmacao-representacao");

  try {
    await revokeOwnCollectiveRepresentation(entityId);
  } catch (error) {
    redirect(`/comun/entidades?erro=${safeOwnerEntityError(error)}`);
  }

  revalidatePath("/comun/entidades");
  revalidatePath("/comun/admin/entidades/revisao");
  redirect("/comun/entidades?resultado=representacao-revogada");
}
