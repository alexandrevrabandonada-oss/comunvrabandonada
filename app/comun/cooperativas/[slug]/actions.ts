"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCommunitySession } from "@/lib/community-auth";
import {
  isComunSolidarityOrganizationGovernanceEnabled,
  safeSolidarityOrganizationAccessError,
  validateSolidarityOrganizationAccessNote,
} from "@/lib/comun-solidarity-organization-governance";
import {
  getPublicSolidarityOrganizationDetail,
  governSolidarityOrganizationAccess,
  leaveSolidarityOrganizationAccess,
  requestSolidarityOrganizationAccess,
  reviewSolidarityOrganizationAccess,
  withdrawSolidarityOrganizationAccess,
} from "@/lib/server/comun-solidarity-organization-governance";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function organizationContext(formData: FormData) {
  const slug = value(formData, "organization_slug");
  const organizationTerritoryId = value(formData, "organization_territory_id");
  if (!SLUG.test(slug) || !UUID.test(organizationTerritoryId))
    throw new Error("COMUN_SOLIDARITY_ACCESS_ORGANIZATION_INVALID");
  const detail = await getPublicSolidarityOrganizationDetail(slug);
  if (!detail || detail.organization.territoryId !== organizationTerritoryId)
    throw new Error("COMUN_SOLIDARITY_ACCESS_ORGANIZATION_INELIGIBLE");
  return { slug, organizationTerritoryId };
}

function organizationHref(slug: string, status?: string) {
  const base = `/comun/cooperativas/${slug}`;
  return status ? `${base}?acesso=${encodeURIComponent(status)}` : base;
}

export async function requestOrganizationAccessAction(formData: FormData) {
  if (!isComunSolidarityOrganizationGovernanceEnabled())
    redirect("/comun/cooperativas");
  const context = await organizationContext(formData);
  const session = await requireCommunitySession(organizationHref(context.slug));
  const note = validateSolidarityOrganizationAccessNote(
    formData.get("participation_note"),
  );
  if (!note) redirect(organizationHref(context.slug, "nota-invalida"));
  let status = "erro";
  try {
    const result = await requestSolidarityOrganizationAccess({
      organizationTerritoryId: context.organizationTerritoryId,
      memberUserId: session.user.id,
      requestNote: note,
    });
    status = result.reviewScope === "platform" ? "recebido-comun" : "recebido-organizacao";
    revalidatePath(organizationHref(context.slug));
    revalidatePath("/comun/minha-participacao");
  } catch (error) {
    const safe = safeSolidarityOrganizationAccessError(error);
    status = safe.includes("limite") ? "limite" : safe.includes("Aguarde") ? "aguarde" : "erro";
  }
  redirect(organizationHref(context.slug, status));
}

export async function withdrawOrganizationAccessAction(formData: FormData) {
  if (!isComunSolidarityOrganizationGovernanceEnabled())
    redirect("/comun/cooperativas");
  const context = await organizationContext(formData);
  const session = await requireCommunitySession(organizationHref(context.slug));
  await withdrawSolidarityOrganizationAccess(
    context.organizationTerritoryId,
    session.user.id,
  );
  revalidatePath(organizationHref(context.slug));
  revalidatePath("/comun/minha-participacao");
  redirect(organizationHref(context.slug, "retirado"));
}

export async function leaveOrganizationAccessAction(formData: FormData) {
  if (!isComunSolidarityOrganizationGovernanceEnabled())
    redirect("/comun/cooperativas");
  const context = await organizationContext(formData);
  const session = await requireCommunitySession(organizationHref(context.slug));
  await leaveSolidarityOrganizationAccess(
    context.organizationTerritoryId,
    session.user.id,
  );
  revalidatePath(organizationHref(context.slug));
  revalidatePath("/comun/minha-participacao");
  redirect(organizationHref(context.slug, "saiu"));
}

export async function governOrganizationAccessAction(formData: FormData) {
  if (!isComunSolidarityOrganizationGovernanceEnabled())
    redirect("/comun/cooperativas");
  const context = await organizationContext(formData);
  const session = await requireCommunitySession(organizationHref(context.slug));
  const accessId = value(formData, "access_id");
  const operation = value(formData, "operation");
  if (!UUID.test(accessId) || !["approve", "reject", "promote", "revoke"].includes(operation))
    throw new Error("COMUN_SOLIDARITY_ACCESS_ACTION_INVALID");
  if (operation === "approve" || operation === "reject") {
    await reviewSolidarityOrganizationAccess({
      accessId,
      organizationTerritoryId: context.organizationTerritoryId,
      actorUserId: session.user.id,
      decision: operation,
    });
  } else {
    await governSolidarityOrganizationAccess({
      accessId,
      organizationTerritoryId: context.organizationTerritoryId,
      actorUserId: session.user.id,
      action: operation as "promote" | "revoke",
    });
  }
  revalidatePath(organizationHref(context.slug));
  revalidatePath("/comun/minha-participacao");
  redirect(organizationHref(context.slug, "governanca-atualizada"));
}
