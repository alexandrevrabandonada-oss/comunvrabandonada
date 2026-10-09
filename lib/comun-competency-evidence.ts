// Preview checkpoint: contract-only capability, no runtime activation.\nexport const COMUN_COMPETENCY_EVIDENCE_VERSION =
  "comun-competency-evidence-v0" as const;

export const COMUN_COMPETENCY_EVIDENCE_SOURCE_KINDS = [
  "learning_practice",
  "collective_task_result",
  "reviewed_artifact",
  "field_installation",
  "community_delivery",
] as const;

export type ComunCompetencyEvidenceSourceKind =
  (typeof COMUN_COMPETENCY_EVIDENCE_SOURCE_KINDS)[number];

export const COMUN_COMPETENCY_EVIDENCE_STATES = [
  "pending",
  "validated",
  "rejected",
] as const;

export type ComunCompetencyEvidenceState =
  (typeof COMUN_COMPETENCY_EVIDENCE_STATES)[number];

export const COMUN_COMPETENCY_CLAIM_STATES = [
  "proposed",
  "demonstrated",
  "review_due",
  "retired",
] as const;

export type ComunCompetencyClaimState =
  (typeof COMUN_COMPETENCY_CLAIM_STATES)[number];

export const COMUN_COMPETENCY_VISIBILITY = [
  "private",
  "public_opt_in",
] as const;

export type ComunCompetencyVisibility =
  (typeof COMUN_COMPETENCY_VISIBILITY)[number];

export type ComunCompetencyEvidence = {
  readonly id: string;
  readonly userId: string;
  readonly competencyId: string;
  readonly sourceKind: ComunCompetencyEvidenceSourceKind;
  readonly sourceId: string;
  readonly state: ComunCompetencyEvidenceState;
  readonly reviewedBy: string | null;
  readonly reviewedAt: string | null;
  readonly occurredAt: string;
};

export type ComunCompetencyClaim = {
  readonly id: string;
  readonly userId: string;
  readonly competencyId: string;
  readonly label: string;
  readonly scope: string;
  readonly state: ComunCompetencyClaimState;
  readonly visibility: ComunCompetencyVisibility;
  readonly allowMatching: boolean;
  readonly evidenceIds: readonly string[];
  readonly reviewedBy: string | null;
  readonly demonstratedAt: string | null;
  readonly reviewDueAt: string | null;
};

export type ComunPublicCompetency = {
  readonly competencyId: string;
  readonly label: string;
  readonly scope: string;
  readonly demonstratedAt: string;
};

export type ComunCompetencyFinding =
  | "claim_identity_missing"
  | "claim_scope_missing"
  | "claim_evidence_missing"
  | "evidence_not_found"
  | "evidence_wrong_subject"
  | "evidence_wrong_competency"
  | "demonstrated_without_validated_evidence"
  | "demonstrated_without_independent_review"
  | "public_without_demonstration"
  | "matching_without_demonstration"
  | "demonstrated_at_missing"
  | "review_due_before_demonstration";

function nonEmpty(value: string) {
  return value.trim().length > 0;
}

export function validateComunCompetencyClaim(
  claim: ComunCompetencyClaim,
  evidence: readonly ComunCompetencyEvidence[],
): ComunCompetencyFinding[] {
  const findings: ComunCompetencyFinding[] = [];

  if (!nonEmpty(claim.userId) || !nonEmpty(claim.competencyId))
    findings.push("claim_identity_missing");
  if (!nonEmpty(claim.label) || !nonEmpty(claim.scope))
    findings.push("claim_scope_missing");
  if (!claim.evidenceIds.length) findings.push("claim_evidence_missing");

  const byId = new Map(evidence.map((item) => [item.id, item] as const));
  const linked = claim.evidenceIds.flatMap((id) => {
    const item = byId.get(id);
    if (!item) {
      findings.push("evidence_not_found");
      return [];
    }
    if (item.userId !== claim.userId) findings.push("evidence_wrong_subject");
    if (item.competencyId !== claim.competencyId)
      findings.push("evidence_wrong_competency");
    return [item];
  });

  const validLinked = linked.filter(
    (item) =>
      item.userId === claim.userId &&
      item.competencyId === claim.competencyId &&
      item.state === "validated",
  );
  const hasIndependentReview = validLinked.some(
    (item) =>
      item.reviewedBy !== null &&
      item.reviewedBy !== claim.userId &&
      item.reviewedAt !== null,
  );

  if (claim.state === "demonstrated") {
    if (!validLinked.length)
      findings.push("demonstrated_without_validated_evidence");
    if (!hasIndependentReview)
      findings.push("demonstrated_without_independent_review");
    if (!claim.demonstratedAt) findings.push("demonstrated_at_missing");
  }

  if (claim.visibility === "public_opt_in" && claim.state !== "demonstrated")
    findings.push("public_without_demonstration");

  if (claim.allowMatching && claim.state !== "demonstrated")
    findings.push("matching_without_demonstration");

  if (claim.state === "review_due" && !claim.demonstratedAt)
    findings.push("review_due_before_demonstration");

  return Array.from(new Set(findings));
}

export function projectPublicComunCompetency(
  claim: ComunCompetencyClaim,
  evidence: readonly ComunCompetencyEvidence[],
): ComunPublicCompetency | null {
  if (
    claim.visibility !== "public_opt_in" ||
    claim.state !== "demonstrated" ||
    validateComunCompetencyClaim(claim, evidence).length > 0 ||
    !claim.demonstratedAt
  )
    return null;

  return {
    competencyId: claim.competencyId,
    label: claim.label,
    scope: claim.scope,
    demonstratedAt: claim.demonstratedAt,
  };
}

export function isComunCompetencyEligibleForMatching(
  claim: ComunCompetencyClaim,
  evidence: readonly ComunCompetencyEvidence[],
  now = new Date(),
) {
  if (
    claim.state !== "demonstrated" ||
    !claim.allowMatching ||
    validateComunCompetencyClaim(claim, evidence).length > 0
  )
    return false;

  if (!claim.reviewDueAt) return true;
  const due = new Date(claim.reviewDueAt);
  return Number.isFinite(due.getTime()) && due.getTime() > now.getTime();
}
