import { describe, expect, it } from "vitest";
import { evaluateCivicIntelligenceReadiness } from "@/lib/civic-intelligence/readiness";

const complete = {
  capability: true,
  realEmbeddings: true,
  relevance: true,
  permissionBoundary: true,
  technicalRehearsal: true,
  ci: true,
  production: true,
  humanRehearsal: false,
  criticalFindings: 0,
};

describe("civic intelligence promotion", () => {
  it("never declares human understanding from automation", () => {
    expect(evaluateCivicIntelligenceReadiness(complete)).toBe(
      "COMUN_CIVIC_INTELLIGENCE_READY_FOR_CONTROLLED_REHEARSAL",
    );
  });
  it("blocks on real provider, permission and relevance evidence", () => {
    expect(
      evaluateCivicIntelligenceReadiness({
        ...complete,
        realEmbeddings: false,
      }),
    ).toBe("COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY");
    expect(
      evaluateCivicIntelligenceReadiness({
        ...complete,
        permissionBoundary: false,
      }),
    ).toBe("COMUN_CIVIC_INTELLIGENCE_BLOCKED_PERMISSION_BOUNDARY");
    expect(
      evaluateCivicIntelligenceReadiness({ ...complete, relevance: false }),
    ).toBe("COMUN_CIVIC_INTELLIGENCE_BLOCKED_RELEVANCE");
  });
});
