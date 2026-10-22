/**
 * SOC-D10.M7: pure, non-persistent contract for a voluntary nucleus.
 * This does not grant access, write a membership or publish affiliation.
 */
export const NUCLEUS_CONSENT_SCOPE = "nucleus_membership" as const;
export const NUCLEUS_CONSENT_VERSION = "comun-nucleus-opt-in-v1" as const;
export const NUCLEUS_CONSENT_NOTICE = [
  "O ingresso neste núcleo é voluntário e separado de acompanhar ou integrar uma comunidade.",
  "O núcleo pode envolver responsabilidades e informações reservadas; suas regras e finalidade devem ser apresentadas antes do aceite.",
  "Participar, facilitar, concluir atividades ou estudar não produz ingresso automático.",
  "Você pode pausar ou sair sem transferir tarefas, mandato ou informações privadas automaticamente.",
  "O registro mínimo do consentimento e da revogação é privado e sujeito a revisão humana de finalidade, necessidade e segurança.",
] as const;
/** SHA-256 of the newline-joined notice, to bind later consent evidence. */
export const NUCLEUS_CONSENT_NOTICE_SHA256 =
  "45f1246b387ba5e1ecf7232cb495ca90d6b82f7c2452f852f1fc4a3b5659b671" as const;

export type NucleusContext = {
  nucleusId: string;
  communityId: string;
  userId: string;
};

export type NucleusConsent = NucleusContext & {
  scope: typeof NUCLEUS_CONSENT_SCOPE;
  noticeVersion: typeof NUCLEUS_CONSENT_VERSION;
  noticeSha256: string;
  affirmative: boolean;
  affirmedAt: string;
  withdrawnAt: string | null;
};

export type NucleusRequest = NucleusContext & {
  id: string;
  state: "requested" | "withdrawn" | "rejected";
  requestedAt: string;
};

export type NucleusReview = {
  requestId: string;
  reviewerUserId: string;
  decision: "approved" | "rejected";
  decidedAt: string;
  revokedAt: string | null;
};

export type NucleusEnrollment = NucleusContext & {
  requestId: string;
  state: "active" | "paused" | "left" | "revoked";
  activatedAt: string;
};

export type NucleusAccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "wrong_identity_or_scope"
        | "community_not_active"
        | "consent_missing_or_withdrawn"
        | "request_not_open"
        | "independent_approval_missing"
        | "enrollment_not_active";
    };

function timestamp(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value))
    return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function sameContext(
  expected: NucleusContext,
  actual: NucleusContext | null | undefined,
): boolean {
  return Boolean(
    expected.userId &&
      expected.nucleusId &&
      expected.communityId &&
      actual &&
      actual.userId === expected.userId &&
      actual.nucleusId === expected.nucleusId &&
      actual.communityId === expected.communityId,
  );
}

/** Classifies evidence only; never replaces a server identity check or RLS. */
export function evaluateNucleusAccess(input: {
  context: NucleusContext;
  authenticatedUserId: string;
  communityMembershipState: string | null;
  consent: NucleusConsent | null;
  request: NucleusRequest | null;
  review: NucleusReview | null;
  enrollment: NucleusEnrollment | null;
  now: string;
}): NucleusAccessDecision {
  const { context, consent, request, review, enrollment } = input;
  const now = timestamp(input.now);
  if (
    !now ||
    !sameContext(context, context) ||
    input.authenticatedUserId !== context.userId ||
    (consent && !sameContext(context, consent)) ||
    (request && !sameContext(context, request)) ||
    (enrollment && !sameContext(context, enrollment))
  )
    return { allowed: false, reason: "wrong_identity_or_scope" };

  if (input.communityMembershipState !== "member")
    return { allowed: false, reason: "community_not_active" };

  const consentAt = timestamp(consent?.affirmedAt);
  if (
    !consent ||
    consent.scope !== NUCLEUS_CONSENT_SCOPE ||
    consent.noticeVersion !== NUCLEUS_CONSENT_VERSION ||
    consent.noticeSha256 !== NUCLEUS_CONSENT_NOTICE_SHA256 ||
    consent.affirmative !== true ||
    !consentAt ||
    consentAt > now ||
    consent.withdrawnAt !== null
  )
    return { allowed: false, reason: "consent_missing_or_withdrawn" };

  const requestedAt = timestamp(request?.requestedAt);
  if (
    !request?.id ||
    request.state !== "requested" ||
    !requestedAt ||
    requestedAt > now
  )
    return { allowed: false, reason: "request_not_open" };

  const reviewedAt = timestamp(review?.decidedAt);
  if (
    !review ||
    review.requestId !== request.id ||
    !review.reviewerUserId ||
    review.reviewerUserId === context.userId ||
    review.decision !== "approved" ||
    review.revokedAt !== null ||
    !reviewedAt ||
    reviewedAt < requestedAt ||
    reviewedAt < consentAt ||
    reviewedAt > now
  )
    return { allowed: false, reason: "independent_approval_missing" };

  const activatedAt = timestamp(enrollment?.activatedAt);
  if (
    !enrollment ||
    enrollment.requestId !== request.id ||
    enrollment.state !== "active" ||
    !activatedAt ||
    activatedAt < reviewedAt ||
    activatedAt > now
  )
    return { allowed: false, reason: "enrollment_not_active" };

  return { allowed: true };
}

export type NucleusMandate = {
  id: string;
  nucleusId: string;
  assigneeUserId: string;
  role: string;
  state: "offered" | "active" | "completed" | "revoked";
  offeredAt: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  startsAt: string;
  endsAt: string;
  revokedAt: string | null;
};

/** A nucleus mandate is distinct from any community coordinator role. */
export function hasAcceptedNucleusMandate(input: {
  mandate: NucleusMandate | null;
  nucleusId: string;
  subjectUserId: string;
  activeNucleusAccess: NucleusAccessDecision;
  now: string;
}): boolean {
  const { mandate } = input;
  const now = timestamp(input.now);
  if (!mandate || !now || !input.activeNucleusAccess.allowed) return false;
  const offered = timestamp(mandate.offeredAt);
  const accepted = timestamp(mandate.acceptedAt);
  const starts = timestamp(mandate.startsAt);
  const ends = timestamp(mandate.endsAt);
  return Boolean(
    mandate.id &&
      mandate.role &&
      mandate.nucleusId === input.nucleusId &&
      mandate.assigneeUserId === input.subjectUserId &&
      mandate.acceptedByUserId === input.subjectUserId &&
      mandate.state === "active" &&
      mandate.revokedAt === null &&
      offered &&
      accepted &&
      starts &&
      ends &&
      offered <= accepted &&
      accepted <= now &&
      starts <= now &&
      now < ends &&
      starts < ends,
  );
}

export type NucleusSuccessionOffer = {
  nucleusId: string;
  outgoingMandateId: string;
  candidateUserId: string;
  proposedByUserId: string;
  state: "offered" | "accepted" | "declined" | "cancelled";
  offeredAt: string;
  acceptedAt: string | null;
  expiresAt: string;
};

/**
 * Only proposes a separately accepted succession for human review.
 * It never transfers a mandate or private context by itself.
 */
export function evaluateSuccessionAcceptance(input: {
  offer: NucleusSuccessionOffer | null;
  authenticatedUserId: string;
  nucleusId: string;
  activeNucleusAccess: NucleusAccessDecision;
  now: string;
}): "ready_for_review" | "forbidden" {
  const { offer } = input;
  const now = timestamp(input.now);
  const offered = timestamp(offer?.offeredAt);
  const expires = timestamp(offer?.expiresAt);
  if (
    !offer ||
    !input.activeNucleusAccess.allowed ||
    !now ||
    !offered ||
    !expires ||
    offered > now ||
    now >= expires ||
    offer.nucleusId !== input.nucleusId ||
    offer.candidateUserId !== input.authenticatedUserId ||
    offer.proposedByUserId === input.authenticatedUserId ||
    !offer.proposedByUserId ||
    !offer.outgoingMandateId ||
    offer.state !== "offered" ||
    offer.acceptedAt !== null
  )
    return "forbidden";
  return "ready_for_review";
}

/** Political/social affiliation is never inferred or public by default. */
export function nucleusAffiliationCanAppearInPublicProfile() {
  return false as const;
}

/** A successor's acceptance cannot transfer a mandate or task by itself. */
export function successionOfferCanTransferMandate() {
  return false as const;
}
