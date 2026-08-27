import { describe, expect, it } from "vitest";
import {
  createDenunciasPublicEvidenceCitationV1,
  isPublicEvidenceCitationV1,
} from "./comun-public-evidence";

const input = {
  publicId: "11111111-1111-4111-8111-111111111111",
  category: "public_lighting" as const,
  reportCount: 1,
  firstObservedDate: "2026-08-26",
  lastActivityDate: "2026-08-26",
  policyVersion: "relata-public-projection-v1" as const,
  location: { uncertaintyRadiusMeters: 300 },
};

describe("Denúncias como evidência pública", () => {
  it("creates a sanitized, versioned citation with the canonical public path", () => {
    const citation = createDenunciasPublicEvidenceCitationV1(input);
    expect(citation.namespace).toBe("comun.denuncias");
    expect(citation.refId).toBe(`denuncias:${input.publicId}`);
    expect(citation.publicPath).toBe(`/comun/denuncias/problemas/${input.publicId}`);
    expect(citation.sourceRefs).toEqual([]);
    expect(citation.versionId).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(isPublicEvidenceCitationV1(citation)).toBe(true);
  });

  it("versions only the semantic public projection fields", () => {
    const first = createDenunciasPublicEvidenceCitationV1(input);
    const changed = createDenunciasPublicEvidenceCitationV1({ ...input, reportCount: 2 });
    expect(changed.versionId).not.toBe(first.versionId);
    expect(isPublicEvidenceCitationV1({ ...first, private_location: "must-not-be-here" })).toBe(false);
  });

  it("rejects invalid namespaces, inactive state markers and private fields", () => {
    const citation = createDenunciasPublicEvidenceCitationV1(input);
    expect(isPublicEvidenceCitationV1({ ...citation, namespace: "comun.panorama" })).toBe(false);
    expect(isPublicEvidenceCitationV1({ ...citation, collective_case_id: "private" })).toBe(false);
    expect(isPublicEvidenceCitationV1({ ...citation, publicPath: "/comun/denuncias/problemas/not-a-uuid" })).toBe(false);
  });
});
