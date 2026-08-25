import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260825090000_comun_multidomain_assisted_forwarding.sql", import.meta.url),
  "utf8",
);

describe("COMUN A1 migration contract", () => {
  it("extends the existing ledger only to civic_service", () => {
    expect(migration).toContain("civic_service");
    expect(migration).toContain("comun_forwarding_packages");
    expect(migration).not.toMatch(/create table/i);
    expect(migration).not.toMatch(/insert into public\.comun_relata_cases/i);
  });

  it("keeps service-role-only functions and no auto-send", () => {
    expect(migration).toContain("revoke all on function public.comun_civic_assisted_prepare");
    expect(migration).toContain("grant execute on function public.comun_civic_assisted_prepare");
    expect(migration).not.toMatch(/http|fetch|send|whatsapp/i);
  });

  it("preserves idempotent one-package locking and a preview confirmation", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("p_preview_confirmed is not true");
    expect(migration).toContain("withdrawn_at is null");
  });
});

