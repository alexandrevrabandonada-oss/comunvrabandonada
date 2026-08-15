"use server";

import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { isComunSolidarityOrganizationGovernanceEnabled } from "@/lib/comun-solidarity-organization-governance";
import {
  governSolidarityOrganizationAccess,
  reviewSolidarityOrganizationAccess,
} from "@/lib/server/comun-solidarity-organization-governance";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function reviewFirstOrganizationAccessAction(formData: FormData) {
  if (!isComunSolidarityOrganizationGovernanceEnabled())
    throw new Error("COMUN_SOLIDARITY_ACCESS_FEATURE_DISABLED");
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const accessId = value(formData, "access_id");
  const organizationTerritoryId = value(formData, "organization_territory_id");
  const decision = value(formData, "decision");
  if (!UUID.test(accessId) || !UUID.test(organizationTerritoryId) || !["approve", "reject"].includes(decision))
    throw new Error("COMUN_SOLIDARITY_ACCESS_ACTION_INVALID");
  await reviewSolidarityOrganizationAccess({
    accessId,
    organizationTerritoryId,
    actorUserId: session.user.id,
    decision: decision as "approve" | "reject",
    note: value(formData, "review_note") || null,
  });
  await logComunAdminAction({
    session,
    action: `solidarity_organization_access_${decision}`,
    targetType: "solidarity_organization_access",
    targetId: accessId,
  });
  revalidatePath("/comun/admin/organizacao");
  revalidatePath("/comun/minha-participacao");
}

export async function revokeOrganizationAccessAsAdminAction(formData: FormData) {
  if (!isComunSolidarityOrganizationGovernanceEnabled())
    throw new Error("COMUN_SOLIDARITY_ACCESS_FEATURE_DISABLED");
  const session = await requireComunAdmin({ roles: ["admin"] });
  const accessId = value(formData, "access_id");
  const organizationTerritoryId = value(formData, "organization_territory_id");
  if (!UUID.test(accessId) || !UUID.test(organizationTerritoryId))
    throw new Error("COMUN_SOLIDARITY_ACCESS_ACTION_INVALID");
  await governSolidarityOrganizationAccess({
    accessId,
    organizationTerritoryId,
    actorUserId: session.user.id,
    action: "revoke",
    note: value(formData, "review_note") || null,
  });
  await logComunAdminAction({
    session,
    action: "solidarity_organization_access_revoked",
    targetType: "solidarity_organization_access",
    targetId: accessId,
  });
  revalidatePath("/comun/admin/organizacao");
  revalidatePath("/comun/minha-participacao");
}
