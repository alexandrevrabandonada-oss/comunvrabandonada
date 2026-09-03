import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE,
  COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE_SHA256,
  COMUN_COLLECTIVE_ENTITY_CONSENT_SCOPE,
  COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION,
  COMUN_COLLECTIVE_ENTITY_TYPES,
  entityConsentAloneCanOpenPublicMap,
  isActiveCollectiveRepresentation,
  isNonRevokedCollectiveRepresentation,
  isPublicationEligibleCollectiveRepresentation,
} from "./comun-collective-entity-consent";

describe("collective entity consent foundation", () => {
  it("keeps a version and scope distinct from individual report consent", () => {
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION).toBe(
      "relata-collective-public-projection-v1",
    );
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_VERSION).not.toBe(
      "relata-public-projection-v1",
    );
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_SCOPE).toBe(
      "sanitized_entity_projection",
    );
  });

  it("pins the exact notice that a future consent route must display", () => {
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE.join(" ")).toContain(
      "voluntária",
    );
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE.join(" ")).toContain(
      "revogada",
    );
    expect(COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE.join(" ")).toContain(
      "não abre o mapa público",
    );
    expect(
      createHash("sha256")
        .update(COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE.join("\n"), "utf8")
        .digest("hex"),
    ).toBe(COMUN_COLLECTIVE_ENTITY_CONSENT_NOTICE_SHA256);
  });

  it("separates live representation from publication eligibility", () => {
    expect(COMUN_COLLECTIVE_ENTITY_TYPES).toContain("association");
    expect(isNonRevokedCollectiveRepresentation("declared")).toBe(true);
    expect(isNonRevokedCollectiveRepresentation("verified")).toBe(true);
    expect(isNonRevokedCollectiveRepresentation("revoked")).toBe(false);
    expect(isActiveCollectiveRepresentation("declared")).toBe(true);
    expect(isPublicationEligibleCollectiveRepresentation("declared")).toBe(
      false,
    );
    expect(isPublicationEligibleCollectiveRepresentation("verified")).toBe(
      true,
    );
  });

  it("does not make entity consent a map-readiness shortcut", () => {
    expect(entityConsentAloneCanOpenPublicMap()).toBe(false);
  });
});
