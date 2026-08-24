import { describe, expect, it } from "vitest";
import { knownCurationBlockerCodes, humanizeCurationBlocker } from "./cultural-curation-copy";
import { projectCulturalCurationWorkItem, sortCulturalCurationWorklist } from "./cultural-curation-worklist";
import type { CulturalCurationReadiness } from "./cultural-curation-readiness";

function ready(overrides: Partial<CulturalCurationReadiness> = {}): CulturalCurationReadiness {
  return { specialization: "art", stage: "pending", readyForPrivateRootCreation: false, readyForExistingRootLink: false,
    readyForEditorialReview: false, readyForDraftMaterialization: false, publicationEligible: false,
    blockers: [], warnings: ["publication_requires_explicit_editorial_action"], requiredActions: [],
    evidence: { handoffComplete: true, materialReady: true, provenanceComplete: true, rightsReady: false,
      consentReady: true, safetyReady: true, assetReady: false, derivativeReady: true, editorialReady: false }, ...overrides };
}
function item(readiness: CulturalCurationReadiness, overrides: Record<string, unknown> = {}) {
  return projectCulturalCurationWorkItem({ sourceType: "artwork_submission", sourceId: "1", specialization: "art",
    title: "Mural", protocolOrLabel: "ARTE-1", createdAt: "2026-08-01T00:00:00Z", sourceStatus: "pending",
    attention: "normal", detailHref: "/arte/1", rootExists: false, readiness, ...overrides });
}

describe("cultural curation worklist", () => {
  it("maps incomplete photo material to information", () => expect(item(ready({ blockers: ["material_incomplete"] }), { specialization: "photo_or_document", sourceType: "archive_submission" })?.stage).toBe("needs_information"));
  it("maps editorial readiness to review, never publication", () => { const result=item(ready({ readyForEditorialReview: true })); expect(result?.stage).toBe("ready_for_review"); expect(result?.publicationEligible).toBe(false); });
  it("maps a sufficient new artwork to private draft", () => expect(item(ready({ readyForPrivateRootCreation: true }))?.stage).toBe("can_become_draft"));
  it("maps an existing artwork with missing rights to preparation", () => expect(item(ready({ blockers: ["rights_review_required"] }), { rootExists: true })?.stage).toBe("in_preparation"));
  it("routes artwork complements to an existing work", () => expect(item(ready({ blockers: ["artwork_existing_target_reconciliation_required"] }))?.stage).toBe("needs_routing"));
  it("allows an oral-history envelope to become a draft before final consent", () => expect(item(ready({ specialization: "oral_history", readyForPrivateRootCreation: true, blockers: ["review_only", "oral_history_recording_consent_missing"] }), { specialization: "oral_history", sourceType: "oral_history_suggestion" })?.stage).toBe("can_become_draft"));
  it("keeps an oral-history root without consent in preparation", () => expect(item(ready({ specialization: "oral_history", blockers: ["oral_history_recording_consent_missing"] }), { specialization: "oral_history", rootExists: true })?.stage).toBe("in_preparation"));
  it("allows an eligible radio program proposal to become a draft", () => expect(item(ready({ specialization: "radio", readyForPrivateRootCreation: true }), { specialization: "radio", sourceType: "radio_contribution" })?.stage).toBe("can_become_draft"));
  it.each(["radio_private_root_destination_required", "music_pipeline_required", "radio_existing_target_reconciliation_required"] as const)("routes radio blocker %s", (code) => expect(item(ready({ specialization: "radio", blockers: [code] }), { specialization: "radio", sourceType: "radio_contribution" })?.stage).toBe("needs_routing"));
  it("excludes terminal sources", () => expect(item(ready(), { sourceStatus: "archived" })).toBeNull());
  it("keeps older work first inside a priority group", () => { const newer=item(ready({ readyForPrivateRootCreation: true }), { sourceId: "new", createdAt: "2026-08-20T00:00:00Z" })!; const older=item(ready({ readyForPrivateRootCreation: true }), { sourceId: "old", createdAt: "2026-08-01T00:00:00Z" })!; expect(sortCulturalCurationWorklist([newer, older]).map(x=>x.sourceId)).toEqual(["old","new"]); });
});

describe("curation copy", () => {
  it("translates every known blocker without leaking its code", () => { for (const code of knownCurationBlockerCodes) { const value=humanizeCurationBlocker(code); expect(`${value.title} ${value.explanation} ${value.nextAction}`).not.toContain(code); } });
  it("has a safe human fallback", () => expect(humanizeCurationBlocker("future_code").title).toBe("Esta contribuição precisa de atenção"));
  it.each(["rights_review_required", "asset_not_ready", "private_root_source_ineligible"])("does not render raw code %s", (code) => expect(JSON.stringify(humanizeCurationBlocker(code))).not.toContain(code));
});
