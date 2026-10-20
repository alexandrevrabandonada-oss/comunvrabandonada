import { describe, expect, it } from "vitest";
import {
  canAdvanceComunFactoryCase,
  formatComunFactoryCaseCode,
  projectComunFactoryPilotSnapshot,
  validateComunFactoryCaseTransition,
  type ComunFactoryPilotCase,
} from "@/lib/comun-factory-pilot-contract";

const base: ComunFactoryPilotCase = {
  code: "FC-0001",
  state: "triage",
  disposition: "fabricate",
  riskClass: "R1",
  pautaId: "pauta-1",
  actionId: "action-1",
  taskId: "task-1",
  learningMissionId: null,
  technicalVersion: "v0.1",
  material: "PETG",
  estimatedCostCents: 1250,
  technicalApprovalRef: null,
  testEvidenceRef: null,
};

describe("contrato do piloto da Fábrica COMUN", () => {
  it("gera código FC estável", () => {
    expect(formatComunFactoryCaseCode(7)).toBe("FC-0007");
    expect(() => formatComunFactoryCaseCode(0)).toThrow(
      "COMUN_FACTORY_INVALID_SEQUENCE",
    );
  });

  it("exige tarefa canônica antes de trabalho técnico", () => {
    const findings = validateComunFactoryCaseTransition({
      current: { ...base, taskId: null },
      nextState: "design",
    });
    expect(findings).toContain("canonical_task_required");
  });

  it("não transforma encaminhamento em fabricação", () => {
    const findings = validateComunFactoryCaseTransition({
      current: { ...base, disposition: "refer" },
      nextState: "design",
    });
    expect(findings).toContain("disposition_blocks_fabrication");
  });

  it("bloqueia fluxo comunitário crítico R4", () => {
    const findings = validateComunFactoryCaseTransition({
      current: { ...base, riskClass: "R4" },
      nextState: "prototype",
    });
    expect(findings).toContain("critical_risk_blocked");
  });

  it("exige aprovação qualificada antes de fabricar R3", () => {
    const findings = validateComunFactoryCaseTransition({
      current: {
        ...base,
        state: "test",
        riskClass: "R3",
        technicalApprovalRef: null,
      },
      nextState: "fabrication",
    });
    expect(findings).toContain("qualified_approval_required");
  });

  it("exige evidência de teste antes de instalar R2 ou R3", () => {
    const findings = validateComunFactoryCaseTransition({
      current: {
        ...base,
        state: "fabrication",
        riskClass: "R2",
        testEvidenceRef: null,
      },
      nextState: "installed",
    });
    expect(findings).toContain("test_evidence_required");
  });

  it("permite avanço funcional simples quando contrato está satisfeito", () => {
    expect(
      canAdvanceComunFactoryCase({
        current: base,
        nextState: "design",
      }),
    ).toBe(true);
  });

  it("snapshot técnico não duplica pessoa, pauta, ação ou tarefa", () => {
    const snapshot = projectComunFactoryPilotSnapshot(base);
    expect(snapshot).toEqual({
      code: "FC-0001",
      state: "triage",
      disposition: "fabricate",
      riskClass: "R1",
      technicalVersion: "v0.1",
      material: "PETG",
      estimatedCostCents: 1250,
    });
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("pauta-1");
    expect(serialized).not.toContain("action-1");
    expect(serialized).not.toContain("task-1");
  });
});
