import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("supabase/migrations/20260815184529_comun_solidarity_offers.sql"), "utf8");
const adapter = readFileSync(resolve("lib/server/comun-solidarity-economy-directory.ts"), "utf8");

describe("48.4-A1 storage and server boundary", () => {
  it("creates exactly the canonical Offer object with lifecycle, validity, and modality constraints", () => {
    expect(migration).toContain("create table public.comun_solidarity_offers");
    expect(migration).toContain("organization_territory_id uuid not null");
    expect(migration).toContain("status <> 'published'");
    expect(migration).toContain("valid_until > published_at");
    expect(migration).toContain("mutual_aid");
    expect(migration).not.toMatch(/create table public\.(?:product|listing|inventory|order|exchange|cart)/i);
    expect(migration).not.toMatch(/insert into public\.comun_solidarity_offers/i);
  });

  it("closes direct clients and grants CRUD only to service_role", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("force row level security");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/create policy/i);
  });

  it("uses one bounded batched server projection and never selects private economy fields", () => {
    expect(adapter).toContain('import "server-only"');
    expect(adapter).toContain("Promise.all");
    expect(adapter).toContain(".limit(QUERY_LIMIT)");
    for (const forbidden of ["private_contact", "internal_notes", "responsible_internal", "action_id", "task_id", "comun_territorial_need_interests", "listPublicMapData"]) {
      expect(adapter).not.toContain(forbidden);
    }
    expect(adapter).not.toMatch(/\.select\(["'`]\*["'`]\)/);
  });
});
