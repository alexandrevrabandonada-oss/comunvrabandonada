import { describe, expect, it } from "vitest";
import {
  COMUN_JOURNEY_STATE_COPY,
  COMUN_PUBLIC_JOURNEY_STATES,
  normalizeComunJourneyStatus,
} from "@/lib/comun-journey-status";

describe("estados públicos de jornada", () => {
  it("cada estado possui explicação e próxima ação", () => {
    for (const state of COMUN_PUBLIC_JOURNEY_STATES) {
      expect(COMUN_JOURNEY_STATE_COPY[state].description).toBeTruthy();
      expect(COMUN_JOURNEY_STATE_COPY[state].nextAction).toBeTruthy();
    }
  });

  it("não expõe estado interno desconhecido", () => {
    expect(normalizeComunJourneyStatus("internal_double_review_queue")).toBe(
      "received",
    );
    expect(normalizeComunJourneyStatus("needs_information")).toBe(
      "information_requested",
    );
  });
});
