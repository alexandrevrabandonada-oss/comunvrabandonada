import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationName = "20260815223006_comun_solidarity_organization_access.sql";
const migration = readFileSync(resolve("supabase/migrations", migrationName), "utf8");
const server = readFileSync(resolve("lib/server/comun-solidarity-organization-governance.ts"), "utf8");
const actions = readFileSync(resolve("app/comun/cooperativas/[slug]/actions.ts"), "utf8");
const page = readFileSync(resolve("app/comun/cooperativas/[slug]/page.tsx"), "utf8");
const directoryPage = readFileSync(resolve("app/comun/cooperativas/page.tsx"), "utf8");
const participationPage = readFileSync(resolve("app/comun/minha-participacao/page.tsx"), "utf8");
const organizationAdminPage = readFileSync(resolve("app/comun/admin/organizacao/page.tsx"), "utf8");
const organizationAdminSection = readFileSync(resolve("components/comun-solidarity-organization-access-admin-section.tsx"), "utf8");

describe("48.4-A2 storage and server boundary", () => {
  it("adds exactly one private access root and no seller or community membership table", () => {
    expect(migration).toContain("create table private.comun_solidarity_organization_access");
    expect(migration.match(/create table /g)).toHaveLength(1);
    expect(migration).not.toMatch(/create table .*?(seller|owner|community_membership|claim)/i);
    const a2Migrations = readdirSync(resolve("supabase/migrations")).filter((name) =>
      name.endsWith("_comun_solidarity_organization_access.sql"),
    );
    expect(a2Migrations).toEqual([migrationName]);
  });

  it("enforces revocable roles, one live relationship, lifecycle and private audit history", () => {
    expect(migration).toContain("requested_role in ('facilitator','editor')");
    expect(migration).toContain("state in ('pending','active','rejected','withdrawn','revoked','left')");
    expect(migration).toContain("where state in ('pending','active')");
    expect(migration).toContain("transition_history_private jsonb");
    expect(migration).toContain("review_scope in ('platform','organization')");
  });

  it("closes the table and every RPC to browser roles", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/grant execute .* to (?:anon|authenticated|public)/i);
    expect(migration).not.toMatch(/create policy/i);
  });

  it("keeps request, review, governance, leave and withdrawal atomic and server-only", () => {
    for (const operation of ["request", "review", "govern", "leave", "withdraw"]) {
      expect(migration).toContain(`public.comun_${operation}_solidarity_organization_access`);
    }
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("COMUN_SOLIDARITY_ACCESS_PLATFORM_REVIEW_FORBIDDEN");
    expect(migration).toContain("COMUN_SOLIDARITY_ACCESS_ORGANIZATION_REVIEW_FORBIDDEN");
    expect(server).toContain('import "server-only"');
    expect(actions).toContain('"use server"');
    expect(actions).toContain("requireCommunitySession");
    expect(actions).not.toMatch(/\.from\(["']comun_solidarity_organization_access/);
  });

  it("does not grant economic content writes or propagate social roles", () => {
    expect(migration).not.toMatch(/alter table public\.comun_solidarity_offers/i);
    expect(migration).not.toMatch(/alter table public\.comun_territorial_needs/i);
    expect(migration).not.toMatch(/comun_(?:community|pauta|collective_action|work_group)_memberships?/i);
    expect(actions).not.toMatch(/comun_solidarity_offers|comun_territorial_needs/);
  });

  it("keeps private access fields out of public detail and directory HTML", () => {
    for (const source of [page, directoryPage]) {
      expect(source).not.toMatch(/request_note_private|review_note_private|reviewed_by_user_id|private_contact|internal_notes/);
    }
    expect(directoryPage).toContain("Ver organização");
    expect(directoryPage).not.toContain("Faço parte desta organização");
    expect(page).toContain("Tenho vínculo com esta organização");
    expect(page).toContain("Ver contexto no mapa");
  });

  it("integrates organizations into Minha Participação without a new top-level tab", () => {
    expect(participationPage).toContain('title="Organizações"');
    expect(participationPage).not.toMatch(/\["organizacoes",\s*"/);
  });

  it("places the first-link queue inside the existing organization admin surface", () => {
    expect(organizationAdminPage).toContain("SolidarityOrganizationAccessAdminSection");
    expect(organizationAdminSection).toContain("Primeiros vínculos de organizações");
    expect(organizationAdminSection).toContain("requestNotePrivate");
  });
});
