import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMUN_SOLIDARITY_ONBOARDING_DEFERRED,
  COMUN_SOLIDARITY_ONBOARDING_RESOLVED,
  isComunSolidarityOrganizationOnboardingEnabled,
  normalizeSolidarityOnboardingName,
  parseSolidarityOnboardingOrganizationType,
} from "./comun-solidarity-organization-onboarding";

const root = process.cwd();
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260816181040_comun_solidarity_organization_onboarding.sql"),
  "utf8",
);
const publicDirectory = readFileSync(
  resolve(root, "lib/comun-solidarity-economy.ts"),
  "utf8",
);
const serverAdapter = readFileSync(
  resolve(root, "lib/server/comun-solidarity-organization-onboarding.ts"),
  "utf8",
);
const actions = readFileSync(
  resolve(root, "app/comun/cooperativas/nova/actions.ts"),
  "utf8",
);
const startForm = readFileSync(
  resolve(root, "components/comun-solidarity-organization-onboarding-form.tsx"),
  "utf8",
);

describe("COMUN 48.4-A4 onboarding contract", () => {
  it("is fail-closed behind A1 and A2", () => {
    expect(isComunSolidarityOrganizationOnboardingEnabled({
      COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_ENABLED: "enabled",
      COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "enabled",
      COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "enabled",
    })).toBe(true);
    expect(isComunSolidarityOrganizationOnboardingEnabled({
      COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_ENABLED: "enabled",
      COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "disabled",
      COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "enabled",
    })).toBe(false);
  });

  it("uses one private workflow and existing public roots", () => {
    expect(migration).toContain("create table private.comun_solidarity_organization_onboarding");
    expect(migration).not.toMatch(/create table public\.(?:solidarity_organizations_v2|seller_account|business_account|store|merchant)/i);
    expect(migration).toContain("insert into public.comun_hub_territories");
    expect(migration).toContain("insert into public.comun_territorial_organizations");
    expect(migration).toContain("insert into public.comun_territorial_sources");
    expect(migration).not.toContain("insert into public.comun_territorial_contributions");
  });

  it("keeps draft private and creates public roots only in approval", () => {
    const draft = migration.slice(
      migration.indexOf("comun_create_solidarity_organization_onboarding_draft_v1"),
      migration.indexOf("comun_update_solidarity_organization_onboarding_v1"),
    );
    expect(draft).toContain("state := 'draft'");
    expect(draft).not.toMatch(/insert into public\.comun_(?:hub_territories|territorial_organizations|solidarity_offers|territorial_needs)/);
    expect(migration).toContain("comun_approve_solidarity_organization_onboarding_v1");
  });

  it("promotes a conservative public identity and first facilitator atomically", () => {
    for (const fragment of [
      "'monitoring'",
      "'public', 'source_checked'",
      "'forming'",
      "'facilitator', 'facilitator', 'active'",
      "'platform'",
      "case when p_confirmed_organization_type = 'cooperative' then 'cooperative' else 'solidarity_collective' end",
    ]) expect(migration).toContain(fragment);
    expect(migration).not.toContain("'public', 'verified'");
  });

  it("requires one canonical platform admin and evidence", () => {
    expect(migration).toContain("admin_user.role = 'admin'");
    expect(migration).toContain("p_source_kind not in ('public_url','platform_review','operational_confirmation')");
    expect(migration).toContain("p_source_kind = 'public_url' and v_source_url is null");
    expect(migration).not.toMatch(/active.*facilitator[\s\S]{0,300}onboarding_assert_admin/i);
  });

  it("has database idempotency, user rate limit and no raw IP", () => {
    expect(migration).toContain("create_request_id uuid not null unique");
    expect(migration).toContain("last_mutation_request_id uuid unique");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("interval '24 hours'");
    expect(migration).not.toMatch(/ip_address|raw_ip|user_agent/i);
  });

  it("keeps the workflow and RPCs service-role-only", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("revoke all on table private.comun_solidarity_organization_onboarding from public, anon, authenticated");
    const revokedOnboardingRpcs = migration.split("\n").filter((line) =>
      line.startsWith("revoke all on function public.comun_") &&
      line.includes("solidarity_organization_onboarding"),
    );
    expect(revokedOnboardingRpcs.length).toBeGreaterThanOrEqual(8);
    expect(migration).not.toMatch(/grant execute[^;]+to (?:anon|authenticated)/i);
  });

  it("never propagates into economic content or social objects", () => {
    for (const forbidden of [
      "insert into public.comun_solidarity_offers",
      "insert into public.comun_territorial_needs",
      "insert into public.comun_community_memberships",
      "insert into public.comun_pauta_memberships",
      "insert into public.comun_collective_action_participants",
      "insert into public.comun_community_work_groups",
      "insert into public.comun_mobilization_actions",
    ]) expect(migration).not.toContain(forbidden);
  });

  it("keeps private fields out of the public directory contract", () => {
    for (const privateField of [
      "applicantUserId",
      "participationNotePrivate",
      "reviewMessagePrivate",
      "continuationToken",
      "createRequestId",
    ]) expect(publicDirectory).not.toContain(privateField);
    expect(serverAdapter).not.toMatch(/\.from\(["']comun_solidarity_organization_onboarding["']\)/);
    expect(actions).not.toMatch(/\.from\([^)]*\)\.(?:insert|update|delete)/);
  });

  it("preserves pre-auth draft without query data or auto-submit", () => {
    expect(startForm).toContain("sessionStorage");
    expect(startForm).toContain("comun:a4:organization-onboarding:name:v1");
    expect(startForm).not.toMatch(/organization_name=.*(?:searchParams|URLSearchParams)/);
    expect(startForm).not.toMatch(/useEffect\([\s\S]{0,400}requestSubmit/);
  });

  it("keeps scope decisions explicit", () => {
    expect(COMUN_SOLIDARITY_ONBOARDING_RESOLVED).toContain("A4");
    expect(COMUN_SOLIDARITY_ONBOARDING_DEFERRED.individualProducers).toContain("DEFERRED");
    expect(COMUN_SOLIDARITY_ONBOARDING_DEFERRED.privateConnection).toContain("A5");
    expect(COMUN_SOLIDARITY_ONBOARDING_DEFERRED.legacyTerritorialContribution).toBe("LEGACY_KEEP_COMPAT");
  });

  it("normalizes the minimum without adding commercial taxonomy", () => {
    expect(normalizeSolidarityOnboardingName("  Rede   do Sul  ")).toBe("Rede do Sul");
    expect(normalizeSolidarityOnboardingName("x")).toBeNull();
    expect(parseSolidarityOnboardingOrganizationType("cooperative")).toBe("cooperative");
    expect(parseSolidarityOnboardingOrganizationType("company")).toBeNull();
  });
});
