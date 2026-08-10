import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationName =
  "20260810171448_comun_child_protection_private_routing.sql";
const read = (path: string) => readFileSync(path, "utf8");

describe("COMUN P6C-B2 child protection private contract", () => {
  it("owns exactly one focused migration", () => {
    const matching = readdirSync("supabase/migrations").filter((name) =>
      /child_protection_private_routing/i.test(name),
    );
    expect(matching).toEqual([migrationName]);
    const migration = read(`supabase/migrations/${migrationName}`);
    expect(migration).toContain("'child_protection'");
    expect(migration).toContain("comun-child-protection-routing-v1");
    expect(migration).toContain("p_privacy_class <> 'high_risk'");
    expect(migration).toContain("never_automatic");
    expect(migration).toContain("requiresHumanReview");
    expect(migration).toContain("private.comun_relata_classification_events");
    expect(migration).toContain("grant execute");
    expect(migration).not.toMatch(
      /create table|backfill|delete from|truncate|private\.comun_forwarding_packages\s*\(/i,
    );
  });

  it("keeps high-risk canonical Relata out of broad admin and public surfaces", () => {
    const admin = read("app/comun/admin/relatos/[id]/page.tsx");
    const reports = read("lib/reports.ts");
    const projection = read("lib/comun-relata-public-projection.ts");
    expect(admin).toContain("getAdminReport");
    expect(reports).toContain('from("comun_reports")');
    expect(reports).not.toContain("comun_relata_reports");
    expect(admin).not.toContain("comun_relata_reports");
    expect(projection).toContain('"child_protection"');
  });

  it("exposes channels as information only and never adds forwarding", () => {
    const route = read("app/api/comun/child-protection-channels/route.ts");
    const panel = read(
      "app/comun/relatar/comun-child-protection-channels-panel.tsx",
    );
    const migration = read(`supabase/migrations/${migrationName}`);
    expect(route).toContain("informationalOnly: true");
    expect(panel).toContain("não criou encaminhamento");
    expect(panel).not.toContain("window.open");
    expect(panel).not.toContain("tel:");
    expect(migration).not.toMatch(/alter table[^;]+source_domain/i);
    expect(migration).not.toContain("comun_forwarding_packages");
  });

  it("keeps the wallet sanitized", () => {
    const wallet = read("lib/comun-wallet-relata-action.ts");
    const migration = read(`supabase/migrations/${migrationName}`);
    expect(wallet).toContain("Guardado com proteção reforçada");
    expect(wallet).toContain("Este registro não será publicado.");
    expect(migration).toContain("'immediateDanger'");
    expect(migration).not.toMatch(
      /jsonb_build_object\([^)]*childProtectionIssueType[^)]*\)[\s\S]{0,120}comun_participation_wallet_items/i,
    );
  });
});
