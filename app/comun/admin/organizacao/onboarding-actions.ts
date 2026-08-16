"use server";

import { revalidatePath } from "next/cache";
import { logComunAdminAction } from "@/lib/admin-audit";
import { requireComunAdmin } from "@/lib/admin-auth";
import {
  isComunSolidarityOrganizationOnboardingEnabled,
  normalizeOptionalSolidarityOnboardingText,
  normalizeSolidarityOnboardingText,
  parseSolidarityOnboardingOrganizationType,
} from "@/lib/comun-solidarity-organization-onboarding";
import {
  approveSolidarityOrganizationOnboarding,
  reviewSolidarityOrganizationOnboarding,
} from "@/lib/server/comun-solidarity-organization-onboarding";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function reviewOrganizationOnboardingAction(formData: FormData) {
  if (!isComunSolidarityOrganizationOnboardingEnabled())
    throw new Error("COMUN_SOLIDARITY_ONBOARDING_FEATURE_DISABLED");
  const session = await requireComunAdmin({ roles: ["admin"] });
  const requestId = value(formData, "request_id");
  const onboardingId = value(formData, "onboarding_id");
  const decision = value(formData, "decision");
  const message = normalizeSolidarityOnboardingText(
    formData.get("review_message"),
    3,
    600,
  );
  if (!UUID.test(requestId) || !UUID.test(onboardingId) || !message || !["needs_changes", "reject"].includes(decision))
    throw new Error("COMUN_SOLIDARITY_ONBOARDING_ADMIN_ACTION_INVALID");
  await reviewSolidarityOrganizationOnboarding({
    requestId,
    onboardingId,
    actorUserId: session.user.id,
    decision: decision as "needs_changes" | "reject",
    message,
  });
  await logComunAdminAction({
    session,
    action: `solidarity_organization_onboarding_${decision}`,
    targetType: "solidarity_organization_onboarding",
    targetId: onboardingId,
  });
  revalidatePath("/comun/admin/organizacao");
  revalidatePath("/comun/minha-participacao");
}

export async function approveOrganizationOnboardingAction(formData: FormData) {
  if (!isComunSolidarityOrganizationOnboardingEnabled())
    throw new Error("COMUN_SOLIDARITY_ONBOARDING_FEATURE_DISABLED");
  const session = await requireComunAdmin({ roles: ["admin"] });
  const requestId = value(formData, "request_id");
  const onboardingId = value(formData, "onboarding_id");
  const organizationType = parseSolidarityOnboardingOrganizationType(
    formData.get("organization_type"),
  );
  const sourceKind = value(formData, "source_kind");
  const sourceTitle = normalizeSolidarityOnboardingText(formData.get("source_title"), 3, 200);
  const sourceSummary = normalizeSolidarityOnboardingText(formData.get("source_summary"), 10, 600);
  const sourceUrl = normalizeOptionalSolidarityOnboardingText(formData.get("source_url"), 10, 1000);
  const sourceNotePrivate = normalizeOptionalSolidarityOnboardingText(formData.get("source_note_private"), 1, 600);
  if (
    !UUID.test(requestId) ||
    !UUID.test(onboardingId) ||
    !organizationType ||
    !["public_url", "platform_review", "operational_confirmation"].includes(sourceKind) ||
    !sourceTitle ||
    !sourceSummary ||
    (sourceKind === "public_url" && (!sourceUrl || !/^https:\/\//i.test(sourceUrl)))
  )
    throw new Error("COMUN_SOLIDARITY_ONBOARDING_APPROVAL_INVALID");
  await approveSolidarityOrganizationOnboarding({
    requestId,
    onboardingId,
    actorUserId: session.user.id,
    confirmedOrganizationType: organizationType,
    sourceKind: sourceKind as "public_url" | "platform_review" | "operational_confirmation",
    sourceTitle,
    sourceUrl,
    sourceSummary,
    sourceNotePrivate,
  });
  await logComunAdminAction({
    session,
    action: "solidarity_organization_onboarding_approved",
    targetType: "solidarity_organization_onboarding",
    targetId: onboardingId,
  });
  revalidatePath("/comun/admin/organizacao");
  revalidatePath("/comun/cooperativas");
  revalidatePath("/comun/minha-participacao");
}
