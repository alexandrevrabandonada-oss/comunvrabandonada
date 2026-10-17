export const COMUN_FACTORY_PILOT_CONTRACT_VERSION =
  "comun-factory-pilot-contract-v0" as const;

export const COMUN_FACTORY_RISK_CLASSES = [
  "R0",
  "R1",
  "R2",
  "R3",
  "R4",
] as const;

export type ComunFactoryRiskClass =
  (typeof COMUN_FACTORY_RISK_CLASSES)[number];

export const COMUN_FACTORY_CASE_STATES = [
  "intake",
  "triage",
  "design",
  "prototype",
  "test",
  "fabrication",
  "installed",
  "closed",
  "declined",
] as const;

export type ComunFactoryCaseState =
  (typeof COMUN_FACTORY_CASE_STATES)[number];

export const COMUN_FACTORY_DISPOSITIONS = [
  "repair",
  "reuse",
  "fabricate",
  "research",
  "refer",
  "do_not_fabricate",
] as const;

export type ComunFactoryDisposition =
  (typeof COMUN_FACTORY_DISPOSITIONS)[number];

export type ComunFactoryPilotCase = {
  readonly code: string;
  readonly state: ComunFactoryCaseState;
  readonly disposition: ComunFactoryDisposition;
  readonly riskClass: ComunFactoryRiskClass;
  readonly pautaId: string | null;
  readonly actionId: string | null;
  readonly taskId: string | null;
  readonly learningMissionId: string | null;
  readonly technicalVersion: string | null;
  readonly material: string | null;
  readonly estimatedCostCents: number | null;
  readonly technicalApprovalRef: string | null;
  readonly testEvidenceRef: string | null;
};

export type ComunFactoryTransitionFinding =
  | "invalid_transition"
  | "canonical_task_required"
  | "disposition_blocks_fabrication"
  | "critical_risk_blocked"
  | "qualified_approval_required"
  | "test_evidence_required";

const ALLOWED_TRANSITIONS: Readonly<
  Record<ComunFactoryCaseState, readonly ComunFactoryCaseState[]>
> = {
  intake: ["triage", "declined"],
  triage: ["design", "prototype", "test", "closed", "declined"],
  design: ["prototype", "test", "closed", "declined"],
  prototype: ["design", "test", "fabrication", "closed", "declined"],
  test: ["design", "prototype", "fabrication", "closed", "declined"],
  fabrication: ["test", "installed", "closed", "declined"],
  installed: ["test", "closed"],
  closed: [],
  declined: [],
};

const TECHNICAL_WORK_STATES = new Set<ComunFactoryCaseState>([
  "design",
  "prototype",
  "test",
  "fabrication",
  "installed",
]);

export function formatComunFactoryCaseCode(sequence: number) {
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw new Error("COMUN_FACTORY_INVALID_SEQUENCE");
  return `FC-${String(sequence).padStart(4, "0")}`;
}

export function validateComunFactoryCaseTransition(input: {
  readonly current: ComunFactoryPilotCase;
  readonly nextState: ComunFactoryCaseState;
}): readonly ComunFactoryTransitionFinding[] {
  const { current, nextState } = input;
  const findings: ComunFactoryTransitionFinding[] = [];

  if (!ALLOWED_TRANSITIONS[current.state].includes(nextState))
    findings.push("invalid_transition");

  if (TECHNICAL_WORK_STATES.has(nextState) && !current.taskId)
    findings.push("canonical_task_required");

  if (
    ["refer", "do_not_fabricate"].includes(current.disposition) &&
    ["design", "prototype", "fabrication", "installed"].includes(nextState)
  )
    findings.push("disposition_blocks_fabrication");

  if (
    current.riskClass === "R4" &&
    ["prototype", "test", "fabrication", "installed"].includes(nextState)
  )
    findings.push("critical_risk_blocked");

  if (
    current.riskClass === "R3" &&
    ["fabrication", "installed"].includes(nextState) &&
    !current.technicalApprovalRef
  )
    findings.push("qualified_approval_required");

  if (
    ["R2", "R3"].includes(current.riskClass) &&
    nextState === "installed" &&
    !current.testEvidenceRef
  )
    findings.push("test_evidence_required");

  return Array.from(new Set(findings));
}

export function canAdvanceComunFactoryCase(input: {
  readonly current: ComunFactoryPilotCase;
  readonly nextState: ComunFactoryCaseState;
}) {
  return validateComunFactoryCaseTransition(input).length === 0;
}

export type ComunFactoryPilotSnapshot = {
  readonly code: string;
  readonly state: ComunFactoryCaseState;
  readonly disposition: ComunFactoryDisposition;
  readonly riskClass: ComunFactoryRiskClass;
  readonly technicalVersion: string | null;
  readonly material: string | null;
  readonly estimatedCostCents: number | null;
};

export function projectComunFactoryPilotSnapshot(
  value: ComunFactoryPilotCase,
): ComunFactoryPilotSnapshot {
  return {
    code: value.code,
    state: value.state,
    disposition: value.disposition,
    riskClass: value.riskClass,
    technicalVersion: value.technicalVersion,
    material: value.material,
    estimatedCostCents: value.estimatedCostCents,
  };
}
