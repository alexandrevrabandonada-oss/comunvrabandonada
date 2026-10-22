/**
 * SOC-D10.M7.B — an executable, fail-closed READ design contract only.
 * This is NOT a database authorization layer, RLS policy or user session.
 * A future service must independently validate identity, scope and RLS.
 */
export type NucleusPrivateReadResource =
  | "own_consent_receipt"
  | "own_request_status"
  | "own_enrollment_history"
  | "own_mandate_history"
  | "own_succession_offer"
  | "review_request_summary"
  | "member_roster"
  | "private_memory"
  | "public_affiliation";

export type VerifiedNucleusReviewer = {
  userId: string;
  nucleusId: string;
  communityId: string;
  active: boolean;
  evidenceVerifiedAt: string;
  requestId: string;
  subjectUserId: string;
  startsAt: string;
  endsAt: string;
  revokedAt: string | null;
};

export function canReadNucleusPrivateRecord(input: {
  sessionVerified: boolean;
  now: string;
  requestId: string | null;
  actorUserId: string;
  subjectUserId: string;
  nucleusId: string;
  communityId: string;
  recordNucleusId: string;
  recordCommunityId: string;
  resource: NucleusPrivateReadResource;
  reviewer: VerifiedNucleusReviewer | null;
}): boolean {
  const {
    sessionVerified,
    actorUserId,
    subjectUserId,
    nucleusId,
    communityId,
    recordNucleusId,
    recordCommunityId,
    resource,
    reviewer,
  } = input;
  if (
    !sessionVerified ||
    !actorUserId ||
    !subjectUserId ||
    !nucleusId ||
    !communityId ||
    nucleusId !== recordNucleusId ||
    communityId !== recordCommunityId
  )
    return false;

  if (resource === "public_affiliation") return false;
  if (resource === "member_roster") return false;
  if (resource === "private_memory") return false;

  if (resource === "review_request_summary") {
    const now = Date.parse(input.now);
    const verified = Date.parse(reviewer?.evidenceVerifiedAt ?? "");
    const starts = Date.parse(reviewer?.startsAt ?? "");
    const ends = Date.parse(reviewer?.endsAt ?? "");
    return Boolean(
      Number.isFinite(now) &&
      Number.isFinite(verified) &&
      verified === now &&
      Number.isFinite(starts) &&
      Number.isFinite(ends) &&
      starts <= now &&
      now < ends &&
      reviewer?.revokedAt === null &&
      input.requestId &&
      reviewer.requestId === input.requestId &&
      reviewer.subjectUserId === subjectUserId &&
      actorUserId !== subjectUserId &&
      reviewer?.active === true &&
      reviewer.userId === actorUserId &&
      reviewer.nucleusId === nucleusId &&
      reviewer.communityId === communityId &&
      Number.isFinite(Date.parse(reviewer.evidenceVerifiedAt)),
    );
  }

  // Signed-in individuals retain access to their own minimum receipts even
  // after pausing or leaving. No nucleus role or active enrollment inferred.
  return (
    [
      "own_consent_receipt",
      "own_request_status",
      "own_enrollment_history",
      "own_mandate_history",
      "own_succession_offer",
    ].includes(resource) && actorUserId === subjectUserId
  );
}

/** A read decision never confers mutations, enrollment, office or publication. */
export function readDecisionCanGrantNucleusMembership() {
  return false as const;
}
export function readDecisionCanPublishNucleusAffiliation() {
  return false as const;
}
export function successionAcceptanceCanAutoTransferPrivateHistory() {
  return false as const;
}
