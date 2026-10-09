import { describe, expect, it } from "vitest";
import {
  COMUN_V1_LAUNCH_PROGRAM,
  summarizeComunLaunchProgram,
} from "./comun-launch-program";

describe("COMUN V1 launch program", () => {
  it("mantém IDs únicos e um único gate humano final", () => {
    const ids = COMUN_V1_LAUNCH_PROGRAM.domains.map((domain) => domain.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(COMUN_V1_LAUNCH_PROGRAM.finalHumanGate).toBe("launch_publicly");
    expect(COMUN_V1_LAUNCH_PROGRAM.domains).toHaveLength(10);
  });

  it("permanece bloqueado enquanto houver domínio sem evidência verde", () => {
    const summary = summarizeComunLaunchProgram();
    expect(summary.readyForFinalHumanGate).toBe(false);
    expect(summary.remaining).toBeGreaterThan(0);
    expect(summary.counts.blocked).toBeGreaterThan(0);
  });

  it("registra a esteira política como verde somente após as evidências remotas", () => {
    expect(
      COMUN_V1_LAUNCH_PROGRAM.domains.find(
        (domain) => domain.id === "pauta_action_cycle",
      )?.status,
    ).toBe("green");
  });

  it("registra identidade e comunidades como verde após ensaio remoto com rollback", () => {
    expect(
      COMUN_V1_LAUNCH_PROGRAM.domains.find(
        (domain) => domain.id === "identity_communities",
      )?.status,
    ).toBe("green");
  });

  it("registra operações como verde após projeção, segurança e ensaio remotos", () => {
    expect(
      COMUN_V1_LAUNCH_PROGRAM.domains.find(
        (domain) => domain.id === "operations",
      )?.status,
    ).toBe("green");
  });

  it("não libera o gate por estados verdes sem verificar as provas", () => {
    const green = COMUN_V1_LAUNCH_PROGRAM.domains.map((domain) => ({
      ...domain,
      status: "green" as const,
    }));
    expect(summarizeComunLaunchProgram(green)).toMatchObject({
      declaredReadyForFinalHumanGate: true,
      domainEvidenceVerification: "not_performed",
      readyForFinalHumanGate: false,
      remaining: 0,
    });
  });

  it("não trata ausência ou conjunto incompleto de domínios como prova", () => {
    for (const domains of [
      [],
      [{ ...COMUN_V1_LAUNCH_PROGRAM.domains[0], status: "green" as const }],
    ]) {
      expect(summarizeComunLaunchProgram(domains).readyForFinalHumanGate).toBe(
        false,
      );
      expect(
        summarizeComunLaunchProgram(domains).declaredReadyForFinalHumanGate,
      ).toBe(false);
    }
  });

  it("não aceita IDs repetidos ou domínio obrigatório substituído", () => {
    const green = COMUN_V1_LAUNCH_PROGRAM.domains.map((domain) => ({
      ...domain,
      status: "green" as const,
    }));
    green[1] = { ...green[0] };
    expect(
      summarizeComunLaunchProgram(green).declaredReadyForFinalHumanGate,
    ).toBe(false);
  });
});
