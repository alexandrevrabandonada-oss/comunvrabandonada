import { describe, expect, it } from "vitest";
import {
  COMUN_MOTOROLA_PRIMARY_ACTION,
  COMUN_MOTOROLA_RULES,
  COMUN_MOTOROLA_SIDEWALK_CONTRIBUTION_HREF,
} from "./comun-motorola-contract";

describe("contrato Motorola do COMUN", () => {
  it("leva a captura em um gesto e sem burocracia anterior", () => {
    expect(COMUN_MOTOROLA_PRIMARY_ACTION).toEqual({
      href: "/comun/relatar",
      label: "Vi um problema",
      mobileLabel: "Relatar",
      accessibleLabel: "Vi um problema",
    });
    expect(COMUN_MOTOROLA_RULES.access).toBe("one_intentional_gesture");
    expect(COMUN_MOTOROLA_RULES.bureaucracyBeforeCapture).toBe("none");
  });

  it("mantém Calçadas no fluxo P4 canônico", () => {
    expect(COMUN_MOTOROLA_SIDEWALK_CONTRIBUTION_HREF).toBe(
      "/comun/calcadas/contribuir",
    );
    expect(COMUN_MOTOROLA_SIDEWALK_CONTRIBUTION_HREF).not.toContain(
      "/comun/mapa/contribuir",
    );
  });
});
