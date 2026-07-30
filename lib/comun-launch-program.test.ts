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

  it("só libera o gate final quando todos os domínios estão verdes", () => {
    const green = COMUN_V1_LAUNCH_PROGRAM.domains.map((domain) => ({
      ...domain,
      status: "green" as const,
    }));
    expect(summarizeComunLaunchProgram(green)).toMatchObject({
      readyForFinalHumanGate: true,
      remaining: 0,
    });
  });
});
