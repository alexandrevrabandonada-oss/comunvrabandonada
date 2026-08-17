import "server-only";

import {
  SOLIDARITY_CONNECTION_STATES,
  type PrivateSolidarityMemberConnectionV1,
  type PrivateSolidarityOrganizationConnectionV1,
  type SolidarityConnectionKind,
  type SolidarityConnectionState,
} from "@/lib/comun-solidarity-private-connections";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type RpcRow = Record<string, unknown>;
type SubjectKind = "offer" | "need";

function cleanText(value: unknown, maximum = 600) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function iso(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
}

function optionalIso(value: unknown) {
  return value == null ? null : iso(value);
}

function state(value: unknown) {
  return typeof value === "string" &&
    SOLIDARITY_CONNECTION_STATES.includes(value as SolidarityConnectionState)
    ? (value as SolidarityConnectionState)
    : null;
}

function kind(value: unknown): SolidarityConnectionKind | null {
  return value === "offer"
    ? "offer_interest"
    : value === "need"
      ? "need_help"
      : null;
}

async function connectionRpc(name: string, parameters: Record<string, unknown>) {
  const database = createServiceSupabaseClient();
  if (!database) throw new Error("COMUN_SOLIDARITY_CONNECTION_DATABASE_UNAVAILABLE");
  const result = await database.rpc(name, parameters);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function createSolidarityConnection(input: {
  requestId: string;
  subjectKind: SubjectKind;
  subjectId: string;
  memberUserId: string;
  messagePrivate: string;
  contactPrivate: string;
  consentVersion: string;
}) {
  const name = input.subjectKind === "offer"
    ? "comun_create_solidarity_offer_interest_v1"
    : "comun_create_solidarity_need_interest_v1";
  return connectionRpc(name, {
    p_request_id: input.requestId,
    [input.subjectKind === "offer" ? "p_offer_id" : "p_need_id"]: input.subjectId,
    p_member_user_id: input.memberUserId,
    p_message_private: input.messagePrivate,
    p_contact_private: input.contactPrivate,
    p_consent_version: input.consentVersion,
    p_consent_to_contact: true,
  });
}

export async function reviewSolidarityConnection(input: {
  subjectKind: SubjectKind;
  interestId: string;
  organizationTerritoryId: string;
  actorUserId: string;
  decision: "accept" | "reject";
}) {
  await connectionRpc("comun_review_solidarity_connection_v1", {
    p_subject_kind: input.subjectKind,
    p_interest_id: input.interestId,
    p_expected_organization_territory_id: input.organizationTerritoryId,
    p_actor_user_id: input.actorUserId,
    p_decision: input.decision,
  });
}

export async function withdrawSolidarityConnection(input: {
  subjectKind: SubjectKind;
  interestId: string;
  memberUserId: string;
}) {
  await connectionRpc("comun_withdraw_solidarity_connection_v1", {
    p_subject_kind: input.subjectKind,
    p_interest_id: input.interestId,
    p_member_user_id: input.memberUserId,
  });
}

export async function listMySolidarityConnections(
  memberUserId: string,
): Promise<PrivateSolidarityMemberConnectionV1[]> {
  const raw = await connectionRpc("comun_list_my_solidarity_connections_v1", {
    p_member_user_id: memberUserId,
  });
  return ((Array.isArray(raw) ? raw : []) as RpcRow[]).flatMap((row) => {
    const interestId = cleanText(row.interest_id, 80);
    const connectionKind = kind(row.subject_kind);
    const subjectId = cleanText(row.subject_id, 80);
    const subjectSlug = cleanText(row.subject_slug, 100);
    const subjectTitle = cleanText(row.subject_title, 180);
    const organizationSlug = cleanText(row.organization_slug, 100);
    const organizationName = cleanText(row.organization_name, 200);
    const connectionState = state(row.connection_state);
    const createdAt = iso(row.created_at);
    const updatedAt = iso(row.updated_at);
    const reviewedAt = optionalIso(row.reviewed_at);
    const acceptedAt = optionalIso(row.accepted_at);
    const withdrawnAt = optionalIso(row.withdrawn_at);
    return interestId && connectionKind && subjectId && subjectSlug && subjectTitle &&
      organizationSlug && organizationName && connectionState && createdAt && updatedAt &&
      (row.reviewed_at == null || reviewedAt) &&
      (row.accepted_at == null || acceptedAt) &&
      (row.withdrawn_at == null || withdrawnAt)
      ? [{
          interestId,
          kind: connectionKind,
          subjectId,
          subjectSlug,
          subjectTitle,
          organizationSlug,
          organizationName,
          state: connectionState,
          createdAt,
          updatedAt,
          reviewedAt,
          acceptedAt,
          withdrawnAt,
        }]
      : [];
  });
}

export async function listSolidarityOrganizationConnections(
  organizationTerritoryId: string,
  actorUserId: string,
): Promise<PrivateSolidarityOrganizationConnectionV1[]> {
  const raw = await connectionRpc(
    "comun_list_solidarity_organization_connections_v1",
    {
      p_organization_territory_id: organizationTerritoryId,
      p_actor_user_id: actorUserId,
    },
  );
  return ((Array.isArray(raw) ? raw : []) as RpcRow[]).flatMap((row) => {
    const interestId = cleanText(row.interest_id, 80);
    const connectionKind = kind(row.subject_kind);
    const subjectId = cleanText(row.subject_id, 80);
    const subjectSlug = cleanText(row.subject_slug, 100);
    const subjectTitle = cleanText(row.subject_title, 180);
    const memberLabel = cleanText(row.member_label, 80);
    const messagePrivate = cleanText(row.message_private, 600);
    const connectionState = state(row.connection_state);
    const createdAt = iso(row.created_at);
    const updatedAt = iso(row.updated_at);
    const reviewedAt = optionalIso(row.reviewed_at);
    if (!interestId || !connectionKind || !subjectId || !subjectSlug || !subjectTitle ||
      !memberLabel || !messagePrivate || !connectionState ||
      !["pending", "contacted", "accepted"].includes(connectionState) || !createdAt || !updatedAt ||
      (row.reviewed_at != null && !reviewedAt))
      return [];
    const contactPrivate = connectionState === "accepted"
      ? cleanText(row.contact_private, 200)
      : null;
    return [{
      interestId,
      kind: connectionKind,
      subjectId,
      subjectSlug,
      subjectTitle,
      memberLabel,
      messagePrivate,
      contactPrivate,
      state: connectionState as "pending" | "contacted" | "accepted",
      subjectIsPublic: row.subject_is_public === true,
      createdAt,
      updatedAt,
      reviewedAt,
    }];
  });
}
