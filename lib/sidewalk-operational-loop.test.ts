import { describe, expect, it } from "vitest";
import {
  duplicateSignalScore,
  projectSidewalkOperationalState,
} from "./sidewalk-operational-loop";

describe("sidewalk operational loop", () => {
  it("projects moderation and next action honestly", () => {
    expect(
      projectSidewalkOperationalState({
        status: "under_review",
        updated_at: "2026-07-24T20:00:00Z",
      }),
    ).toEqual({
      state: "Em triagem",
      nextAction: "Aguardar revisão ou pedido de complemento.",
      lastChangedAt: "2026-07-24T20:00:00Z",
    });
  });

  it("keeps protocol and memory as distinct operational steps", () => {
    expect(
      projectSidewalkOperationalState({
        status: "published",
        forwarding_state: "protocol_registered",
      }).nextAction,
    ).toContain("resposta");
    expect(
      projectSidewalkOperationalState({
        status: "published",
        forwarding_state: "closed",
      }).state,
    ).toBe("Ciclo preservado em memória");
  });

  it("only suggests duplicates from combined signals", () => {
    expect(
      duplicateSignalScore({
        distanceMeters: 40,
        sameCategory: true,
        hoursApart: 12,
        sameImageHash: false,
        textSimilarity: 0.2,
      }),
    ).toMatchObject({ suggested: true, score: 60 });
    expect(
      duplicateSignalScore({
        distanceMeters: 500,
        sameCategory: true,
        hoursApart: 400,
        sameImageHash: false,
        textSimilarity: 0.1,
      }).suggested,
    ).toBe(false);
  });
});
