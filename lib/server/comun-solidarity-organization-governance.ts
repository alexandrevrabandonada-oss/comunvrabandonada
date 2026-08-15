import "server-only";

import {
  SOLIDARITY_ORGANIZATION_ACCESS_ROLES,
  SOLIDARITY_ORGANIZATION_ACCESS_STATES,
  SOLIDARITY_ORGANIZATION_REVIEW_SCOPES,
  type PrivateSolidarityOrganizationAccessV1,
  type PrivateSolidarityOrganizationGovernanceRecordV1,
  type SolidarityOrganizationAccessRole,
  type SolidarityOrganizationAccessState,
  type SolidarityOrganizationReviewScope,
} from "@/lib/comun-solidarity-organization-governance";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getPublicSolidarityEconomyDirectory } from "./comun-solidarity-economy-directory";

type RpcRow = Record<string, unknown>;

function allowlisted<T extends string>(value: unknown, values: readonly T[]) {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : null;
}

function text(value: unknown, maximum = 200) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function iso(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
}

async function governanceRpc(name: string, parameters: Record<string, unknown>) {
  const database = createServiceSupabaseClient();
  if (!database) throw new Error("COMUN_SOLIDARITY_ACCESS_DATABASE_UNAVAILABLE");
  const result = await database.rpc(name, parameters);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function getPublicSolidarityOrganizationDetail(slug: string) {
  const directory = await getPublicSolidarityEconomyDirectory();
  const organization = directory.organizations.find((item) => item.slug === slug);
  if (!organization) return null;
  return {
    organization,
    offers: directory.offers.filter(
      (item) => item.organization.territoryId === organization.territoryId,
    ),
    needs: directory.needs.filter(
      (item) => item.organization?.territoryId === organization.territoryId,
    ),
    limitations: directory.limitations,
  };
}

export async function listMySolidarityOrganizationAccess(
  memberUserId: string,
): Promise<PrivateSolidarityOrganizationAccessV1[]> {
  const [raw, directory] = await Promise.all([
    governanceRpc("comun_list_my_solidarity_organization_access", {
      p_member_user_id: memberUserId,
    }),
    getPublicSolidarityEconomyDirectory(),
  ]);
  const organizations = new Map(
    directory.organizations.map((organization) => [
      organization.territoryId,
      organization,
    ]),
  );
  const result: PrivateSolidarityOrganizationAccessV1[] = [];
  for (const row of (Array.isArray(raw) ? raw : []) as RpcRow[]) {
    const organizationTerritoryId = text(row.organization_territory_id, 80);
    const organization = organizationTerritoryId
      ? organizations.get(organizationTerritoryId)
      : null;
    const accessId = text(row.access_id, 80);
    const requestedRole = allowlisted(
      row.requested_role,
      SOLIDARITY_ORGANIZATION_ACCESS_ROLES,
    );
    const role =
      row.role == null
        ? null
        : allowlisted(row.role, SOLIDARITY_ORGANIZATION_ACCESS_ROLES);
    const state = allowlisted(
      row.state,
      SOLIDARITY_ORGANIZATION_ACCESS_STATES,
    );
    const reviewScope = allowlisted(
      row.review_scope,
      SOLIDARITY_ORGANIZATION_REVIEW_SCOPES,
    );
    const requestedAt = iso(row.requested_at);
    if (
      !organizationTerritoryId ||
      !organization ||
      !accessId ||
      !requestedRole ||
      row.role != null && !role ||
      !state ||
      !reviewScope ||
      !requestedAt
    )
      continue;
    result.push({
      accessId,
      organizationTerritoryId,
      organizationSlug: organization.slug,
      organizationName: organization.publicName,
      requestedRole: requestedRole as SolidarityOrganizationAccessRole,
      role: role as SolidarityOrganizationAccessRole | null,
      state: state as SolidarityOrganizationAccessState,
      reviewScope: reviewScope as SolidarityOrganizationReviewScope,
      requestedAt,
      reviewedAt: iso(row.reviewed_at),
      activatedAt: iso(row.activated_at),
      revokedAt: iso(row.revoked_at),
      leftAt: iso(row.left_at),
    });
  }
  return result;
}

export async function getMySolidarityOrganizationAccess(
  memberUserId: string,
  organizationTerritoryId: string,
) {
  const rows = await listMySolidarityOrganizationAccess(memberUserId);
  return (
    rows.find(
      (row) =>
        row.organizationTerritoryId === organizationTerritoryId &&
        ["pending", "active"].includes(row.state),
    ) ?? null
  );
}

export async function listSolidarityOrganizationGovernance(
  organizationTerritoryId: string,
  actorUserId: string,
): Promise<PrivateSolidarityOrganizationGovernanceRecordV1[]> {
  const raw = await governanceRpc(
    "comun_list_solidarity_organization_governance",
    {
      p_organization_territory_id: organizationTerritoryId,
      p_actor_user_id: actorUserId,
    },
  );
  const result: PrivateSolidarityOrganizationGovernanceRecordV1[] = [];
  for (const row of (Array.isArray(raw) ? raw : []) as RpcRow[]) {
    const accessId = text(row.access_id, 80);
    const memberLabel = text(row.member_label, 80);
    const requestNotePrivate = text(row.request_note_private, 600);
    const requestedRole = allowlisted(
      row.requested_role,
      SOLIDARITY_ORGANIZATION_ACCESS_ROLES,
    );
    const role =
      row.role == null
        ? null
        : allowlisted(row.role, SOLIDARITY_ORGANIZATION_ACCESS_ROLES);
    const state = allowlisted(row.state, ["pending", "active"] as const);
    const reviewScope = allowlisted(
      row.review_scope,
      SOLIDARITY_ORGANIZATION_REVIEW_SCOPES,
    );
    const requestedAt = iso(row.requested_at);
    if (
      !accessId ||
      !memberLabel ||
      !requestNotePrivate ||
      !requestedRole ||
      row.role != null && !role ||
      !state ||
      !reviewScope ||
      !requestedAt
    )
      continue;
    result.push({
      accessId,
      memberLabel,
      requestNotePrivate,
      requestedRole,
      role,
      state,
      reviewScope,
      requestedAt,
      activatedAt: iso(row.activated_at),
    });
  }
  return result;
}

export async function listPlatformSolidarityOrganizationAccess(
  actorUserId: string,
) {
  const raw = await governanceRpc(
    "comun_list_platform_solidarity_organization_access",
    { p_actor_user_id: actorUserId },
  );
  return ((Array.isArray(raw) ? raw : []) as RpcRow[]).flatMap((row) => {
    const accessId = text(row.access_id, 80);
    const organizationTerritoryId = text(row.organization_territory_id, 80);
    const organizationName = text(row.organization_name, 200);
    const memberLabel = text(row.member_label, 80);
    const requestNotePrivate = text(row.request_note_private, 600);
    const requestedAt = iso(row.requested_at);
    const requestedRole = allowlisted(row.requested_role, SOLIDARITY_ORGANIZATION_ACCESS_ROLES);
    const role = row.role == null ? null : allowlisted(row.role, SOLIDARITY_ORGANIZATION_ACCESS_ROLES);
    const state = allowlisted(row.state, ["pending", "active"] as const);
    const reviewScope = allowlisted(row.review_scope, SOLIDARITY_ORGANIZATION_REVIEW_SCOPES);
    return accessId && organizationTerritoryId && organizationName && memberLabel && requestNotePrivate && requestedAt && requestedRole && state && reviewScope && (row.role == null || role)
      ? [{ accessId, organization: { territoryId: organizationTerritoryId, publicName: organizationName }, memberLabel, requestNotePrivate, requestedRole, role, state, reviewScope, requestedAt }]
      : [];
  });
}

export async function requestSolidarityOrganizationAccess(input: {
  organizationTerritoryId: string;
  memberUserId: string;
  requestNote: string;
}) {
  const data = await governanceRpc(
    "comun_request_solidarity_organization_access",
    {
      p_organization_territory_id: input.organizationTerritoryId,
      p_member_user_id: input.memberUserId,
      p_request_note_private: input.requestNote,
    },
  );
  const row = Array.isArray(data) ? (data[0] as RpcRow | undefined) : undefined;
  const reviewScope = allowlisted(
    row?.review_scope,
    SOLIDARITY_ORGANIZATION_REVIEW_SCOPES,
  );
  if (!row || !reviewScope) throw new Error("COMUN_SOLIDARITY_ACCESS_REQUEST_FAILED");
  return { reviewScope };
}

export async function reviewSolidarityOrganizationAccess(input: {
  accessId: string;
  organizationTerritoryId: string;
  actorUserId: string;
  decision: "approve" | "reject";
  note?: string | null;
}) {
  await governanceRpc("comun_review_solidarity_organization_access", {
    p_access_id: input.accessId,
    p_expected_organization_territory_id: input.organizationTerritoryId,
    p_actor_user_id: input.actorUserId,
    p_decision: input.decision,
    p_review_note_private: input.note ?? null,
  });
}

export async function governSolidarityOrganizationAccess(input: {
  accessId: string;
  organizationTerritoryId: string;
  actorUserId: string;
  action: "promote" | "revoke";
  note?: string | null;
}) {
  await governanceRpc("comun_govern_solidarity_organization_access", {
    p_access_id: input.accessId,
    p_expected_organization_territory_id: input.organizationTerritoryId,
    p_actor_user_id: input.actorUserId,
    p_action: input.action,
    p_review_note_private: input.note ?? null,
  });
}

export async function leaveSolidarityOrganizationAccess(
  organizationTerritoryId: string,
  memberUserId: string,
) {
  await governanceRpc("comun_leave_solidarity_organization_access", {
    p_organization_territory_id: organizationTerritoryId,
    p_member_user_id: memberUserId,
  });
}

export async function withdrawSolidarityOrganizationAccess(
  organizationTerritoryId: string,
  memberUserId: string,
) {
  await governanceRpc("comun_withdraw_solidarity_organization_access", {
    p_organization_territory_id: organizationTerritoryId,
    p_member_user_id: memberUserId,
  });
}
