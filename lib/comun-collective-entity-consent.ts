export const COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION =
  "relata-collective-public-projection-v1" as const;

/**
 * Scope deliberately excludes individual reports, evidence and any automatic
 * publication. A later delivery must introduce its own authenticated route and
 * legitimacy policy before this can be used by a runtime client.
 */
export const COMUN_COLLECTIVE_ENTITY_CONSENT_SCOPE =
  "sanitized_entity_projection" as const;

/**
 * SHA-256 of the exact newline-joined notice below, pinned in the database
 * alongside each consent and its audit events.
 */
export const COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE_SHA256 =
  "0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae" as const;

/**
 * Contract text for a future, explicit collective-entity consent surface.
 * It is intentionally not a publication switch and does not reuse individual
 * report consent.
 */
export const COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE = [
  "A participação da entidade é voluntária e pode ser revogada a qualquer momento.",
  "Esta autorização se refere apenas a uma futura projeção pública sanitizada da entidade.",
  "Ela não publica relatos individuais, evidências, contatos, localizações ou dados de outras pessoas.",
  "O COMUN conserva o registro privado mínimo da declaração, da representação e da revogação para auditoria.",
  "Consentimento da entidade não substitui o consentimento individual e não abre o mapa público.",
  "Uma representação apenas declarada nunca é autoridade de publicação; qualquer projeção futura exigirá regra própria de legitimidade.",
] as const;

export const COMUN_COLLECTIVE_ENTITY_TYPES = [
  "association",
  "collective",
  "community_group",
  "informal_group",
  "other",
] as const;

export const COMUN_COLLECTIVE_REPRESENTATION_STATES = [
  "declared",
  "verified",
  "revoked",
] as const;

export type ComunCollectiveEntityType =
  (typeof COMUN_COLLECTIVE_ENTITY_TYPES)[number];
export type ComunCollectiveRepresentationState =
  (typeof COMUN_COLLECTIVE_REPRESENTATION_STATES)[number];

/** A declared or verified representation is still live for consent revocation. */
export function isNonRevokedCollectiveRepresentation(
  state: ComunCollectiveRepresentationState,
) {
  return state === "declared" || state === "verified";
}

/**
 * Kept as a lifecycle helper only. It must never be treated as publication
 * authority; use isPublicationEligibleCollectiveRepresentation where needed.
 */
export function isActiveCollectiveRepresentation(
  state: ComunCollectiveRepresentationState,
) {
  return isNonRevokedCollectiveRepresentation(state);
}

/** Even verified representation is not public-map authority in this foundation. */
export function isPublicationEligibleCollectiveRepresentation(
  state: ComunCollectiveRepresentationState,
) {
  return state === "verified";
}

/** Entity consent is intentionally insufficient for public-map readiness. */
export function entityConsentAloneCanOpenPublicMap() {
  return false as const;
}
