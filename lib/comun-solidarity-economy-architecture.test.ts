import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMUN_SOLIDARITY_ECONOMY_ARCHITECTURE_VERSION,
  a0SolidarityEconomyArchitectureDecision,
  canonicalEconomicCardinalities,
  canonicalSolidarityEconomyGrammar,
  getSolidarityEconomyStructureDecision,
  solidarityEconomyPrivacyBoundary,
  solidarityEconomyProjectionAudit,
  solidarityEconomyStructureDecisions,
} from "./comun-solidarity-economy-architecture";

const root = process.cwd();
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

describe("COMUN 48.4-A0 solidarity economy reconciliation", () => {
  it("materializes one versioned architecture without a marketplace root", () => {
    expect(COMUN_SOLIDARITY_ECONOMY_ARCHITECTURE_VERSION).toBe(
      "comun-solidarity-economy-architecture-v1",
    );
    expect(a0SolidarityEconomyArchitectureDecision.newMarketplaceRoot).toBe(false);
    expect(a0SolidarityEconomyArchitectureDecision.feirinhaIsEntity).toBe(false);
    expect(a0SolidarityEconomyArchitectureDecision.businessWriteInA0).toBe(false);
    expect(canonicalSolidarityEconomyGrammar.surface).toContain("não é entidade");
  });

  it("audits the existing organization and keeps it as the extensible root", () => {
    const migration = read(
      "supabase/migrations/20260715002809_comun_popular_map.sql",
    );
    expect(migration).toContain(
      "create table public.comun_territorial_organizations",
    );
    expect(
      getSolidarityEconomyStructureDecision("comun_territorial_organizations")
        ?.decision,
    ).toBe("REUSE_WITH_EXTENSION");
    expect(a0SolidarityEconomyArchitectureDecision.organization).toBe(
      "REUSE_WITH_EXTENSION",
    );
  });

  it("keeps needs canonical with an explicit legacy action debt", () => {
    const migration = read(
      "supabase/migrations/20260715002809_comun_popular_map.sql",
    );
    expect(migration).toContain("create table public.comun_territorial_needs");
    expect(migration).toContain(
      "action_id uuid references public.comun_mobilization_actions(id)",
    );
    expect(a0SolidarityEconomyArchitectureDecision.need).toBe(
      "REUSE_WITH_EXTENSION",
    );
    expect(a0SolidarityEconomyArchitectureDecision.actions).toBe(
      "NEW_LINKS_PREFER_COLLECTIVE_ACTIONS_LEGACY_KEEP_COMPAT",
    );
    expect(
      solidarityEconomyStructureDecisions.some(
        (item) =>
          item.decision === "LEGACY_KEEP_COMPAT" &&
          item.structure.includes("comun_territorial_needs.action_id"),
      ),
    ).toBe(true);
  });

  it("does not mistake a private help message for a structured offer", () => {
    const interest = getSolidarityEconomyStructureDecision(
      "comun_territorial_need_interests",
    );
    expect(interest?.decision).toBe("REUSE_CANONICAL");
    expect(interest?.futureRole).toContain("somente para necessidades");
    expect(a0SolidarityEconomyArchitectureDecision.offer).toBe(
      "NEEDS_NEW_CANONICAL_OBJECT",
    );
    expect(canonicalEconomicCardinalities.organizationToOffers.supportedNow).toBe(
      false,
    );
  });

  it("keeps every contact private unless a public value was explicitly authorized", () => {
    expect(solidarityEconomyPrivacyBoundary.organization.private).toEqual([
      "private_contact",
      "internal_notes",
    ]);
    expect(solidarityEconomyPrivacyBoundary.interest.public).toEqual([]);
    expect(solidarityEconomyPrivacyBoundary.interest.private).toContain(
      "contact_private",
    );
    expect(solidarityEconomyPrivacyBoundary.interest.private).toContain(
      "offer_private",
    );
    expect(solidarityEconomyProjectionAudit.publicContactAuthorizedDatabaseType).toBe(
      "text",
    );
    expect(solidarityEconomyProjectionAudit.publicContactIsAuthorizationBoolean).toBe(
      false,
    );
  });

  it("records the current child projection gap instead of inheriting the parent gate", () => {
    const source = read("lib/popular-map.ts");
    expect(source).toContain("db.from('comun_territorial_organizations')");
    expect(solidarityEconomyProjectionAudit.parentTerritoryGateExplicit).toBe(true);
    expect(
      solidarityEconomyProjectionAudit.organizationChildStatusGateExplicit,
    ).toBe(false);
    expect(
      solidarityEconomyProjectionAudit.organizationChildVerificationGateExplicit,
    ).toBe(false);
    expect(solidarityEconomyProjectionAudit.organizationPrivateContactSelected).toBe(
      false,
    );
    expect(solidarityEconomyProjectionAudit.decision).toBe(
      "BLOCK_PUBLIC_ECONOMIC_ADAPTER_UNTIL_CHILD_GATE_IS_EXPLICIT",
    );
  });

  it("keeps recycling specialized and search derived", () => {
    expect(
      getSolidarityEconomyStructureDecision(
        "comun_recycling_materials + comun_recycling_points + comun_collection_routes",
      )?.futureRole,
    ).toContain("sem virar modelo genérico de oferta");
    expect(
      getSolidarityEconomyStructureDecision("comun_search_documents")?.decision,
    ).toBe("DERIVED_LAYER");
  });

  it("defers transactional commerce and forbids ratings in the first cycle", () => {
    expect(a0SolidarityEconomyArchitectureDecision.payments).toBe("DEFERRED");
    expect(a0SolidarityEconomyArchitectureDecision.orders).toBe("DEFERRED");
    expect(a0SolidarityEconomyArchitectureDecision.ratings).toBe(
      "FORBIDDEN_FIRST_CYCLE",
    );
  });

  it("keeps pauta, action and community optional and distinct", () => {
    expect(a0SolidarityEconomyArchitectureDecision.pautas).toContain("NO_AUTO_CREATE");
    expect(a0SolidarityEconomyArchitectureDecision.communities).toContain(
      "NO_CURRENT_RELATION",
    );
    expect(canonicalSolidarityEconomyGrammar.organization).not.toBe(
      canonicalSolidarityEconomyGrammar.community,
    );
    expect(canonicalSolidarityEconomyGrammar.need).not.toBe(
      canonicalSolidarityEconomyGrammar.action,
    );
  });

  it("keeps A0 free of product mutations", () => {
    const workflow = read(
      ".github/workflows/comun-48-4-a0-solidarity-economy-preflight.yml",
    );
    expect(workflow).toContain("begin read only;");
    expect(workflow).toContain("businessContentRead: false");
    expect(workflow).toContain("migrationCount=0");
    expect(workflow).not.toMatch(/supabase\s+db\s+(reset|repair)/);
    expect(workflow).not.toContain("--include-all");
  });
});

