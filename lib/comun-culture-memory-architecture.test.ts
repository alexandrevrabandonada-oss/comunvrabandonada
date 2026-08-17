import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMUN_CULTURE_MEMORY_ARCHITECTURE_VERSION,
  cultureArchitectureDecision,
  cultureHumanGateClasses,
  culturePublicProjectionGaps,
  cultureRightsConsentMatrix,
  cultureStructureDecisions,
  cultureSurfaceDecisions,
  getCultureStructureDecision,
} from "./comun-culture-memory-architecture";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("COMUN 48.5-A0 culture, memory and radio reconciliation", () => {
  it("keeps the existing archive root and creates no memory v2", () => {
    expect(COMUN_CULTURE_MEMORY_ARCHITECTURE_VERSION).toBe(
      "comun-culture-memory-architecture-v1",
    );
    expect(cultureArchitectureDecision.memoryRoot).toContain("ARCHIVE_ITEMS");
    expect(cultureArchitectureDecision.noNewRoot).toBe(true);
    expect(cultureArchitectureDecision.migrationPlan).toEqual([]);
  });

  it("proves art, music, oral history and radio identities are anchored in archive items", () => {
    const files = [
      "supabase/migrations/20260715170058_comun_territorial_art_foundation.sql",
      "supabase/migrations/20260714185438_archive_local_music.sql",
      "supabase/migrations/20260714223658_archive_oral_history.sql",
      "supabase/migrations/20260715185344_community_radio_foundation.sql",
    ]
      .map(read)
      .join("\n");
    expect(
      files.match(/references public\.comun_archive_items/g)?.length,
    ).toBeGreaterThan(10);
    expect(cultureArchitectureDecision.art).toContain("ON_ARCHIVE_ITEM");
    expect(cultureArchitectureDecision.radioEpisode).toContain(
      "ON_ARCHIVE_ITEM",
    );
  });

  it("separates collection, creator, radio program, episode and schedule", () => {
    expect(cultureArchitectureDecision.collection).toBe(
      "CANONICAL_CURATORIAL_GROUPING",
    );
    expect(cultureArchitectureDecision.creator).toBe(
      "CULTURAL_IDENTITY_NOT_AUTH_ROLE",
    );
    expect(cultureArchitectureDecision.radioProgram).not.toBe(
      cultureArchitectureDecision.radioEpisode,
    );
    expect(cultureArchitectureDecision.radioSchedule).toContain("NOT_ARTIFACT");
  });

  it("classifies overlapping surfaces without adding redirects", () => {
    expect(cultureSurfaceDecisions.archive).toBe("CANONICAL_MEMORY_SURFACE");
    expect(cultureSurfaceDecisions.archiveArt).toBe("REUSE_CANONICAL_SURFACE");
    expect(cultureSurfaceDecisions.legacyArt).toBe(
      "COMPATIBILITY_ROUTE_MERGE_FUTURE",
    );
    expect(cultureSurfaceDecisions.radio).toBe("CANONICAL_EDITORIAL_SURFACE");
  });

  it("makes rights and consent explicit for every required domain", () => {
    expect(Object.keys(cultureRightsConsentMatrix).sort()).toEqual([
      "academic_document",
      "art",
      "historical_photo",
      "music",
      "oral_history",
      "radio_episode",
    ]);
    expect(cultureRightsConsentMatrix.oral_history.voiceImageConsent).toBe(
      "granular_versioned",
    );
    expect(cultureRightsConsentMatrix.music.copyright).toContain("separate");
    expect(cultureHumanGateClasses).toContain("LEGACY_FRICTION");
  });

  it("keeps Pauta memory, territory, community and actions explicit and separate", () => {
    expect(cultureArchitectureDecision.pautaMemory).toBe(
      "SEPARATE_EXPLICIT_LINK_ONLY",
    );
    expect(cultureArchitectureDecision.territory).toBe(
      "OPTIONAL_EXPLICIT_CONTEXT",
    );
    expect(cultureArchitectureDecision.community).toBe(
      "OPTIONAL_EXPLICIT_CONTEXT",
    );
    expect(cultureArchitectureDecision.action).toBe(
      "OPTIONAL_EXPLICIT_CONTEXT",
    );
  });

  it("keeps search derived and forbids automatic publication or AI links", () => {
    expect(
      getCultureStructureDecision("comun_search_documents")?.decision,
    ).toBe("DERIVED_LAYER");
    expect(cultureArchitectureDecision.noAutomaticPublication).toBe(true);
    expect(cultureArchitectureDecision.noAiAutoLink).toBe(true);
  });

  it("records fail-closed public child-gate gaps instead of claiming green readers", () => {
    expect(culturePublicProjectionGaps).toContain(
      "ART_CHILD_RIGHTS_GATE_NOT_ENFORCED_IN_PUBLIC_READER",
    );
    expect(culturePublicProjectionGaps).toContain(
      "RADIO_EPISODE_CHILD_CONSENT_RIGHTS_SAFETY_GATES_NOT_ENFORCED_IN_LIST_READER",
    );
  });

  it("inventories all required structural families", () => {
    for (const domain of [
      "archive",
      "historical_photo",
      "identification",
      "art",
      "music",
      "oral_history",
      "radio",
      "relations",
      "search",
    ]) {
      expect(
        cultureStructureDecisions.some((entry) => entry.domain === domain),
      ).toBe(true);
    }
  });

  it("keeps the focal workflow read-only, media-free and migration-free", () => {
    const workflow = read(
      ".github/workflows/comun-48-5-a0-culture-memory-radio-preflight.yml",
    );
    expect(workflow).toContain("begin read only;");
    expect(workflow).toContain("businessContentRead: false");
    expect(workflow).toContain("mediaContentRead: false");
    expect(workflow).toContain("migrationCount=0");
    expect(workflow).not.toMatch(/supabase\s+db\s+(reset|repair)/);
    expect(workflow).not.toContain("--include-all");
  });
});
