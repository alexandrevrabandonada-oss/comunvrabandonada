"use server";

import { revalidatePath } from "next/cache";
import { getCommunitySession } from "@/lib/community-auth";
import { communityLoginHref } from "@/lib/community-return";
import { assessLowFrictionPautaSafety } from "@/lib/comun-pauta-low-friction";
import {
  deriveSolidarityEconomicSlug,
  isComunSolidarityEconomicContentWritesEnabled,
  normalizeEconomicSummary,
  normalizeEconomicTitle,
  normalizeOptionalEconomicText,
  parseBRLAmountToCents,
  parseFutureDueAt,
  parseNeedType,
  parseOfferKind,
  parseOfferModalities,
  parseValidityDays,
  safeSolidarityEconomicContentError,
  type SolidarityEconomicActionState,
  type SolidarityNeedOperation,
  type SolidarityOfferOperation,
} from "@/lib/comun-solidarity-economic-content";
import {
  createSolidarityNeedByAccess,
  createSolidarityOfferByAccess,
  getSolidarityEconomicEditorContext,
  mutateSolidarityNeedByAccess,
  mutateSolidarityOfferByAccess,
} from "@/lib/server/comun-solidarity-economic-content";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function authorizedContext(formData: FormData) {
  if (!isComunSolidarityEconomicContentWritesEnabled())
    throw new Error("COMUN_SOLIDARITY_ECONOMIC_ACCESS_FORBIDDEN");
  const organizationSlug = value(formData, "organization_slug");
  const organizationTerritoryId = value(formData, "organization_territory_id");
  const returnTo = value(formData, "return_to");
  if (!SLUG.test(organizationSlug) || !UUID.test(organizationTerritoryId))
    throw new Error("COMUN_SOLIDARITY_ECONOMIC_ORGANIZATION_INVALID");
  const session = await getCommunitySession();
  if (!session?.user)
    return { authRequired: true as const, loginHref: communityLoginHref(returnTo) };
  const context = await getSolidarityEconomicEditorContext(
    organizationSlug,
    session.user.id,
  );
  if (!context || context.detail.organization.territoryId !== organizationTerritoryId)
    throw new Error("COMUN_SOLIDARITY_ECONOMIC_ACCESS_FORBIDDEN");
  return {
    authRequired: false as const,
    organizationSlug,
    organizationTerritoryId,
    actorUserId: session.user.id,
  };
}

function validateSafety(formData: FormData, values: Array<string | null>) {
  const result = assessLowFrictionPautaSafety({
    question: values.filter(Boolean).join("\n"),
    honeypot: value(formData, "company_website"),
  });
  if (!result.allowed) throw new Error("COMUN_SOLIDARITY_ECONOMIC_CONTENT_BLOCKED");
}

function authState(loginHref: string): SolidarityEconomicActionState {
  return {
    state: "auth_required",
    message: "Sua sessão terminou. Entre novamente; o texto continua neste aparelho.",
    loginHref,
  };
}

export async function createSolidarityOfferAction(
  _previous: SolidarityEconomicActionState,
  formData: FormData,
): Promise<SolidarityEconomicActionState> {
  try {
    const context = await authorizedContext(formData);
    if (context.authRequired) return authState(context.loginHref);
    const requestId = value(formData, "request_id");
    const title = normalizeEconomicTitle(formData.get("title"), 140);
    const summary = normalizeEconomicSummary(formData.get("public_summary"));
    const modalities = parseOfferModalities(formData);
    const priceAmountCents = parseBRLAmountToCents(formData.get("price"));
    const priceNote = normalizeOptionalEconomicText(formData.get("price_note"), 300);
    const availability = normalizeOptionalEconomicText(formData.get("availability"), 500);
    const validityDays = parseValidityDays(formData.get("validity_days"));
    if (!UUID.test(requestId) || !title || !summary || !modalities.length || validityDays == null || Number.isNaN(priceAmountCents))
      return { state: "error", message: "Revise os campos obrigatórios e tente novamente." };
    validateSafety(formData, [title, summary, priceNote, availability]);
    const result = await createSolidarityOfferByAccess({
      requestId,
      organizationTerritoryId: context.organizationTerritoryId,
      actorUserId: context.actorUserId,
      slugBase: deriveSolidarityEconomicSlug(title, "oferta-solidaria"),
      title,
      summary,
      modalities,
      kind: parseOfferKind(formData.get("offer_kind")),
      priceAmountCents,
      priceNote,
      availability,
      validityDays,
    });
    const href = `/comun/cooperativas/${context.organizationSlug}?conteudo=oferta-publicada`;
    revalidatePath(`/comun/cooperativas/${context.organizationSlug}`);
    revalidatePath("/comun/cooperativas");
    return { state: "success", href };
  } catch (error) {
    return { state: "error", message: safeSolidarityEconomicContentError(error) };
  }
}

export async function mutateSolidarityOfferAction(
  _previous: SolidarityEconomicActionState,
  formData: FormData,
): Promise<SolidarityEconomicActionState> {
  try {
    const context = await authorizedContext(formData);
    if (context.authRequired) return authState(context.loginHref);
    const requestId = value(formData, "request_id");
    const offerId = value(formData, "offer_id");
    const operation = value(formData, "operation") as SolidarityOfferOperation;
    if (!UUID.test(requestId) || !UUID.test(offerId) || !["edit", "pause", "resume", "renew", "archive"].includes(operation))
      return { state: "error", message: "Esta alteração não é válida." };
    let fields = {};
    if (operation === "edit") {
      const title = normalizeEconomicTitle(formData.get("title"), 140);
      const summary = normalizeEconomicSummary(formData.get("public_summary"));
      const modalities = parseOfferModalities(formData);
      const priceAmountCents = parseBRLAmountToCents(formData.get("price"));
      const priceNote = normalizeOptionalEconomicText(formData.get("price_note"), 300);
      const availability = normalizeOptionalEconomicText(formData.get("availability"), 500);
      if (!title || !summary || !modalities.length || Number.isNaN(priceAmountCents))
        return { state: "error", message: "Revise os campos obrigatórios e tente novamente." };
      validateSafety(formData, [title, summary, priceNote, availability]);
      fields = { title, summary, modalities, kind: parseOfferKind(formData.get("offer_kind")), priceAmountCents, priceNote, availability };
    }
    if (operation === "renew") {
      const validityDays = parseValidityDays(formData.get("validity_days"));
      if (validityDays == null) return { state: "error", message: "Escolha uma validade entre 1 e 180 dias." };
      fields = { validityDays };
    }
    await mutateSolidarityOfferByAccess({ requestId, organizationTerritoryId: context.organizationTerritoryId, actorUserId: context.actorUserId, offerId, operation, ...fields });
    const href = `/comun/cooperativas/${context.organizationSlug}?conteudo=oferta-atualizada`;
    revalidatePath(`/comun/cooperativas/${context.organizationSlug}`);
    revalidatePath("/comun/cooperativas");
    return { state: "success", href };
  } catch (error) {
    return { state: "error", message: safeSolidarityEconomicContentError(error) };
  }
}

export async function createSolidarityNeedAction(
  _previous: SolidarityEconomicActionState,
  formData: FormData,
): Promise<SolidarityEconomicActionState> {
  try {
    const context = await authorizedContext(formData);
    if (context.authRequired) return authState(context.loginHref);
    const requestId = value(formData, "request_id");
    const title = normalizeEconomicTitle(formData.get("title"), 160);
    const summary = normalizeEconomicSummary(formData.get("public_summary"));
    const dueAt = parseFutureDueAt(formData.get("due_at"));
    if (!UUID.test(requestId) || !title || !summary || dueAt === undefined)
      return { state: "error", message: "Revise os campos obrigatórios e tente novamente." };
    validateSafety(formData, [title, summary]);
    await createSolidarityNeedByAccess({
      requestId,
      organizationTerritoryId: context.organizationTerritoryId,
      actorUserId: context.actorUserId,
      slugBase: deriveSolidarityEconomicSlug(title, "necessidade-solidaria"),
      title,
      summary,
      needType: parseNeedType(formData.get("need_type")),
      dueAt,
    });
    const href = `/comun/cooperativas/${context.organizationSlug}?conteudo=necessidade-publicada`;
    revalidatePath(`/comun/cooperativas/${context.organizationSlug}`);
    revalidatePath("/comun/cooperativas");
    return { state: "success", href };
  } catch (error) {
    return { state: "error", message: safeSolidarityEconomicContentError(error) };
  }
}

export async function mutateSolidarityNeedAction(
  _previous: SolidarityEconomicActionState,
  formData: FormData,
): Promise<SolidarityEconomicActionState> {
  try {
    const context = await authorizedContext(formData);
    if (context.authRequired) return authState(context.loginHref);
    const requestId = value(formData, "request_id");
    const needId = value(formData, "need_id");
    const operation = value(formData, "operation") as SolidarityNeedOperation;
    if (!UUID.test(requestId) || !UUID.test(needId) || !["edit", "partially_met", "met", "cancel", "reopen"].includes(operation))
      return { state: "error", message: "Esta alteração não é válida." };
    let fields = {};
    if (operation === "edit") {
      const title = normalizeEconomicTitle(formData.get("title"), 160);
      const summary = normalizeEconomicSummary(formData.get("public_summary"));
      const dueAt = parseFutureDueAt(formData.get("due_at"));
      if (!title || !summary || dueAt === undefined)
        return { state: "error", message: "Revise os campos obrigatórios e tente novamente." };
      validateSafety(formData, [title, summary]);
      fields = { title, summary, needType: parseNeedType(formData.get("need_type")), dueAt };
    }
    await mutateSolidarityNeedByAccess({ requestId, organizationTerritoryId: context.organizationTerritoryId, actorUserId: context.actorUserId, needId, operation, ...fields });
    const href = `/comun/cooperativas/${context.organizationSlug}?conteudo=necessidade-atualizada`;
    revalidatePath(`/comun/cooperativas/${context.organizationSlug}`);
    revalidatePath("/comun/cooperativas");
    return { state: "success", href };
  } catch (error) {
    return { state: "error", message: safeSolidarityEconomicContentError(error) };
  }
}
