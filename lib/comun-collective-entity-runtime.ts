import "server-only";

import {
  createServiceSupabaseClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import {
  COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE,
  COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE_SHA256,
  COMUN_COLLECTIVE_ENTITY_CONSENT_SCOPE,
  COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION,
  type ComunCollectiveEntityType,
} from "@/lib/comun-collective-entity-consent";

export type ComunCollectiveEntityOwnState = {
  entityId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
  entityState: "active" | "archived";
  representationStatus: "declared" | "verified" | "revoked";
  consentActive: boolean;
  consentWithdrawn: boolean;
};

export type ComunCollectiveEntityOwnCandidate = {
  candidateId: string;
  entityId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
  candidateState: "pending_legitimacy" | "invalidated";
  generatedAt: string;
  invalidatedAt: string | null;
  invalidationReason:
    "CONSENT_REVOKED" | "REPRESENTATION_REVOKED" | "ENTITY_ARCHIVED" | null;
};

function toOwnCandidate(
  row: Record<string, unknown>,
): ComunCollectiveEntityOwnCandidate {
  // Explicit allowlist: provenance and actor identities never enter the DTO.
  return {
    candidateId: row.candidate_id as string,
    entityId: row.entity_id as string,
    publicName: row.public_name as string,
    entityType: row.entity_type as ComunCollectiveEntityType,
    candidateState:
      row.candidate_state as ComunCollectiveEntityOwnCandidate["candidateState"],
    generatedAt: row.generated_at as string,
    invalidatedAt: row.invalidated_at as string | null,
    invalidationReason:
      row.invalidation_reason as ComunCollectiveEntityOwnCandidate["invalidationReason"],
  };
}

async function requireAuthenticatedRuntimeClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("COMUN_RELATA_ENTITY_RUNTIME_UNAVAILABLE");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("COMUN_RELATA_ENTITY_AUTH_REQUIRED");
  const service = createServiceSupabaseClient();
  if (!service) throw new Error("COMUN_RELATA_ENTITY_RUNTIME_UNAVAILABLE");
  return { service, userId: user.id };
}

export async function createOwnCollectiveEntity(input: {
  requestId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
}) {
  const { service, userId } = await requireAuthenticatedRuntimeClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_create",
    {
      p_request_id: input.requestId,
      p_actor_user_id: userId,
      p_public_name: input.publicName,
      p_entity_type: input.entityType,
    },
  );
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function setOwnCollectiveEntityConsent(
  entityId: string,
  active: boolean,
) {
  const { service, userId } = await requireAuthenticatedRuntimeClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_consent_set",
    {
      p_actor_user_id: userId,
      p_entity_id: entityId,
      p_active: active,
    },
  );
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function revokeOwnCollectiveRepresentation(entityId: string) {
  const { service, userId } = await requireAuthenticatedRuntimeClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_representation_revoke",
    {
      p_actor_user_id: userId,
      p_entity_id: entityId,
    },
  );
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function listOwnCollectiveEntityStates(): Promise<
  ComunCollectiveEntityOwnState[]
> {
  const { service, userId } = await requireAuthenticatedRuntimeClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_list_own",
    {
      p_actor_user_id: userId,
    },
  );
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    entityId: row.entity_id,
    publicName: row.public_name,
    entityType: row.entity_type,
    entityState: row.entity_state,
    representationStatus: row.representation_status,
    consentActive: row.consent_active,
    consentWithdrawn: row.consent_withdrawn,
  }));
}

export async function prepareOwnCollectiveEntityCandidate(input: {
  requestId: string;
  entityId: string;
}): Promise<ComunCollectiveEntityOwnCandidate | null> {
  const { service, userId } = await requireAuthenticatedRuntimeClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_candidate_prepare",
    {
      p_request_id: input.requestId,
      p_actor_user_id: userId,
      p_entity_id: input.entityId,
    },
  );
  if (error) throw error;
  return data?.[0] ? toOwnCandidate(data[0] as Record<string, unknown>) : null;
}

export async function listOwnCollectiveEntityCandidates(): Promise<
  ComunCollectiveEntityOwnCandidate[]
> {
  const { service, userId } = await requireAuthenticatedRuntimeClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_candidate_prepare",
    {
      p_request_id: null,
      p_actor_user_id: userId,
      p_entity_id: null,
    },
  );
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) =>
    toOwnCandidate(row),
  );
}

export const collectiveEntityRuntimeConsent = {
  version: COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION,
  scope: COMUN_COLLECTIVE_ENTITY_CONSENT_SCOPE,
  noticeSha256: COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE_SHA256,
  notice: COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE,
} as const;
