import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  decideArtworkRights,
  decidePhotoRights,
  decideRadioRights,
  hasExplicitPublicScope,
  hasExplicitReuseScope,
} from "./comun-cultural-progressive-rights";

const root = new URL("..", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const photo = (over: Partial<Parameters<typeof decidePhotoRights>[0]> = {}) => decidePhotoRights({ rightsBasis: "own_creation", publicationScope: "comun_display", reusePermission: "comun_only", ...over });
const art = (over: Partial<Parameters<typeof decideArtworkRights>[0]> = {}) => decideArtworkRights({ authorshipBasis: "uploader_creator", publicationScope: "comun_display", reusePermission: "comun_only", identityPreference: "public_credit", ...over });
const radio = (over: Partial<Parameters<typeof decideRadioRights>[0]> = {}) => decideRadioRights({ voiceSource: "submitter_voice", materialSource: "original_text", publicationScope: "comun_audio", reusePermission: "comun_only", identityPreference: "anonymous", ...over });

describe("A4 specialized rights contract", () => {
  it("1. accepts own photo provenance", () => expect(photo()?.state).toBe("rights_declared"));
  it("2. accepts authorized photo provenance", () => expect(photo({ rightsBasis: "authorized_by_rightsholder" })?.state).toBe("rights_declared"));
  it("3. keeps public official material explicit", () => expect(photo({ rightsBasis: "public_official_material" })?.state).toBe("rights_declared"));
  it("4. sends third-party photo to review", () => expect(photo({ rightsBasis: "third_party_unverified" })?.state).toBe("rights_review_required"));
  it("5. sends unknown photo authorship to review", () => expect(photo({ rightsBasis: "historical_unknown" })?.state).toBe("rights_review_required"));
  it("6. preserves review-only photo scope", () => expect(photo({ publicationScope: "review_only", reusePermission: "not_defined" })?.state).toBe("rights_declared"));
  it("7. rejects photo reuse without a license", () => expect(photo({ publicationScope: "comun_display_and_reuse", reusePermission: "licensed_reuse" })).toBeNull());
  it("8. accepts explicit photo Creative Commons reuse", () => expect(photo({ publicationScope: "comun_display_and_reuse", reusePermission: "licensed_reuse", licenseCode: "cc_by_4_0" })?.state).toBe("rights_declared"));
  it("9. accepts artwork by uploader", () => expect(art()?.state).toBe("rights_declared"));
  it("10. accepts artwork represented collective", () => expect(art({ authorshipBasis: "collective_representative", identityPreference: "collective" })?.state).toBe("rights_declared"));
  it("11. accepts artwork from another authorized creator", () => expect(art({ authorshipBasis: "authorized_by_creator" })?.state).toBe("rights_declared"));
  it("12. keeps unknown artwork authorship under review", () => expect(art({ authorshipBasis: "unknown" })?.state).toBe("rights_review_required"));
  it("13. supports anonymous artwork credit", () => expect(art({ identityPreference: "anonymous" })?.state).toBe("rights_declared"));
  it("14. rejects undeclared artwork identity", () => expect(art({ identityPreference: "not_declared" })).toBeNull());
  it("15. rejects artwork licensed reuse without a license", () => expect(art({ publicationScope: "comun_display_and_reuse", reusePermission: "licensed_reuse" })).toBeNull());
  it("16. accepts artwork external license for reuse", () => expect(art({ publicationScope: "comun_display_and_reuse", reusePermission: "licensed_reuse", licenseCode: "external_license" })?.state).toBe("rights_declared"));
  it("17. accepts radio with submitter voice", () => expect(radio()?.state).toBe("rights_declared"));
  it("18. accepts radio proposal without recorded voice", () => expect(radio({ voiceSource: "no_voice" })?.state).toBe("rights_declared"));
  it("19. sends third-party voice to review", () => expect(radio({ voiceSource: "third_party_voice" })?.state).toBe("rights_review_required"));
  it("20. sends third-party radio material to review", () => expect(radio({ materialSource: "third_party_unverified" })?.state).toBe("rights_review_required"));
  it("21. does not infer radio unknown source", () => expect(radio({ materialSource: "unknown" })?.state).toBe("rights_review_required"));
  it("22. accepts explicit radio reuse license", () => expect(radio({ publicationScope: "comun_audio_and_reuse", reusePermission: "licensed_reuse", licenseCode: "cc_by_sa_4_0" })?.state).toBe("rights_declared"));
  it("23. identifies public scope separately from reuse", () => { expect(hasExplicitPublicScope("comun_display")).toBe(true); expect(hasExplicitReuseScope("comun_display")).toBe(false); });
  it("24. does not promise publication in the A4 photo UI", () => expect(read("app/comun/acervo/contribuir/photo-submission-form.tsx")).toMatch(/Guardar não autoriza publicação/));
  it("25. keeps Music out of the A4 cultural selector", () => expect(read("app/comun/acervo/contribuir/cultural-intake-form.tsx")).not.toMatch(/value=\"music\"/));
  it("26. keeps the A4 flag opt-in", () => expect(read("lib/comun-cultural-progressive-rights.ts")).toMatch(/=== \"enabled\"/));
  it("27. keeps target IDs out of public A4 UI", () => expect(read("app/comun/acervo/contribuir/cultural-intake-form.tsx")).not.toMatch(/targetId/));
  it("28. keeps Oral History pre-recording consent separate", () => expect(read("app/comun/acervo/historias-orais/contribuir/page.tsx")).toMatch(/não autoriza gravação/));
  it("29. keeps radio music rights separate", () => expect(read("app/comun/radio/contribuir/contribution-form.tsx")).toMatch(/não concede licença musical/));
  it("30. uses a forward-only additive migration", () => expect(read("supabase/migrations/20260819130000_comun_cultural_progressive_rights.sql")).not.toMatch(/backfill|seed|published_at\s*=\s*now/i));
});
