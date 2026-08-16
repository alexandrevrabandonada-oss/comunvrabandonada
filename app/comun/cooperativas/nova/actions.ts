"use server";

import { revalidatePath } from "next/cache";
import { assessLowFrictionPautaSafety } from "@/lib/comun-pauta-low-friction";
import { getCommunitySession } from "@/lib/community-auth";
import { communityLoginHref } from "@/lib/community-return";
import {
  isComunSolidarityOrganizationOnboardingEnabled,
  normalizeOptionalSolidarityOnboardingText,
  normalizeSolidarityOnboardingName,
  normalizeSolidarityOnboardingText,
  parseSolidarityOnboardingOrganizationType,
  safeSolidarityOnboardingError,
  type SolidarityOnboardingActionState,
} from "@/lib/comun-solidarity-organization-onboarding";
import {
  createSolidarityOrganizationOnboardingDraft,
  submitSolidarityOrganizationOnboarding,
  updateSolidarityOrganizationOnboarding,
  withdrawSolidarityOrganizationOnboarding,
} from "@/lib/server/comun-solidarity-organization-onboarding";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function authRequired(returnTo: string): SolidarityOnboardingActionState {
  return {
    state: "auth_required",
    message: "Entre para guardar este rascunho. O nome continua neste aparelho.",
    loginHref: communityLoginHref(returnTo),
  };
}

function validatePublicText(formData: FormData, values: string[]) {
  const safety = assessLowFrictionPautaSafety({
    question: values.join("\n"),
    honeypot: value(formData, "company_website"),
  });
  if (!safety.allowed)
    throw new Error("COMUN_SOLIDARITY_ONBOARDING_CONTENT_BLOCKED");
}

export async function createSolidarityOrganizationOnboardingDraftAction(
  _previous: SolidarityOnboardingActionState,
  formData: FormData,
): Promise<SolidarityOnboardingActionState> {
  const returnTo = "/comun/cooperativas/nova";
  try {
    if (!isComunSolidarityOrganizationOnboardingEnabled())
      throw new Error("COMUN_SOLIDARITY_ONBOARDING_FEATURE_DISABLED");
    const requestId = value(formData, "request_id");
    const organizationName = normalizeSolidarityOnboardingName(
      formData.get("organization_name"),
    );
    if (!UUID.test(requestId) || !organizationName)
      return { state: "error", message: "Informe o nome da organização." };
    validatePublicText(formData, [organizationName]);
    const session = await getCommunitySession();
    if (!session?.user) return authRequired(returnTo);
    const result = await createSolidarityOrganizationOnboardingDraft({
      requestId,
      applicantUserId: session.user.id,
      organizationName,
    });
    if (result.kind === "existing")
      return {
        state: "existing_organization",
        message: `${result.name} já está no COMUN.`,
        href: `/comun/cooperativas/${result.slug}`,
      };
    return {
      state: "success",
      message: "Rascunho salvo.",
      href: `/comun/cooperativas/nova/${result.continuationToken}`,
    };
  } catch (error) {
    return { state: "error", message: safeSolidarityOnboardingError(error) };
  }
}

export async function saveSolidarityOrganizationOnboardingDetailsAction(
  _previous: SolidarityOnboardingActionState,
  formData: FormData,
): Promise<SolidarityOnboardingActionState> {
  const continuationToken = value(formData, "continuation_token");
  const returnTo = UUID.test(continuationToken)
    ? `/comun/cooperativas/nova/${continuationToken}`
    : "/comun/cooperativas/nova";
  try {
    if (!isComunSolidarityOrganizationOnboardingEnabled())
      throw new Error("COMUN_SOLIDARITY_ONBOARDING_FEATURE_DISABLED");
    const session = await getCommunitySession();
    if (!session?.user) return authRequired(returnTo);
    const requestId = value(formData, "request_id");
    const organizationName = normalizeSolidarityOnboardingName(
      formData.get("organization_name"),
    );
    const organizationType = parseSolidarityOnboardingOrganizationType(
      formData.get("organization_type"),
    );
    const presentation = normalizeSolidarityOnboardingText(
      formData.get("presentation"),
      10,
      1200,
    );
    const serviceTerritory = normalizeOptionalSolidarityOnboardingText(
      formData.get("service_territory"),
      2,
      300,
    );
    const publicContact = normalizeOptionalSolidarityOnboardingText(
      formData.get("public_contact"),
      3,
      300,
    );
    const sourceUrl = normalizeOptionalSolidarityOnboardingText(
      formData.get("public_source_url"),
      10,
      1000,
    );
    const participationNote = normalizeSolidarityOnboardingText(
      formData.get("participation_note"),
      10,
      600,
    );
    const contactAuthorized = formData.get("contact_authorized") === "yes";
    const intent = value(formData, "intent");
    if (
      !UUID.test(requestId) ||
      !UUID.test(continuationToken) ||
      !organizationName ||
      !organizationType ||
      !presentation ||
      !participationNote ||
      (value(formData, "service_territory") && !serviceTerritory) ||
      (value(formData, "public_contact") && !publicContact) ||
      (contactAuthorized && !publicContact) ||
      (sourceUrl != null && !/^https:\/\//i.test(sourceUrl)) ||
      !["save", "submit"].includes(intent)
    )
      return { state: "error", message: "Revise os campos obrigatórios." };
    validatePublicText(formData, [
      organizationName,
      presentation,
      serviceTerritory ?? "",
    ]);
    await updateSolidarityOrganizationOnboarding({
      requestId,
      continuationToken,
      applicantUserId: session.user.id,
      organizationName,
      organizationType,
      presentation,
      serviceTerritory,
      publicContactCandidate: publicContact,
      publicContactPublicationAuthorized: contactAuthorized,
      publicSourceUrlCandidate: sourceUrl,
      participationNotePrivate: participationNote,
    });
    if (intent === "submit") {
      await submitSolidarityOrganizationOnboarding({
        requestId: crypto.randomUUID(),
        continuationToken,
        applicantUserId: session.user.id,
      });
    }
    revalidatePath(returnTo);
    revalidatePath("/comun/minha-participacao");
    return {
      state: "success",
      message:
        intent === "submit"
          ? "Pedido enviado para verificação."
          : "Rascunho atualizado.",
      href: `${returnTo}?estado=${intent === "submit" ? "enviado" : "salvo"}`,
    };
  } catch (error) {
    return { state: "error", message: safeSolidarityOnboardingError(error) };
  }
}

export async function withdrawSolidarityOrganizationOnboardingAction(
  _previous: SolidarityOnboardingActionState,
  formData: FormData,
): Promise<SolidarityOnboardingActionState> {
  try {
    if (!isComunSolidarityOrganizationOnboardingEnabled())
      throw new Error("COMUN_SOLIDARITY_ONBOARDING_FEATURE_DISABLED");
    const session = await getCommunitySession();
    const continuationToken = value(formData, "continuation_token");
    const requestId = value(formData, "request_id");
    if (!session?.user)
      return authRequired(`/comun/cooperativas/nova/${continuationToken}`);
    if (!UUID.test(continuationToken) || !UUID.test(requestId))
      throw new Error("COMUN_SOLIDARITY_ONBOARDING_NOT_FOUND");
    await withdrawSolidarityOrganizationOnboarding({
      requestId,
      continuationToken,
      applicantUserId: session.user.id,
    });
    revalidatePath("/comun/minha-participacao");
    return {
      state: "success",
      message: "Pedido retirado.",
      href: "/comun/minha-participacao?secao=acompanhando",
    };
  } catch (error) {
    return { state: "error", message: safeSolidarityOnboardingError(error) };
  }
}
