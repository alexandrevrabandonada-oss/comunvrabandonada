export const COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION =
  "relata-collective-public-projection-v1" as const;

/**
 * Contract text for a future, explicit collective-entity consent surface.
 * It is intentionally not a publication switch and does not reuse individual
 * report consent.
 */
export const COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE = [
  "A participa\u00e7\u00e3o da entidade \u00e9 volunt\u00e1ria e pode ser revogada a qualquer momento.",
  "Esta autoriza\u00e7\u00e3o se refere apenas a uma futura proje\u00e7\u00e3o p\u00fablica sanitizada da entidade.",
  "Ela n\u00e3o publica relatos individuais, evid\u00eancias, contatos, localiza\u00e7\u00f5es ou dados de outras pessoas.",
  "O COMUN conserva o registro privado m\u00ednimo da declara\u00e7\u00e3o, da representa\u00e7\u00e3o e da revoga\u00e7\u00e3o para auditoria.",
  "Consentimento da entidade n\u00e3o substitui o consentimento individual e n\u00e3o abre o mapa p\u00fablico.",
  "Uma representa\u00e7\u00e3o apenas declarada nunca \u00e9 autoridade de publica\u00e7\u00e3o; qualquer proje\u00e7\u00e3o futura exigir\u00e1 regra pr\u00f3pria de legitimidade.",
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

export function isActiveCollectiveRepresentation(
  state: ComunCollectiveRepresentationState,
) {
  return state === "declared" || state === "verified";
}

/** Entity consent is intentionally insufficient for public-map readiness. */
export function entityConsentAloneCanOpenPublicMap() {
  return false as const;
}
