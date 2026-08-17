"use server";

import { revalidatePath } from "next/cache";
import { getCommunitySession } from "@/lib/community-auth";
import { communityLoginHref } from "@/lib/community-return";
import { assessLowFrictionPautaSafety } from "@/lib/comun-pauta-low-friction";
import {
  isComunSolidarityOrganizationProfileSelfEditEnabled,
  normalizeSolidarityOrganizationPresentation,
  normalizeSolidarityOrganizationPublicContact,
  normalizeSolidarityOrganizationServices,
  normalizeSolidarityOrganizationServiceTerritory,
  safeSolidarityOrganizationProfileError,
  solidarityOrganizationPublicContactNeedsConfirmation,
  type SolidarityOrganizationProfileActionState,
} from "@/lib/comun-solidarity-organization-profile";
import {
  getSolidarityOrganizationProfileEditorContext,
  updateSolidarityOrganizationProfileByAccess,
} from "@/lib/server/comun-solidarity-organization-profile";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateSolidarityOrganizationProfileAction(
  _previous: SolidarityOrganizationProfileActionState,
  formData: FormData,
): Promise<SolidarityOrganizationProfileActionState> {
  try {
    if (!isComunSolidarityOrganizationProfileSelfEditEnabled())
      throw new Error("COMUN_SOLIDARITY_PROFILE_ACCESS_FORBIDDEN");
    const organizationSlug = value(formData, "organization_slug");
    const organizationTerritoryId = value(
      formData,
      "organization_territory_id",
    );
    const requestId = value(formData, "request_id");
    const expectedUpdatedAt = value(formData, "expected_updated_at");
    const returnTo = `/comun/cooperativas/${organizationSlug}/editar-perfil`;
    if (
      !SLUG.test(organizationSlug) ||
      !UUID.test(organizationTerritoryId) ||
      !UUID.test(requestId) ||
      !Number.isFinite(Date.parse(expectedUpdatedAt))
    )
      return { state: "error", message: "Este formulário não é válido." };

    const session = await getCommunitySession();
    if (!session?.user)
      return {
        state: "auth_required",
        message:
          "Sua sessão terminou. Entre novamente; o texto continua neste aparelho.",
        loginHref: communityLoginHref(returnTo),
      };

    const context = await getSolidarityOrganizationProfileEditorContext(
      organizationSlug,
      session.user.id,
    );
    if (
      !context ||
      context.organization.territoryId !== organizationTerritoryId
    )
      throw new Error("COMUN_SOLIDARITY_PROFILE_ACCESS_FORBIDDEN");

    const presentation = normalizeSolidarityOrganizationPresentation(
      formData.get("presentation_public"),
    );
    const services = normalizeSolidarityOrganizationServices(
      formData.get("services_public"),
    );
    const serviceTerritory = normalizeSolidarityOrganizationServiceTerritory(
      formData.get("service_territory_public"),
    );
    const publicContact = normalizeSolidarityOrganizationPublicContact(
      formData.get("public_contact_authorized"),
    );
    if (presentation === undefined)
      return {
        state: "error",
        field: "presentation_public",
        message:
          "A apresentação deve ficar vazia ou ter entre 10 e 1.200 caracteres.",
      };
    if (services === undefined)
      return {
        state: "error",
        field: "services_public",
        message:
          "Use até 12 itens, um por linha, com 2 a 80 caracteres cada.",
      };
    if (serviceTerritory === undefined)
      return {
        state: "error",
        field: "service_territory_public",
        message: "O território de atuação deve ter no máximo 300 caracteres.",
      };
    if (publicContact === undefined)
      return {
        state: "error",
        field: "public_contact_authorized",
        message:
          "Revise o contato público. Não envie CPF, documento, senha, segredo ou endereço residencial.",
      };

    const safety = assessLowFrictionPautaSafety({
      question: [presentation, ...services, serviceTerritory]
        .filter((item): item is string => Boolean(item))
        .join("\n"),
      honeypot: value(formData, "company_website"),
    });
    if (!safety.allowed)
      return {
        state: "error",
        field: "presentation_public",
        message:
          "Revise os campos públicos. Use o campo de contato para telefone ou e-mail e não envie dados pessoais.",
      };

    const publicContactConfirmed =
      formData.get("public_contact_confirmed") === "confirmed";
    if (
      solidarityOrganizationPublicContactNeedsConfirmation(
        context.organization.publicContact,
        publicContact,
      ) &&
      !publicContactConfirmed
    )
      return {
        state: "error",
        field: "public_contact_authorized",
        message: "Confirme que o novo contato pode ser exibido publicamente.",
      };

    await updateSolidarityOrganizationProfileByAccess({
      requestId,
      organizationTerritoryId,
      actorUserId: session.user.id,
      expectedUpdatedAt,
      presentation,
      services,
      serviceTerritory,
      publicContact,
      publicContactConfirmed,
    });
    const href = `/comun/cooperativas/${organizationSlug}?perfil=atualizado`;
    revalidatePath(`/comun/cooperativas/${organizationSlug}`);
    revalidatePath("/comun/cooperativas");
    return {
      state: "success",
      message: "Perfil atualizado.",
      href,
    };
  } catch (error) {
    return {
      state: "error",
      message: safeSolidarityOrganizationProfileError(error),
    };
  }
}
