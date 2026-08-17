import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getMySolidarityOrganizationAccess } from "./comun-solidarity-organization-governance";
import { getPublicSolidarityOrganizationDetail } from "./comun-solidarity-organization-governance";

type RpcRow = Record<string, unknown>;

export async function getSolidarityOrganizationProfileEditorContext(
  organizationSlug: string,
  actorUserId: string,
) {
  const detail = await getPublicSolidarityOrganizationDetail(organizationSlug);
  if (!detail) return null;
  const access = await getMySolidarityOrganizationAccess(
    actorUserId,
    detail.organization.territoryId,
  );
  if (
    access?.state !== "active" ||
    !access.role ||
    !["editor", "facilitator"].includes(access.role)
  )
    return null;
  const database = createServiceSupabaseClient();
  if (!database) return null;
  const result = await database
    .from("comun_territorial_organizations")
    .select("territory_id,updated_at")
    .eq("territory_id", detail.organization.territoryId)
    .maybeSingle();
  const updatedAt =
    typeof result.data?.updated_at === "string" &&
    Number.isFinite(Date.parse(result.data.updated_at))
      ? result.data.updated_at
      : null;
  if (result.error || !updatedAt) return null;
  return { organization: detail.organization, updatedAt };
}

export async function updateSolidarityOrganizationProfileByAccess(input: {
  requestId: string;
  organizationTerritoryId: string;
  actorUserId: string;
  expectedUpdatedAt: string;
  presentation: string | null;
  services: string[];
  serviceTerritory: string | null;
  publicContact: string | null;
  publicContactConfirmed: boolean;
}) {
  const database = createServiceSupabaseClient();
  if (!database) throw new Error("COMUN_SOLIDARITY_PROFILE_DATABASE_UNAVAILABLE");
  const result = await database.rpc(
    "comun_update_solidarity_organization_profile_by_access_v1",
    {
      p_request_id: input.requestId,
      p_organization_territory_id: input.organizationTerritoryId,
      p_actor_user_id: input.actorUserId,
      p_expected_updated_at: input.expectedUpdatedAt,
      p_presentation_public: input.presentation,
      p_services_public: input.services,
      p_service_territory_public: input.serviceTerritory,
      p_public_contact_authorized: input.publicContact,
      p_public_contact_confirmed: input.publicContactConfirmed,
    },
  );
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data)
    ? (result.data[0] as RpcRow | undefined)
    : undefined;
  if (
    !row ||
    row.organization_territory_id !== input.organizationTerritoryId ||
    typeof row.organization_updated_at !== "string"
  )
    throw new Error("COMUN_SOLIDARITY_PROFILE_UPDATE_FAILED");
  return {
    organizationTerritoryId: row.organization_territory_id,
    updatedAt: row.organization_updated_at,
    idempotent: row.idempotent === true,
  };
}
