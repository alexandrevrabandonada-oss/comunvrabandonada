import { describe, expect, it } from "vitest";
import {
  COMUN_INTEGRATED_EXPERIENCE_RESULT,
  COMUN_PUBLIC_EXPERIENCE_DOORS,
  COMUN_PUBLIC_LANGUAGE,
  COMUN_PUBLIC_NAVIGATION_DESTINATIONS,
} from "./experience-coherence";

describe("48.3-E1 integrated experience contract", () => {
  it("offers one report action and three clear continuations", () => {
    expect(COMUN_PUBLIC_EXPERIENCE_DOORS).toHaveLength(4);
    expect(COMUN_PUBLIC_EXPERIENCE_DOORS.map((door) => door.id)).toEqual([
      "report",
      "understand",
      "participate",
      "my_participation",
    ]);
    expect(COMUN_PUBLIC_EXPERIENCE_DOORS[0]).toMatchObject({
      label: "Vi um problema",
      href: "/comun/relatar",
    });
  });

  it("keeps internal architecture out of the public vocabulary", () => {
    const publicCopy = JSON.stringify(COMUN_PUBLIC_LANGUAGE).toLowerCase();
    for (const jargon of [
      "action cycle",
      "construction circle",
      "evidence item",
      "membership",
      "state_version",
    ]) {
      expect(publicCopy).not.toContain(jargon);
    }
  });

  it("keeps the public navigation bounded and records the E1 terminal", () => {
    expect(COMUN_PUBLIC_NAVIGATION_DESTINATIONS).toHaveLength(4);
    expect(COMUN_INTEGRATED_EXPERIENCE_RESULT).toBe(
      "COMUN_48_3_E1_INTEGRATED_EXPERIENCE_COHERENCE_GREEN_STREAMLINED_NAVIGATION",
    );
  });
});
