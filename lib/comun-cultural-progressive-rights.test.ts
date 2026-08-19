import { describe, expect, it } from "vitest";
import {
  CULTURAL_RIGHTS_CONTRACT_VERSION,
  decideArtworkRights,
  decidePhotoRights,
  decideRadioRights,
  isComunCulturalProgressiveRightsEnabled,
} from "./comun-cultural-progressive-rights";

describe("COMUN A4 progressive rights", () => {
  it("is disabled unless explicitly enabled", () => {
    expect(isComunCulturalProgressiveRightsEnabled({})).toBe(false);
    expect(isComunCulturalProgressiveRightsEnabled({ COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED: "enabled" })).toBe(true);
  });
  it("keeps the contract version explicit", () => expect(CULTURAL_RIGHTS_CONTRACT_VERSION).toBe("a4-20260819-v1"));
  it("distinguishes own photo declaration from third-party review", () => {
    expect(decidePhotoRights({ rightsBasis: "own_creation", publicationScope: "comun_display", reusePermission: "comun_only" })).toEqual({ state: "rights_declared", reason: "declared" });
    expect(decidePhotoRights({ rightsBasis: "third_party_unverified", publicationScope: "comun_display", reusePermission: "comun_only" })?.state).toBe("rights_review_required");
  });
  it("does not infer unknown photo authorship", () => expect(decidePhotoRights({ rightsBasis: "historical_unknown", publicationScope: "review_only", reusePermission: "not_defined" })?.state).toBe("rights_review_required"));
  it("requires a license for explicit reuse", () => expect(decideArtworkRights({ authorshipBasis: "uploader_creator", publicationScope: "comun_display_and_reuse", reusePermission: "licensed_reuse", identityPreference: "public_credit" })).toBeNull());
  it("supports artwork by an authorized different creator", () => expect(decideArtworkRights({ authorshipBasis: "authorized_by_creator", publicationScope: "comun_display", reusePermission: "comun_only", identityPreference: "artistic_name" })?.state).toBe("rights_declared"));
  it("keeps unknown artwork authorship under review", () => expect(decideArtworkRights({ authorshipBasis: "unknown", publicationScope: "comun_display", reusePermission: "comun_only", identityPreference: "anonymous" })?.state).toBe("rights_review_required"));
  it("separates radio voice and material rights", () => expect(decideRadioRights({ voiceSource: "submitter_voice", materialSource: "original_text", publicationScope: "comun_audio", reusePermission: "comun_only", identityPreference: "anonymous" })?.state).toBe("rights_declared"));
  it("blocks third-party radio material for specialized review", () => expect(decideRadioRights({ voiceSource: "submitter_voice", materialSource: "third_party_unverified", publicationScope: "comun_audio", reusePermission: "comun_only", identityPreference: "public_credit" })?.state).toBe("rights_review_required"));
  it("never treats review-only scope as publication authorization", () => {
    expect(decidePhotoRights({ rightsBasis: "own_creation", publicationScope: "review_only", reusePermission: "not_defined" })?.state).toBe("rights_declared");
    expect(decideArtworkRights({ authorshipBasis: "uploader_creator", publicationScope: "review_only", reusePermission: "not_defined", identityPreference: "anonymous" })?.state).toBe("rights_declared");
  });
});
