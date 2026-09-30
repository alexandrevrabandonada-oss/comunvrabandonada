import { describe, expect, it } from "vitest";
import {
  publicPautaStatusLabel,
  publicSidewalkProblemLabels,
} from "./comun-public-labels";

describe("public vocabulary", () => {
  it("renders the observed pauta state in Portuguese", () => {
    expect(publicPautaStatusLabel("investigating")).toBe("Em investigação");
    expect(publicPautaStatusLabel("receiving_reports")).toBe("Recebendo relatos");
    expect(publicPautaStatusLabel("preparing_dossier")).toBe("Preparando dossiê");
    expect(publicPautaStatusLabel("unrecognized_internal_state")).toBe(
      "Estado não informado",
    );
  });
  it("unifies legacy and canonical sidewalk problem codes without exposing unknown codes", () => {
    expect(
      publicSidewalkProblemLabels([
        "irregular",
        "sem_rampa",
        "no_ramp",
        "internal_code",
      ]),
    ).toBe("Piso irregular · Sem rampa · Problema não classificado");
    expect(publicSidewalkProblemLabels([])).toBe("");
  });
});
