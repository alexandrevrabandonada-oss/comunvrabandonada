import { describe, expect, it } from "vitest";
import { isPublicArchiveAssetEligible, isPublicArtworkEligible, resolvePublicRadioEpisodeEligibility } from "./public-gates";

describe("public memory gates", () => {
  it("requires explicit hosted-asset rights", () => {
    const base = { bucket_scope: "public_safe", review_status: "approved", public_url: "https://cdn.example/a.webp" };
    expect(isPublicArchiveAssetEligible({ ...base, rights_status: "restricted" })).toBe(false);
    expect(isPublicArchiveAssetEligible({ ...base, rights_status: "unknown" })).toBe(false);
    expect(isPublicArchiveAssetEligible({ ...base, rights_status: null })).toBe(false);
    expect(isPublicArchiveAssetEligible({ ...base, rights_status: "licensed" })).toBe(true);
  });

  it("uses one artwork rule for current, embargoed and future rights", () => {
    expect(isPublicArtworkEligible({ consent_status: "granted", allow_comun_display: true })).toBe(true);
    expect(isPublicArtworkEligible({ consent_status: "granted", allow_comun_display: true, embargo_until: "2999-01-01T00:00:00.000Z" })).toBe(false);
    expect(isPublicArtworkEligible({ consent_status: "granted", allow_comun_display: true, valid_from: "2999-01-01" })).toBe(false);
    expect(isPublicArtworkEligible({ consent_status: "granted", allow_comun_display: true, valid_until: "2000-01-01" })).toBe(false);
  });

  it("keeps radio list and detail on the same fail-closed verdict", () => {
    const base = { root: { status: "published", visibility: "public", published_at: "2026-01-01" }, publicationStatus: "published", consents: [{ consent_status: "approved", allow_comun_audio: true }], music: [], safetyStatus: "not_required", hasPublicAsset: true, transcriptStatus: "published" } as const;
    expect(resolvePublicRadioEpisodeEligibility(base)).toBe(true);
    expect(resolvePublicRadioEpisodeEligibility({ ...base, hasPublicAsset: false })).toBe(false);
    expect(resolvePublicRadioEpisodeEligibility({ ...base, consents: [{ consent_status: "approved", allow_comun_audio: true, valid_until: "2000-01-01" }] })).toBe(false);
    expect(resolvePublicRadioEpisodeEligibility({ ...base, safetyStatus: "pending" })).toBe(false);
  });
});
