import type {
  ComunCompetencyClaim,
  ComunCompetencyEvidence,
} from "./comun-competency-evidence";
import { validateComunCompetencyClaim } from "./comun-competency-evidence";
import type { ComunFactoryRiskClass } from "./comun-factory-pilot-contract";

export const COMUN_FACTORY_MACHINE_AUTHORIZATION_VERSION =
  "comun-factory-machine-authorization-v0" as const;

export const COMUN_FACTORY_MACHINE_CAPABILITIES = [
  "fdm_basic",
  "electronics_low_voltage",
  "hand_tools_basic",
] as const;

export type ComunFactoryMachineCapability =
  (typeof COMUN_FACTORY_MACHINE_CAPABILITIES)[number];

export const COMUN_FACTORY_MACHINE_AUTHORIZATION_LEVELS = [
  "observer",
  "supervised",
  "independent",
  "maintainer",
] as const;

export type ComunFactoryMachineAuthorizationLevel =
  (typeof COMUN_FACTORY_MACHINE_AUTHORIZATION_LEVELS)[number];

export type ComunFactoryMachineAuthorization = {
  readonly id: string;
  readonly userId: string;
  readonly capability: ComunFactoryMachineCapability;
  readonly level: ComunFactoryMachineAuthorizationLevel;
  readonly grantedBy: string;
  readonly grantedAt: string;
  readonly expiresAt: string | null;
  readonly revokedAt: string | null;
  readonly safetyBriefingRef: string;
  readonly competencyClaimIds: readonly string[];
};

export type ComunFactoryMachineUseDecision = {
  readonly allowed: boolean;
  readonly mode: "observe" | "supervised" | "independent" | "blocked";
  readonly reasons: readonly (
    | "authorization_missing"
    | "authorization_revoked"
    | "authorization_expired"
    | "safety_briefing_missing"
    | "competency_not_demonstrated"
    | "qualified_oversight_required"
    | "critical_case_blocked"
  )[];
};

const LEVEL_ORDER: Record<ComunFactoryMachineAuthorizationLevel, number> = {
  observer: 0,
  supervised: 1,
  independent: 2,
  maintainer: 3,
};

function validDemonstratedClaims(input: {
  userId: string;
  claimIds: readonly string[];
  claims: readonly ComunCompetencyClaim[];
  evidence: readonly ComunCompetencyEvidence[];
}) {
  const claimsById = new Map(input.claims.map((claim) => [claim.id, claim]));
  return input.claimIds.every((id) => {
    const claim = claimsById.get(id);
    return (
      Boolean(claim) &&
      claim!.userId === input.userId &&
      claim!.state === "demonstrated" &&
      validateComunCompetencyClaim(claim!, input.evidence).length === 0
    );
  });
}

export function evaluateComunFactoryMachineUse(input: {
  readonly userId: string;
  readonly capability: ComunFactoryMachineCapability;
  readonly riskClass: ComunFactoryRiskClass;
  readonly authorization: ComunFactoryMachineAuthorization | null;
  readonly claims: readonly ComunCompetencyClaim[];
  readonly evidence: readonly ComunCompetencyEvidence[];
  readonly qualifiedOversightPresent: boolean;
  readonly now?: Date;
}): ComunFactoryMachineUseDecision {
  const now = input.now ?? new Date();
  const reasons: ComunFactoryMachineUseDecision["reasons"][number][] = [];
  const authorization = input.authorization;

  if (!authorization || authorization.userId !== input.userId || authorization.capability !== input.capability) {
    return {
      allowed: false,
      mode: "blocked",
      reasons: ["authorization_missing"],
    };
  }

  if (authorization.revokedAt) reasons.push("authorization_revoked");

  if (authorization.expiresAt) {
    const expiresAt = new Date(authorization.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime())
      reasons.push("authorization_expired");
  }

  if (!authorization.safetyBriefingRef.trim())
    reasons.push("safety_briefing_missing");

  if (
    !authorization.competencyClaimIds.length ||
    !validDemonstratedClaims({
      userId: input.userId,
      claimIds: authorization.competencyClaimIds,
      claims: input.claims,
      evidence: input.evidence,
    })
  )
    reasons.push("competency_not_demonstrated");

  if (input.riskClass === "R4") reasons.push("critical_case_blocked");

  if (
    input.riskClass === "R3" &&
    !input.qualifiedOversightPresent
  )
    reasons.push("qualified_oversight_required");

  if (reasons.length)
    return { allowed: false, mode: "blocked", reasons };

  if (authorization.level === "observer")
    return { allowed: true, mode: "observe", reasons: [] };

  if (authorization.level === "supervised")
    return { allowed: true, mode: "supervised", reasons: [] };

  if (
    input.riskClass === "R3" &&
    LEVEL_ORDER[authorization.level] >= LEVEL_ORDER.independent
  )
    return { allowed: true, mode: "supervised", reasons: [] };

  return { allowed: true, mode: "independent", reasons: [] };
}
