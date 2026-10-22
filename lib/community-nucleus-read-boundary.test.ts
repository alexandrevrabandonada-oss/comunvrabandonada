import { describe, expect, it } from "vitest";
import {
  canReadNucleusPrivateRecord,
  readDecisionCanGrantNucleusMembership,
  readDecisionCanPublishNucleusAffiliation,
  successionAcceptanceCanAutoTransferPrivateHistory,
  type NucleusPrivateReadResource,
} from "./community-nucleus-read-boundary";

const base = {
  sessionVerified: true,
  now: "2026-10-22T18:00:00Z",
  requestId: "request-a",
  actorUserId: "user-a",
  subjectUserId: "user-a",
  nucleusId: "nucleus-a",
  communityId: "community-a",
  recordNucleusId: "nucleus-a",
  recordCommunityId: "community-a",
  resource: "own_consent_receipt" as NucleusPrivateReadResource,
  reviewer: null,
};

describe("SOC-D10.M7.B — private read boundary (design only)", () => {
  it("lets a signed-in individual read only their own minimal receipts", () => {
    for (const resource of [
      "own_consent_receipt",
      "own_request_status",
      "own_enrollment_history",
      "own_mandate_history",
      "own_succession_offer",
    ] as const) {
      expect(canReadNucleusPrivateRecord({ ...base, resource })).toBe(true);
      expect(
        canReadNucleusPrivateRecord({
          ...base,
          resource,
          actorUserId: "user-b",
        }),
      ).toBe(false);
    }
  });

  it("denies unverified identity, missing identity and cross-scope data", () => {
    expect(
      canReadNucleusPrivateRecord({ ...base, sessionVerified: false }),
    ).toBe(false);
    expect(canReadNucleusPrivateRecord({ ...base, actorUserId: "" })).toBe(
      false,
    );
    expect(
      canReadNucleusPrivateRecord({
        ...base,
        recordNucleusId: "nucleus-b",
      }),
    ).toBe(false);
    expect(
      canReadNucleusPrivateRecord({
        ...base,
        recordCommunityId: "community-b",
      }),
    ).toBe(false);
  });

  it("never infers public membership lists or access to private memory", () => {
    for (const resource of [
      "member_roster",
      "private_memory",
      "public_affiliation",
    ] as const) {
      expect(canReadNucleusPrivateRecord({ ...base, resource })).toBe(false);
    }
    expect(readDecisionCanGrantNucleusMembership()).toBe(false);
    expect(readDecisionCanPublishNucleusAffiliation()).toBe(false);
    expect(successionAcceptanceCanAutoTransferPrivateHistory()).toBe(false);
  });

  it("requires explicit independent reviewer evidence for a summary", () => {
    const reviewer = {
      userId: "reviewer-b",
      nucleusId: base.nucleusId,
      communityId: base.communityId,
      active: true,
      evidenceVerifiedAt: "2026-10-22T18:00:00Z",
      requestId: base.requestId,
      subjectUserId: base.subjectUserId,
      startsAt: "2026-10-22T17:00:00Z",
      endsAt: "2026-10-23T18:00:00Z",
      revokedAt: null,
    };
    expect(
      canReadNucleusPrivateRecord({
        ...base,
        resource: "review_request_summary",
        actorUserId: reviewer.userId,
        reviewer,
      }),
    ).toBe(true);
    expect(
      canReadNucleusPrivateRecord({
        ...base,
        resource: "review_request_summary",
      }),
    ).toBe(false);
    expect(
      canReadNucleusPrivateRecord({
        ...base,
        resource: "review_request_summary",
        reviewer: { ...reviewer, userId: base.actorUserId },
      }),
    ).toBe(false);
  });

  it("refuses stale, alien or cross-community reviewer evidence", () => {
    const reviewer = {
      userId: "reviewer-b",
      nucleusId: base.nucleusId,
      communityId: base.communityId,
      active: true,
      evidenceVerifiedAt: "2026-10-22T18:00:00Z",
      requestId: base.requestId,
      subjectUserId: base.subjectUserId,
      startsAt: "2026-10-22T17:00:00Z",
      endsAt: "2026-10-23T18:00:00Z",
      revokedAt: null,
    };
    const asReviewer = {
      ...base,
      resource: "review_request_summary" as const,
      actorUserId: "reviewer-b",
      reviewer,
    };
    for (const invalid of [
      { ...reviewer, active: false },
      { ...reviewer, requestId: "other" },
      { ...reviewer, subjectUserId: "other" },
      { ...reviewer, evidenceVerifiedAt: "2026-10-22T18:00:01Z" },
      { ...reviewer, evidenceVerifiedAt: "2026-10-22T17:58:59Z" },
      { ...reviewer, endsAt: base.now },
      { ...reviewer, revokedAt: base.now },
      { ...reviewer, userId: "reviewer-c" },
      { ...reviewer, nucleusId: "nucleus-b" },
      { ...reviewer, communityId: "community-b" },
      { ...reviewer, evidenceVerifiedAt: "invalid" },
    ]) {
      expect(
        canReadNucleusPrivateRecord({ ...asReviewer, reviewer: invalid }),
      ).toBe(false);
    }
  });
});
