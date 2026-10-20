import { describe, expect, it } from "vitest";
import {
  COMUN_FACTORY_ENTRY_DOORS,
  routeComunFactoryIntake,
} from "@/lib/comun-factory-intake-routing";

describe("roteamento de entrada da Fábrica COMUN", () => {
  it("reutiliza o Relata para problema cívico", () => {
    expect(
      routeComunFactoryIntake({
        intent: "civic_problem",
        confirmedByPerson: true,
        hasImmediatePublicDanger: false,
        hasCriticalSafetyUse: false,
      }),
    ).toEqual({
      destination: "canonical_relata",
      href: "/comun/relatar",
      persistFactoryCase: false,
      requiresHumanReview: false,
      reason: "reuse_canonical_civic_intake",
    });
  });

  it("não cria Caso FC automaticamente a partir da entrada", () => {
    const decision = routeComunFactoryIntake({
      intent: "repair_object",
      confirmedByPerson: true,
      hasImmediatePublicDanger: false,
      hasCriticalSafetyUse: false,
    });
    expect(decision.destination).toBe("factory_private_triage");
    expect(decision.persistFactoryCase).toBe(false);
    expect(decision.requiresHumanReview).toBe(true);
  });

  it("manda projeto de aprendizagem para a Escola", () => {
    const decision = routeComunFactoryIntake({
      intent: "learning_project",
      confirmedByPerson: true,
      hasImmediatePublicDanger: false,
      hasCriticalSafetyUse: false,
    });
    expect(decision.destination).toBe("school_context");
    expect(decision.href).toBe("/comun/escola");
  });

  it("risco crítico não entra no fluxo comunitário comum", () => {
    const decision = routeComunFactoryIntake({
      intent: "prototype_request",
      confirmedByPerson: true,
      hasImmediatePublicDanger: false,
      hasCriticalSafetyUse: true,
    });
    expect(decision.destination).toBe("qualified_referral");
    expect(decision.persistFactoryCase).toBe(false);
    expect(decision.requiresHumanReview).toBe(true);
  });

  it("perigo público imediato prioriza o Relata", () => {
    const decision = routeComunFactoryIntake({
      intent: "unknown",
      confirmedByPerson: true,
      hasImmediatePublicDanger: true,
      hasCriticalSafetyUse: false,
    });
    expect(decision.destination).toBe("canonical_relata");
    expect(decision.href).toBe("/comun/relatar");
  });

  it("classificação não confirmada nunca roteia automaticamente", () => {
    const decision = routeComunFactoryIntake({
      intent: "civic_problem",
      confirmedByPerson: false,
      hasImmediatePublicDanger: false,
      hasCriticalSafetyUse: false,
    });
    expect(decision.destination).toBe("human_triage");
    expect(decision.persistFactoryCase).toBe(false);
  });

  it("mantém somente três portas cognitivas na entrada", () => {
    expect(COMUN_FACTORY_ENTRY_DOORS.map((door) => door.label)).toEqual([
      "Tenho um problema",
      "Quero fazer",
      "Quero aprender",
    ]);
  });
});
