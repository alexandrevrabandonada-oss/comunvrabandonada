import assert from "node:assert/strict";
import test from "node:test";
import { classifyMigrationLane } from "./classify-migration-lane.mjs";

const a3 = "supabase/migrations/20260818120000_comun_cultural_specialized_handoff.sql";
const pauta = "supabase/migrations/20260813124308_comun_pautas_vivas_public_evidence.sql";
const solidarity = "supabase/migrations/20260815184529_comun_solidarity_offers.sql";
const a1 = "supabase/migrations/20260825090000_comun_multidomain_assisted_forwarding.sql";

test("A3 culture migration is not applicable to historical observatory, social, solidarity or P6C-C gates", () => {
  for (const lane of ["48-2-a", "48-3-b0", "48-4-a0", "p6c-c"]) {
    assert.equal(classifyMigrationLane(lane, [a3]).mode, "not_applicable");
  }
});

test("A3 culture migration is not a historical A0 zero-migration failure", () => {
  assert.equal(classifyMigrationLane("48-5-a0", [a3]).mode, "not_applicable");
});

test("A1 culture migration is not applicable to historical solidarity or P6C-C gates", () => {
  for (const lane of ["48-4-a2", "48-4-a4", "48-4-a5", "48-4-a7", "p6c-c", "48-5-a0"]) {
    assert.equal(classifyMigrationLane(lane, [a1]).mode, "not_applicable");
  }
});

test("A1 culture migration is not applicable to the legacy 48.3-A1 gate", () => {
  assert.equal(classifyMigrationLane("48-3-a1", [a1]).mode, "not_applicable");
});

test("A1 culture migration is not applicable to the legacy 48.3-B0 gate", () => {
  assert.equal(classifyMigrationLane("48-3-b0", [a1]).mode, "not_applicable");
});

test("lane-owned migration remains a candidate and does not become N/A", () => {
  assert.equal(classifyMigrationLane("48-4-a0", [solidarity]).mode, "candidate");
  assert.equal(classifyMigrationLane("48-3-a1", [pauta]).mode, "candidate");
});

test("unknown migration ownership fails closed", () => {
  const result = classifyMigrationLane("48-4-a0", ["supabase/migrations/20990101000000_future.sql"]);
  assert.equal(result.mode, "blocked");
  assert.match(result.reason, /unknown migration ownership/);
});

test("mixed lanes fail closed instead of being silently ignored", () => {
  assert.equal(classifyMigrationLane("48-4-a0", [solidarity, a3]).mode, "blocked");
});

test("no migration change is represented separately from N/A", () => {
  assert.equal(classifyMigrationLane("48-5-a0", []).mode, "none");
});
