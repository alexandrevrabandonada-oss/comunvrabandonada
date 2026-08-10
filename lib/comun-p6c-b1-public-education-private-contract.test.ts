import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const migrationName =
  "20260810155310_comun_public_education_sensitive_routing.sql";

describe("COMUN P6C-B1 private public Education contract", () => {
  it("uses the one narrow routing migration proven necessary by the previous RPC", () => {
    const migrations = readdirSync(join(root, "supabase/migrations"));
    expect(
      migrations.filter((name) =>
        /public_education_sensitive_routing/i.test(name),
      ),
    ).toEqual([migrationName]);
    const previous = read(
      "supabase/migrations/20260810143000_comun_public_health_sensitive_routing.sql",
    );
    expect(previous).not.toContain("comun-education-service-routing-v1");
    expect(previous).not.toContain("education_issue_type");

    const migration = read(`supabase/migrations/${migrationName}`);
    expect(migration).toContain("comun-education-service-routing-v1");
    expect(migration).toContain("educationIssueType");
    expect(migration).toContain("childSafetySignal");
    expect(migration).toContain("p_category='public_education'");
    expect(migration).toContain(
      "p_privacy_class not in ('restricted','sensitive','high_risk')",
    );
    expect(migration).toContain(
      "p_decision->'requiresHumanReview' is distinct from 'true'::jsonb",
    );
    expect(migration).toContain(
      "grant execute on function public.comun_relata_create",
    );
    expect(migration).toContain(
      "grant execute on function public.comun_participation_wallet_attach_relata",
    );
    expect(migration).not.toMatch(
      /create table|backfill|insert into public\.comun_relata_cases\s+select|alter table private\.comun_forwarding_packages/i,
    );
  });

  it("does not create an Education miniapp or sensitive forwarding package", () => {
    expect(() => read("app/comun/educacao/page.tsx")).toThrow();
    expect(() => read("app/comun/escolas/denunciar/page.tsx")).toThrow();
    expect(() => read("app/comun/merenda/page.tsx")).toThrow();
    const feature = read("lib/comun-public-education-sensitive-feature.ts");
    const channelRoute = read("app/api/comun/education-channels/route.ts");
    const panel = read("app/comun/relatar/comun-education-channels-panel.tsx");
    expect(feature).toContain(
      "COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED",
    );
    expect(channelRoute).toContain("forwardingEnabled: false");
    expect(channelRoute).toContain("noEducationDataTransferred: true");
    expect(channelRoute).not.toMatch(
      /comun_forwarding_packages|person_declared_sent/,
    );
    expect(panel).not.toMatch(/window\.open|person_declared_sent/);
  });

  it("stores only allowlisted Education presentation metadata in the Wallet", () => {
    const migration = read(`supabase/migrations/${migrationName}`);
    const attach = migration.slice(
      migration.indexOf(
        "create or replace function public.comun_participation_wallet_attach_relata",
      ),
    );
    expect(attach).toContain("educationIssueType");
    expect(attach).toContain("childSafetySignal");
    expect(attach).not.toMatch(
      /original_text|school_name|student|turma|matricula|location|photo/i,
    );
  });

  it("keeps Education out of every public projection", () => {
    const projection = read("lib/comun-relata-public-projection.ts");
    expect(projection).not.toMatch(/public_education\s*:/);
    expect(projection).toContain('"public_education"');
  });

  it("preserves the paused human pilot after the explicitly authorized later bricks", () => {
    const current = read("reports/current/estado-atual-comun.md");
    expect(current).toContain(
      "COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION",
    );
    expect(
      readdirSync(join(root, "lib")).some((name) => /p6c-c/i.test(name)),
    ).toBe(true);
  });
});
