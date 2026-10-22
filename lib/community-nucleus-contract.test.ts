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
  state: "requested",
  requestedAt: "2026-10-22T17:05:00Z",
};
const review: NucleusReview = {
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
  communityMembershipState: "member",
  consent,
  request,
  review,
  enrollment,
  now,
};
const activeDecision = { allowed: true } as const;
const mandate: NucleusMandate = {
  id: "mandate-a",
  nucleusId: context.nucleusId,
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
    subjectUserId: context.userId,
    activeNucleusAccess: activeDecision,
    now,
  });
}

describe("SOC-D10.M7 — ingresso separado, consentido e revogável", () => {
  it("exige cadeia completa de consentimento e aprovação independente", () => {
    expect(access()).toEqual({ allowed: true });
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
        activeNucleusAccess: activeDecision,
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
          activeNucleusAccess: activeDecision,
          now,
        }),
      ).toBe("forbidden");
    }
  });

  it("bloqueia sucessão após perda do vínculo da candidata", () => {
    expect(
      evaluateSuccessionAcceptance({
        offer,
        authenticatedUserId: "user-b",
        nucleusId: context.nucleusId,
        activeNucleusAccess: {
          allowed: false,
          reason: "community_not_active",
        },
        now,
      }),
    ).toBe("forbidden");
  });
});
