import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260814160000_comun_pauta_low_friction_creation.sql"),
  "utf8",
);
const action = readFileSync(resolve("app/comun/pautas/nova/actions.ts"), "utf8");
const form = readFileSync(resolve("app/comun/pautas/nova/pauta-creation-form.tsx"), "utf8");

describe("E3 database and server boundary", () => {
  it("creates the canonical Pauta, participant membership and optional evidence in one RPC", () => {
    expect(migration).toContain("insert into public.comun_pauta_spaces");
    expect(migration).toContain("insert into public.comun_pauta_memberships");
    expect(migration).toContain("insert into public.comun_pauta_evidence_items");
    expect(migration).toContain("'participant', 'active'");
    expect(migration).toContain("'observing', 'public'");
    expect(migration).toContain("'received', 'normal'");
  });

  it("keeps the RPC service-only and stores only hashes in its private guard", () => {
    expect(migration).toMatch(/security definer\s+set search_path = 'pg_catalog'/);
    expect(migration).toMatch(/revoke all on function[\s\S]+from public, anon, authenticated/);
    expect(migration).toMatch(/grant execute on function[\s\S]+to service_role/);
    expect(migration).not.toMatch(/grant execute[\s\S]+to (?:anon|authenticated)/);
    expect(migration).toContain("actor_hash bytea");
    expect(migration.match(/create table private\.comun_pauta_creation_requests \([\s\S]+?\n\);/)?.[0]).not.toContain("actor_user_id");
  });

  it("has durable idempotency, strong duplicate and rate-limit guards", () => {
    expect(migration).toContain("request_hash bytea primary key");
    expect(migration).toContain("duplicate_candidate");
    expect(migration).toContain("recent_actor_hour >= 3");
    expect(migration).toContain("recent_actor_day >= 10");
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  it("re-resolves evidence server-side and never accepts citation JSON from the form", () => {
    expect(action).toContain("resolveCurrentPublicEvidenceReference(evidenceRef)");
    expect(action).toContain("p_public_evidence: citation");
    expect(form).toContain('name="evidence_ref"');
    expect(form).not.toContain('name="citation"');
    expect(form).not.toContain("public_evidence_payload");
  });

  it("preserves the pre-auth draft locally without auto-submit", () => {
    expect(form).toContain("sessionStorage.setItem(DRAFT_KEY, question)");
    expect(form).toContain("window.location.assign(loginHref)");
    expect(form).not.toContain("requestSubmit");
    expect(form).not.toContain("localStorage");
  });

  it("does not write communities, circles, actions, dossiers or private Relata data", () => {
    for (const forbidden of [
      "comun_community_memberships",
      "comun_construction_circles",
      "comun_collective_actions",
      "comun_mobilization_actions",
      "comun_pauta_dossiers",
      "comun_reports",
      "comun_relata_cases",
      "private_location",
      "wallet",
      "attachments",
    ]) {
      expect(`${migration}\n${action}`.toLowerCase()).not.toContain(forbidden);
    }
  });
});
