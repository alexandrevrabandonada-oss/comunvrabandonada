"use server";

import {
  createOwnCollectiveEntity,
  revokeOwnCollectiveRepresentation,
  setOwnCollectiveEntityConsent,
} from "@/lib/comun-collective-entity-runtime";
import type { ComunCollectiveEntityType } from "@/lib/comun-collective-entity-consent";

/**
 * These actions intentionally accept no user id. The database entry points
 * derive the actor from auth.uid(), after the server validates the session.
 */
export async function createCollectiveEntityAction(input: {
  requestId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
}) {
  return createOwnCollectiveEntity(input);
}

export async function setCollectiveEntityConsentAction(
  entityId: string,
  active: boolean,
) {
  return setOwnCollectiveEntityConsent(entityId, active);
}

export async function revokeCollectiveRepresentationAction(entityId: string) {
  return revokeOwnCollectiveRepresentation(entityId);
}
