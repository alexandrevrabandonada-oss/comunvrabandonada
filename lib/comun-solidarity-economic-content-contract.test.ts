import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(resolve(root, "supabase/migrations/20260816011500_comun_solidarity_economic_content_writes.sql"), "utf8");
const publicAdapter = readFileSync(resolve(root, "lib/comun-solidarity-economy.ts"), "utf8");
const serverAdapter = readFileSync(resolve(root, "lib/server/comun-solidarity-economic-content.ts"), "utf8");
const actions = readFileSync(resolve(root, "app/comun/cooperativas/[slug]/economic-actions.ts"), "utf8");

describe("COMUN 48.4-A3 database and privacy contract", () => {
  it("adds one audit structure, not another economic root", () => {
    expect(migration).toContain("create table private.comun_solidarity_economic_content_events");
    expect(migration).not.toMatch(/create table public\.(?:product|listing|inventory|order|exchange|cart|solidarity_need)/i);
    expect(migration).not.toContain("comun_mobilization_actions");
  });

  it("keeps audit private and every RPC service-role-only", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("revoke all on table private.comun_solidarity_economic_content_events from public, anon, authenticated");
    expect(migration.match(/revoke all on function public\.comun_(?:create|mutate)_solidarity_(?:offer|need)_by_access_v1/g)).toHaveLength(4);
    expect(migration.match(/grant execute on function public\.comun_(?:create|mutate)_solidarity_(?:offer|need)_by_access_v1/g)).toHaveLength(4);
  });

  it("revalidates active editor/facilitator and all A1 organization gates in SQL", () => {
    for (const fragment of [
      "access.state = 'active'",
      "access.role in ('editor','facilitator')",
      "organization.status in ('active','forming')",
      "organization.verification_status in ('source_checked','verified')",
      "territory.visibility = 'public'",
      "territory.status in ('active','monitoring')",
      "territory.verification_status in ('source_checked','verified')",
    ]) expect(migration).toContain(fragment);
  });

  it("provides database idempotency, actor rate limits and no raw IP", () => {
    expect(migration).toContain("request_id uuid not null unique");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("interval '24 hours'");
    expect(migration).toContain("interval '1 hour'");
    expect(migration).not.toMatch(/ip_address|raw_ip|user_agent/i);
  });

  it("publishes normal content atomically without a universal human queue", () => {
    expect(migration).toContain("'published', v_now, v_now");
    expect(migration).toContain("'open', p_organization_territory_id");
    expect(migration).not.toMatch(/insert into public\.comun_solidarity_offers[\s\S]{0,1000}'pending_review'/i);
    expect(migration).toContain("COMUN_SOLIDARITY_ECONOMIC_CONTENT_BLOCKED");
  });

  it("supports reversible state changes with no hard delete", () => {
    for (const operation of ["offer.pause", "offer.resume", "offer.renew", "offer.archive", "need.partially_met", "need.met", "need.cancel", "need.reopen"])
      expect(migration).toContain(operation);
    expect(migration).not.toMatch(/delete\s+from\s+public\.comun_(?:solidarity_offers|territorial_needs)/i);
  });

  it("keeps actor, access and audit outside the public DTO", () => {
    expect(publicAdapter).not.toMatch(/actorAccessId|actorUserId|requestId|economicContentEvents/);
    expect(serverAdapter).not.toMatch(/select\([^)]*(?:actor_member_user_id|actor_access_id|request_id)/);
    expect(actions).not.toMatch(/\.from\(["']comun_(?:solidarity_offers|territorial_needs)["']\)[\s\S]*?\.insert/);
  });

  it("never propagates social access or writes legacy actions", () => {
    for (const forbidden of ["comun_pauta_memberships", "comun_community_memberships", "comun_collective_action_participants", "comun_community_work_groups", "comun_mobilization_actions"])
      expect(migration + actions).not.toContain(forbidden);
  });
});
