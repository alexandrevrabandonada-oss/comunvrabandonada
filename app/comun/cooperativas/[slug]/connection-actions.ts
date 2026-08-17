"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCommunitySession, requireCommunitySession } from "@/lib/community-auth";
import { communityLoginHref } from "@/lib/community-return";
import {
  COMUN_SOLIDARITY_CONTACT_CONSENT_VERSION,
  isComunSolidarityPrivateConnectionsEnabled,
  normalizeSolidarityConnectionMessage,
  normalizeSolidarityProtectedContact,
  safeSolidarityConnectionError,
  type SolidarityConnectionActionState,
} from "@/lib/comun-solidarity-private-connections";
import {
  createSolidarityConnection,
  reviewSolidarityConnection,
  withdrawSolidarityConnection,
} from "@/lib/server/comun-solidarity-private-connections";
import { getPublicSolidarityOrganizationDetail } from "@/lib/server/comun-solidarity-organization-governance";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createSolidarityConnectionAction(
  _previous: SolidarityConnectionActionState,
  formData: FormData,
): Promise<SolidarityConnectionActionState> {
  try {
    if (!isComunSolidarityPrivateConnectionsEnabled())
      return { state: "error", message: "Esta conexão não está disponível agora." };
    const subjectKind = value(formData, "subject_kind");
    const subjectId = value(formData, "subject_id");
    const subjectSlug = value(formData, "subject_slug");
    const organizationSlug = value(formData, "organization_slug");
    const organizationTerritoryId = value(formData, "organization_territory_id");
    const requestId = value(formData, "request_id");
    const returnTo = subjectKind === "offer"
      ? `/comun/cooperativas/${organizationSlug}/ofertas/${subjectSlug}/interesse`
      : `/comun/cooperativas/${organizationSlug}/necessidades/${subjectSlug}/ajudar`;
    if (!["offer", "need"].includes(subjectKind) || !UUID.test(subjectId) ||
      !UUID.test(organizationTerritoryId) || !UUID.test(requestId) ||
      !SLUG.test(subjectSlug) || !SLUG.test(organizationSlug))
      return { state: "error", message: "Este item não está disponível para conexão." };

    const detail = await getPublicSolidarityOrganizationDetail(organizationSlug);
    const subject = subjectKind === "offer"
      ? detail?.offers.find((item) => item.id === subjectId && item.slug === subjectSlug)
      : detail?.needs.find((item) => item.id === subjectId && item.slug === subjectSlug && item.organization);
    if (!detail || detail.organization.territoryId !== organizationTerritoryId || !subject)
      return { state: "error", message: "Este item não está disponível para conexão." };

    const message = normalizeSolidarityConnectionMessage(formData.get("connection_message"));
    if (!message)
      return { state: "error", field: "message", message: "Escreva entre 10 e 600 caracteres. Coloque seu contato no campo protegido abaixo." };
    const contact = normalizeSolidarityProtectedContact(formData.get("protected_contact"));
    if (!contact)
      return { state: "error", field: "contact", message: "Informe um contato válido. Não envie CPF, documento, senha ou endereço residencial." };
    if (formData.get("consent_to_contact") !== "yes")
      return { state: "error", field: "consent", message: "Confirme a autorização específica para esta conexão." };

    const session = await getCommunitySession();
    if (!session?.user)
      return {
        state: "auth_required",
        message: "Entre na sua conta para enviar. Seu texto continua apenas neste aparelho.",
        loginHref: communityLoginHref(returnTo),
      };
    await createSolidarityConnection({
      requestId,
      subjectKind: subjectKind as "offer" | "need",
      subjectId,
      memberUserId: session.user.id,
      messagePrivate: message,
      contactPrivate: contact,
      consentVersion: COMUN_SOLIDARITY_CONTACT_CONSENT_VERSION,
    });
    revalidatePath("/comun/minha-participacao");
    return {
      state: "success",
      href: "/comun/minha-participacao?secao=acompanhando",
    };
  } catch (error) {
    return { state: "error", message: safeSolidarityConnectionError(error) };
  }
}

export async function reviewSolidarityConnectionAction(formData: FormData) {
  if (!isComunSolidarityPrivateConnectionsEnabled()) redirect("/comun/cooperativas");
  const organizationSlug = value(formData, "organization_slug");
  const organizationTerritoryId = value(formData, "organization_territory_id");
  const interestId = value(formData, "interest_id");
  const subjectKind = value(formData, "subject_kind");
  const decision = value(formData, "decision");
  if (!SLUG.test(organizationSlug) || !UUID.test(organizationTerritoryId) ||
    !UUID.test(interestId) || !["offer", "need"].includes(subjectKind) ||
    !["accept", "reject"].includes(decision)) redirect("/comun/cooperativas");
  const { user } = await requireCommunitySession(`/comun/cooperativas/${organizationSlug}`);
  try {
    await reviewSolidarityConnection({
      subjectKind: subjectKind as "offer" | "need",
      interestId,
      organizationTerritoryId,
      actorUserId: user.id,
      decision: decision as "accept" | "reject",
    });
  } catch {
    redirect(`/comun/cooperativas/${organizationSlug}?conexao=erro`);
  }
  revalidatePath(`/comun/cooperativas/${organizationSlug}`);
  revalidatePath("/comun/minha-participacao");
  redirect(`/comun/cooperativas/${organizationSlug}?conexao=${decision === "accept" ? "aceita" : "recusada"}`);
}

export async function withdrawSolidarityConnectionAction(formData: FormData) {
  if (!isComunSolidarityPrivateConnectionsEnabled()) redirect("/comun/minha-participacao");
  const interestId = value(formData, "interest_id");
  const subjectKind = value(formData, "subject_kind");
  if (!UUID.test(interestId) || !["offer", "need"].includes(subjectKind))
    redirect("/comun/minha-participacao");
  const { user } = await requireCommunitySession("/comun/minha-participacao?secao=acompanhando");
  try {
    await withdrawSolidarityConnection({
      subjectKind: subjectKind as "offer" | "need",
      interestId,
      memberUserId: user.id,
    });
  } catch {
    redirect("/comun/minha-participacao?secao=acompanhando&conexao=erro");
  }
  revalidatePath("/comun/minha-participacao");
  redirect("/comun/minha-participacao?secao=acompanhando&conexao=retirada");
}
