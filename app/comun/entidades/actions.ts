"use server";

import {
  createOwnCollectiveEntity,
  prepareOwnCollectiveEntityCandidate,
  revokeOwnCollectiveRepresentation,
  setOwnCollectiveEntityConsent,
} from "@/lib/comun-collective-entity-runtime";
import type { ComunCollectiveEntityType } from "@/lib/comun-collective-entity-consent";
import { listOwnCollectiveEntityLegitimacyStates } from "@/lib/comun-collective-entity-legitimacy-runtime";
import { listOwnCollectiveEntityProjectionStates } from "@/lib/comun-collective-entity-projection-runtime";

/**
 * These actions intentionally accept no user id. The database entry points
 * obtain the actor only from the server-validated session before the
 * service-only database bridge receives it as an audit attribute.
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

export async function prepareOwnCollectiveEntityCandidateAction(input: {
  entityId: string;
  requestId: string;
}) {
  return prepareOwnCollectiveEntityCandidate(input);
}


export async function listOwnCollectiveEntityLegitimacyAction() {
  return listOwnCollectiveEntityLegitimacyStates();
}


export async function listOwnCollectiveEntityProjectionAction() {
  return listOwnCollectiveEntityProjectionStates();
}
