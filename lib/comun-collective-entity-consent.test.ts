import { describe, expect, it } from "vitest";
import {
  COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE,
  COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION,
  COMUN_COLLECTIVE_ENTITY_TYPES,
  entityConsentAloneCanOpenPublicMap,
  isActiveCollectiveRepresentation,
} from "./comun-collective-entity-consent";

describe("collective entity consent foundation", () => {
  it("keeps a version distinct from individual report consent", () => {
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION).toBe(
      "relata-collective-public-projection-v1",
    );
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION).not.toBe(
      "relata-public-projection-v1",
    );
  });

  it("keeps the future consent explanation explicit and non-publishing", () => {
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE.join(" ")).toContain(
      "volunt\u00e1ria",
    );
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE.join(" ")).toContain(
      "revogada",
    );
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE.join(" ")).toContain(
      "n\u00e3o abre o mapa p\u00fablico",
    );
  });

  it("models entities independently of a person and keeps revocation inactive", () => {
    expect(COMUN_COLLECTIVE_ENTITY_TYPES).toContain("association");
    expect(isActiveCollectiveRepresentation("declared")).toBe(true);
    expect(isActiveCollectiveRepresentation("verified")).toBe(true);
    expect(isActiveCollectiveRepresentation("revoked")).toBe(false);
  });

  it("does not make entity consent a map-readiness shortcut", () => {
    expect(entityConsentAloneCanOpenPublicMap()).toBe(false);
  });
});
