import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  b0ArchitectureDecision,
  canonicalParticipationBoundaries,
  canonicalSocialCardinalities,
  canonicalSocialGrammar,
  getSocialStructureDecision,
  socialStructureDecisions,
} from "./comun-social-architecture";

describe("COMUN 48.3-B0 social architecture", () => {
  it("keeps community, pauta, roda, round, work group and action distinct", () => {
    expect(new Set(Object.values(canonicalSocialGrammar)).size).toBe(7);
    expect(getSocialStructureDecision("comun_communities")?.kind).toBe("community");
    expect(getSocialStructureDecision("comun_pauta_spaces")?.kind).toBe("pauta");
    expect(getSocialStructureDecision("comun_construction_circles")?.kind).toBe("roda");
    expect(getSocialStructureDecision("comun_construction_circle_rounds")?.kind).toBe("round");
    expect(getSocialStructureDecision("comun_community_work_groups")?.kind).toBe("work_group");
    expect(getSocialStructureDecision("comun_collective_actions")?.kind).toBe("action");
  });

  it("reuses existing roots and creates no v2 structure", () => {
    expect(socialStructureDecisions.every((item) => !/v2/i.test(item.structure))).toBe(true);
    expect(b0ArchitectureDecision.community).toBe("reuse_existing_as_optional_context");
    expect(b0ArchitectureDecision.roda).toBe("reuse_construction_circles_as_structured_process");
    expect(b0ArchitectureDecision.nextSlice).toBe("48.3-B1");
  });

  it("records cardinality gaps instead of inventing relationships", () => {
    expect(canonicalSocialCardinalities.communityToPautas.supportedNow).toBe(false);
    expect(canonicalSocialCardinalities.communityToPautas.current).toBe(
      "one_optional_legacy_slug_on_pauta",
    );
    expect(canonicalSocialCardinalities.roundToSyntheses.supportedNow).toBe(false);
    expect(canonicalSocialCardinalities.rodaToRounds).toContain("at_most_one_open");
  });

  it("does not propagate membership, content or publication across objects", () => {
    expect(Object.values(canonicalParticipationBoundaries).every(Boolean)).toBe(true);
    expect(canonicalParticipationBoundaries.privateReportDoesNotBecomeSocialContentAutomatically).toBe(true);
    expect(canonicalParticipationBoundaries.generalContributionIsNotCopiedIntoRoda).toBe(true);
    expect(canonicalParticipationBoundaries.roundSynthesisDoesNotBecomePautaSynthesisAutomatically).toBe(true);
  });

  it("keeps general pauta contributions as compatibility, not a second roda", () => {
    expect(getSocialStructureDecision("comun_pauta_contributions")?.decision).toBe(
      "LEGACY_KEEP_COMPAT",
    );
    expect(getSocialStructureDecision("comun_circle_contributions")?.decision).toBe(
      "REUSE_CANONICAL",
    );
  });

  it("marks the hardcoded social narrative as non-canonical", () => {
    expect(getSocialStructureDecision("community-experience.ts")?.decision).toBe(
      "DEPRECATE_CONCEPTUALLY",
    );
  });

  it("keeps the remote audit metadata-only and the B0 scope migration-free", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/comun-48-3-b0-preflight.yml"),
      "utf8",
    );
    expect(workflow).toContain("begin read only;");
    expect(workflow).toContain("'businessContentRead', false");
    expect(workflow).toContain("COMUN_48_3_B0_REMOTE_PLAN_EMPTY_GREEN");
    expect(workflow).not.toMatch(/select\s+\*\s+from/i);
    expect(workflow).not.toMatch(/\b(insert|update|delete)\s+(into|public\.)/i);
    expect(workflow).not.toMatch(/migration repair|db reset|--include-all|\bseed\b/i);
  });
});
