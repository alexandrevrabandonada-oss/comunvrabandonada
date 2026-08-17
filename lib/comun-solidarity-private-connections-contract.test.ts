import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260816224228_comun_solidarity_private_connections.sql",
  "utf8",
);
const publicContract = readFileSync("lib/comun-solidarity-economy.ts", "utf8");
const publicDirectory = readFileSync(
  "lib/server/comun-solidarity-economy-directory.ts",
  "utf8",
);
const detailPage = readFileSync("app/comun/cooperativas/[slug]/page.tsx", "utf8");
const actions = readFileSync(
  "app/comun/cooperativas/[slug]/connection-actions.ts",
  "utf8",
);

describe("A5 database and privacy contract", () => {
  it("extends the canonical need interest and creates only the private offer interest root", () => {
    expect(migration).toContain("alter table public.comun_territorial_need_interests");
    expect(migration).toContain("create table private.comun_solidarity_offer_interests");
    expect(migration).not.toMatch(/create table .*need.*interest/i);
    expect(migration).not.toMatch(/create table .*(order|chat|payment|reservation|exchange)/i);
  });

  it("keeps tables and RPCs closed to clients", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toMatch(/revoke all on table private\.comun_solidarity_offer_interests from public, anon, authenticated/);
    for (const rpc of [
      "comun_create_solidarity_offer_interest_v1",
      "comun_create_solidarity_need_interest_v1",
      "comun_review_solidarity_connection_v1",
      "comun_withdraw_solidarity_connection_v1",
    ]) {
      expect(migration).toContain(`revoke all on function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
    }
  });

  it("enforces idempotency, live uniqueness, cooldown and bounded abuse", () => {
    expect(migration).toContain("create_request_id uuid not null unique");
    expect(migration).toContain("comun_territorial_need_interests_request_idx");
    expect(migration).toContain("state in ('pending','accepted')");
    expect(migration).toContain("status in ('pending','accepted')");
    expect(migration).toContain("interval '24 hours'");
    expect(migration).toContain(">= 10");
    expect(migration).toContain(">= 20");
  });

  it("redacts protected contact on reject and withdrawal", () => {
    expect(migration.match(/contact_private=null/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toContain("consent_to_contact=false");
    expect(migration).toContain("case when interest.state='accepted' then interest.contact_private else null end");
    expect(migration).toContain("case when interest.status='accepted' then interest.contact_private else null end");
  });

  it("requires exact subject and organization gates without social propagation", () => {
    expect(migration).toContain("offer.status <> 'published'");
    expect(migration).toContain("v_need.organization_territory_id is null");
    expect(migration).toContain("state='active' and role in ('editor','facilitator')");
    for (const forbidden of [
      "comun_community_memberships",
      "comun_pauta_memberships",
      "comun_collective_action_participations",
      "comun_community_work_groups",
    ]) expect(migration).not.toContain(forbidden);
  });

  it("does not add private connection data or counts to public DTOs", () => {
    for (const source of [publicContract, publicDirectory]) {
      expect(source).not.toMatch(/message_private|contact_private|member_user_id|reviewed_by_access_id|consent_version|offer_interests/);
    }
    expect(detailPage).not.toMatch(/connectionCount|interestCount|participantCount/);
  });

  it("uses authenticated server actions and never auto-attaches private systems", () => {
    expect(actions).toContain("getCommunitySession()");
    expect(actions).toContain("communityLoginHref(returnTo)");
    expect(actions).not.toMatch(/comun_reports|wallet|attachment|forwarding|private_location/i);
    expect(actions).not.toMatch(/\.from\(/);
  });
});
