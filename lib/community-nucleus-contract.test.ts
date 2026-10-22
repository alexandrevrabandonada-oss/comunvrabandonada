import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  NUCLEUS_CONSENT_NOTICE,
  NUCLEUS_CONSENT_NOTICE_SHA256,
  NUCLEUS_CONSENT_SCOPE,
  NUCLEUS_CONSENT_VERSION,
  evaluateNucleusAccess,
  evaluateSuccessionAcceptance,
  hasAcceptedNucleusMandate,
  nucleusAffiliationCanAppearInPublicProfile,
  successionOfferCanTransferMandate,
  type NucleusConsent,
  type NucleusEnrollment,
  type NucleusMandate,
  type NucleusRequest,
  type NucleusReview,
  type NucleusSuccessionOffer,
} from "./community-nucleus-contract";

const now = "2026-10-22T20:00:00Z";
const context = {
  nucleusId: "nucleus-a",
  communityId: "community-a",
  userId: "user-a",
};
const consent: NucleusConsent = {
  ...context,
  id: "consent-a",
  rulesVersion: "rules-v1",
  purposeSha256: "a".repeat(64),
  scope: NUCLEUS_CONSENT_SCOPE,
  noticeVersion: NUCLEUS_CONSENT_VERSION,
  noticeSha256: NUCLEUS_CONSENT_NOTICE_SHA256,
  affirmative: true,
  affirmedAt: "2026-10-22T17:00:00Z",
  withdrawnAt: null,
};
const request: NucleusRequest = {
  ...context,
  id: "request-a",
  consentId: consent.id,
  state: "requested",
  requestedAt: "2026-10-22T17:05:00Z",
};
const authority = {
  ...context,
  id: "authority-a",
  requestId: request.id,
  reviewerUserId: "reviewer-b",
  startsAt: "2026-10-22T17:30:00Z",
  endsAt: "2026-10-23T00:00:00Z",
  revokedAt: null,
};
const review: NucleusReview = {
  ...context,
  authorizationId: authority.id,
  requestId: request.id,
  reviewerUserId: "reviewer-b",
  decision: "approved",
  decidedAt: "2026-10-22T18:00:00Z",
  revokedAt: null,
};
const enrollment: NucleusEnrollment = {
  ...context,
  requestId: request.id,
  state: "active",
  activatedAt: "2026-10-22T18:05:00Z",
};
const activeInput: Parameters<typeof evaluateNucleusAccess>[0] = {
  context,
  authenticatedUserId: context.userId,
  profileState: "active",
  rulesVersion: consent.rulesVersion,
  purposeSha256: consent.purposeSha256,
  communityMembershipState: "member",
  consent,
  request,
  review,
  reviewAuthorization: authority,
  enrollment,
  now,
};
const activeDecision = { allowed: true, ...context } as const;
const candidateDecision = {
  allowed: true,
  ...context,
  userId: "user-b",
} as const;
const mandate: NucleusMandate = {
  id: "mandate-a",
  nucleusId: context.nucleusId,
  communityId: context.communityId,
  assigneeUserId: context.userId,
  role: "facilitation",
  state: "active",
  offeredAt: "2026-10-22T18:10:00Z",
  acceptedAt: "2026-10-22T18:30:00Z",
  acceptedByUserId: context.userId,
  startsAt: "2026-10-22T18:15:00Z",
  endsAt: "2026-11-22T18:15:00Z",
  revokedAt: null,
};
const offer: NucleusSuccessionOffer = {
  nucleusId: context.nucleusId,
  communityId: context.communityId,
  outgoingMandateId: mandate.id,
  candidateUserId: "user-b",
  proposedByUserId: context.userId,
  state: "offered",
  offeredAt: "2026-10-22T18:30:00Z",
  acceptedAt: null,
  expiresAt: "2026-10-25T20:00:00Z",
};

function access(overrides: Partial<typeof activeInput> = {}) {
  return evaluateNucleusAccess({ ...activeInput, ...overrides });
}

function withMandate(overrides: Partial<NucleusMandate> = {}) {
  return hasAcceptedNucleusMandate({
    mandate: { ...mandate, ...overrides },
    nucleusId: context.nucleusId,
    communityId: context.communityId,
    subjectUserId: context.userId,
    activeNucleusAccess: activeDecision,
    now,
  });
}

describe("SOC-D10.M7 — ingresso separado, consentido e revogável", () => {
  it("exige cadeia completa de consentimento e aprovação independente", () => {
    expect(access()).toEqual({ allowed: true, ...context });
  });

  it("não infere ingresso de acompanhamento, pausa, saída ou suspensão", () => {
    for (const state of ["following", "paused", "left", "suspended", null]) {
      expect(access({ communityMembershipState: state })).toEqual({
        allowed: false,
        reason: "community_not_active",
      });
    }
  });

  it("isola identidade e comunidade com consentimento preexistente", () => {
    expect(access({ authenticatedUserId: "user-b" })).toMatchObject({
      allowed: false,
      reason: "wrong_identity_or_scope",
    });
    expect(
      access({ consent: { ...consent, communityId: "community-b" } }),
    ).toMatchObject({ allowed: false, reason: "wrong_identity_or_scope" });
    expect(
      access({ enrollment: { ...enrollment, nucleusId: "nucleus-b" } }),
    ).toMatchObject({ allowed: false, reason: "wrong_identity_or_scope" });
  });

  it("exige declaração afirmativa específica, texto e digest válidos", () => {
    for (const replacement of [
      null,
      { ...consent, affirmative: false },
      { ...consent, noticeSha256: "invalid" },
      {
        ...consent,
        noticeVersion: "outdated" as typeof consent.noticeVersion,
      },
      { ...consent, scope: "community" as typeof consent.scope },
      { ...consent, withdrawnAt: "2026-10-22T19:00:00Z" },
      { ...consent, affirmedAt: "2026-10-23T19:00:00Z" },
    ]) {
      expect(access({ consent: replacement })).toMatchObject({
        allowed: false,
        reason: "consent_missing_or_withdrawn",
      });
    }
  });

  it("não transforma solicitação cancelada em vínculo", () => {
    for (const replacement of [
      null,
      { ...request, state: "withdrawn" as const },
      { ...request, state: "rejected" as const },
      { ...request, requestedAt: "2026-10-23T00:00:00Z" },
    ]) {
      expect(access({ request: replacement })).toMatchObject({
        allowed: false,
        reason: "request_not_open",
      });
    }
  });

  it("nega autoaprovação, decisão incorreta, revogação e aceite retroativo", () => {
    for (const replacement of [
      null,
      { ...review, reviewerUserId: context.userId },
      { ...review, requestId: "someone-else" },
      { ...review, decision: "rejected" as const },
      { ...review, revokedAt: "2026-10-22T19:00:00Z" },
      { ...review, decidedAt: "2026-10-22T16:00:00Z" },
    ]) {
      expect(access({ review: replacement })).toMatchObject({
        allowed: false,
        reason: "independent_approval_missing",
      });
    }
  });

  it("impede retomada silenciosa após pausa, saída ou revogação", () => {
    for (const state of ["paused", "left", "revoked"] as const) {
      expect(access({ enrollment: { ...enrollment, state } })).toMatchObject({
        allowed: false,
        reason: "enrollment_not_active",
      });
    }
    expect(
      access({ enrollment: { ...enrollment, requestId: "old-request" } }),
    ).toMatchObject({ allowed: false, reason: "enrollment_not_active" });
  });

  it("recusa relógio inválido e ativação anterior à aprovação", () => {
    expect(access({ now: "not-a-date" }).allowed).toBe(false);
    expect(
      access({
        enrollment: {
          ...enrollment,
          activatedAt: "2026-10-22T17:00:00Z",
        },
      }),
    ).toMatchObject({ allowed: false, reason: "enrollment_not_active" });
  });

  it("não publica filiação por inferência", () => {
    expect(NUCLEUS_CONSENT_NOTICE).toHaveLength(5);
    expect(NUCLEUS_CONSENT_NOTICE_SHA256).toMatch(/^[a-f0-9]{64}$/);
    expect(nucleusAffiliationCanAppearInPublicProfile()).toBe(false);
  });
});

describe("SOC-D10.M7 — mandato aceito e sucessão sem transferência", () => {
  it("reconhece apenas mandato pessoal aceito e vigente", () => {
    expect(withMandate()).toBe(true);
  });

  it("não promove convite, aceite alheio ou mandato de outro núcleo", () => {
    expect(withMandate({ state: "offered" })).toBe(false);
    expect(withMandate({ acceptedAt: null })).toBe(false);
    expect(withMandate({ acceptedByUserId: "user-b" })).toBe(false);
    expect(withMandate({ nucleusId: "nucleus-b" })).toBe(false);
    expect(withMandate({ assigneeUserId: "user-b" })).toBe(false);
  });

  it("nega mandato revogado, futuro, expirado ou aceite antecipado", () => {
    expect(withMandate({ state: "revoked" })).toBe(false);
    expect(withMandate({ state: "completed" })).toBe(false);
    expect(withMandate({ revokedAt: now })).toBe(false);
    expect(withMandate({ startsAt: "2026-10-23T18:15:00Z" })).toBe(false);
    expect(withMandate({ endsAt: now })).toBe(false);
    expect(withMandate({ acceptedAt: "2026-10-22T18:00:00Z" })).toBe(false);
  });

  it("revogação do vínculo também encerra elegibilidade para o mandato", () => {
    expect(
      hasAcceptedNucleusMandate({
        mandate,
        nucleusId: context.nucleusId,
        communityId: context.communityId,
        subjectUserId: context.userId,
        activeNucleusAccess: {
          allowed: false,
          reason: "enrollment_not_active",
        },
        now,
      }),
    ).toBe(false);
  });

  it("recebe aceite de suplência somente da candidata, para revisão", () => {
    expect(
      evaluateSuccessionAcceptance({
        offer,
        authenticatedUserId: "user-b",
        nucleusId: context.nucleusId,
        communityId: context.communityId,
        activeNucleusAccess: candidateDecision,
        now,
      }),
    ).toBe("ready_for_review");
    expect(successionOfferCanTransferMandate()).toBe(false);
  });

  it("não aceita proposta alheia, autoindicação, expiração ou cancelamento", () => {
    for (const replacement of [
      { ...offer, candidateUserId: "user-c" },
      { ...offer, proposedByUserId: "user-b" },
      { ...offer, state: "accepted" as const },
      { ...offer, state: "cancelled" as const },
      { ...offer, expiresAt: now },
      { ...offer, acceptedAt: "2026-10-22T19:00:00Z" },
    ]) {
      expect(
        evaluateSuccessionAcceptance({
          offer: replacement,
          authenticatedUserId: "user-b",
          nucleusId: context.nucleusId,
          communityId: context.communityId,
          activeNucleusAccess: candidateDecision,
          now,
        }),
      ).toBe("forbidden");
    }
  });

  it("não reutiliza autorização de outra pessoa ou núcleo", () => {
    expect(
      evaluateSuccessionAcceptance({
        offer,
        authenticatedUserId: "user-b",
        nucleusId: context.nucleusId,
        communityId: context.communityId,
        activeNucleusAccess: activeDecision,
        now,
      }),
    ).toBe("forbidden");
    expect(
      hasAcceptedNucleusMandate({
        mandate,
        nucleusId: context.nucleusId,
        communityId: context.communityId,
        subjectUserId: context.userId,
        activeNucleusAccess: candidateDecision,
        now,
      }),
    ).toBe(false);
  });

  it("bloqueia sucessão após perda do vínculo da candidata", () => {
    expect(
      evaluateSuccessionAcceptance({
        offer,
        authenticatedUserId: "user-b",
        nucleusId: context.nucleusId,
        communityId: context.communityId,
        activeNucleusAccess: {
          allowed: false,
          reason: "community_not_active",
        },
        now,
      }),
    ).toBe("forbidden");
  });
});

describe("M7 consent and scope regressions", () => {
  it("does not authorize an inactive or suspended profile", () => {
    for (const profileState of ["suspended", "deleted", null])
      expect(access({ profileState })).toEqual({
        allowed: false,
        reason: "profile_not_active",
      });
  });
  it("keeps mandate and succession bounds consistent with the SQL proposal", () => {
    expect(withMandate({ startsAt: "2026-10-22T18:00:00Z" })).toBe(false);
    expect(withMandate({ endsAt: "2027-10-22T18:00:00Z" })).toBe(false);
    expect(
      evaluateSuccessionAcceptance({
        offer: { ...offer, expiresAt: "2027-10-22T18:00:00Z" },
        authenticatedUserId: "user-b",
        nucleusId: context.nucleusId,
        communityId: context.communityId,
        activeNucleusAccess: candidateDecision,
        now,
      }),
    ).toBe("forbidden");
  });
  it("hashes the exact UTF-8 notice, LF joined without trailing LF", () => {
    expect(
      createHash("sha256")
        .update(NUCLEUS_CONSENT_NOTICE.join("\n"), "utf8")
        .digest("hex"),
    ).toBe(NUCLEUS_CONSENT_NOTICE_SHA256);
  });
  it("rejects another consent, pre-consent requests and invalid dates", () => {
    expect(access({ rulesVersion: "changed" }).allowed).toBe(false);
    expect(access({ purposeSha256: "b".repeat(64) }).allowed).toBe(false);
    expect(access({ request: { ...request, consentId: "old" } }).allowed).toBe(
      false,
    );
    expect(
      access({ request: { ...request, requestedAt: "2026-10-22T16:00:00Z" } })
        .allowed,
    ).toBe(false);
    expect(access({ now: "2026-02-30T20:00:00Z" }).allowed).toBe(false);
  });
  it("requires scoped independent reviewer authority at decision time", () => {
    for (const a of [
      null,
      { ...authority, requestId: "other" },
      { ...authority, userId: "user-b" },
      { ...authority, communityId: "other" },
      { ...authority, reviewerUserId: context.userId },
      { ...authority, endsAt: review.decidedAt },
      { ...authority, revokedAt: review.decidedAt },
    ])
      expect(access({ reviewAuthorization: a }).allowed).toBe(false);
  });
  it("rejects cross-community mandates and succession", () => {
    expect(withMandate({ communityId: "other" })).toBe(false);
    expect(
      evaluateSuccessionAcceptance({
        offer: { ...offer, communityId: "other" },
        authenticatedUserId: "user-b",
        nucleusId: context.nucleusId,
        communityId: context.communityId,
        activeNucleusAccess: candidateDecision,
        now,
      }),
    ).toBe("forbidden");
  });
});
