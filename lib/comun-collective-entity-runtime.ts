import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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

async function requireAuthenticatedRuntimeClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("COMUN_RELATA_ENTITY_RUNTIME_UNAVAILABLE");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("COMUN_RELATA_ENTITY_AUTH_REQUIRED");
  return supabase;
}

export async function createOwnCollectiveEntity(input: {
  requestId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
}) {
  const supabase = await requireAuthenticatedRuntimeClient();
  const { data, error } = await supabase.rpc("comun_relata_collective_entity_runtime_create", {
    p_request_id: input.requestId,
    p_public_name: input.publicName,
    p_entity_type: input.entityType,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function setOwnCollectiveEntityConsent(entityId: string, active: boolean) {
  const supabase = await requireAuthenticatedRuntimeClient();
  const { data, error } = await supabase.rpc("comun_relata_collective_entity_runtime_consent_set", {
    p_entity_id: entityId,
    p_active: active,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function revokeOwnCollectiveRepresentation(entityId: string) {
  const supabase = await requireAuthenticatedRuntimeClient();
  const { data, error } = await supabase.rpc("comun_relata_collective_entity_runtime_representation_revoke", {
    p_entity_id: entityId,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function listOwnCollectiveEntityStates(): Promise<ComunCollectiveEntityOwnState[]> {
  const supabase = await requireAuthenticatedRuntimeClient();
  const { data, error } = await supabase.rpc("comun_relata_collective_entity_runtime_list_own");
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

export const collectiveEntityRuntimeConsent = {
  version: COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION,
  scope: COMUN_COLLECTIVE_ENTITY_CONSENT_SCOPE,
  noticeSha256: COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE_SHA256,
  notice: COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE,
} as const;
