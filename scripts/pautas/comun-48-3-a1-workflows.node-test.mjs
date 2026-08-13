import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const preflight = readFileSync(".github/workflows/comun-48-3-a1-preflight.yml", "utf8");
const disposable = readFileSync(".github/workflows/comun-48-3-a1-disposable.yml", "utf8");
const activation = readFileSync(".github/workflows/comun-48-3-a1-activation.yml", "utf8");
const wave = readFileSync("scripts/pautas/run-48-3-a1-production-wave.sh", "utf8");
const observatoryPreflight = readFileSync(".github/workflows/comun-48-2-a-remote-preflight.yml", "utf8");
const forwardingPreflight = readFileSync(".github/workflows/comun-p6c-c-preflight.yml", "utf8");

test("A1 preflight is read-only across candidate and promoted lifecycle", () => {
  assert.match(preflight, /begin read only;/);
  assert.match(preflight, /REMOTE_PLAN_EXACT_ONE/);
  assert.match(preflight, /REMOTE_PLAN_EMPTY_POST_PROMOTION/);
  assert.match(preflight, /A1_PREFLIGHT_MODE=candidate/);
  assert.match(preflight, /A1_PREFLIGHT_MODE=promoted/);
  assert.match(preflight, /publicEvidenceMigrationApplied/);
  assert.match(preflight, /\*_comun_pautas_vivas_public_evidence\.sql/);
  assert.doesNotMatch(preflight, /supabase[^\n]*--include-all|supabase migration repair|supabase db reset/);
});

test("A1 disposable proof preserves legacy rows and denies public inserts", () => {
  assert.match(disposable, /Existing evidence/);
  assert.match(disposable, /Legacy value/);
  assert.match(disposable, /set role anon/);
  assert.match(disposable, /set role authenticated/);
  assert.match(disposable, /COMUN_48_3_A1_DISPOSABLE_MIGRATION_GREEN/);
});

test("A1 activation is exact-head, one migration and flags off before wave 1", () => {
  assert.match(activation, /promote-migration-flags-off, flags-off, wave1-pautas-vivas/);
  assert.match(activation, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_MAIN_SHA"/);
  assert.match(activation, /COMUN_48_3_A1_REMOTE_MIGRATION_GREEN/);
  assert.doesNotMatch(activation, /supabase[^\n]*--include-all|supabase migration repair|supabase db reset/);
  assert.match(wave, /COMUN_PAUTAS_VIVAS_CORE_ENABLED production/);
  assert.match(wave, /businessWrites=0/);
  assert.match(wave, /rollback/);
});

test("historical preflights classify the scoped A1 migration as unrelated", () => {
  assert.match(observatoryPreflight, /COMUN_48_2_A_UNRELATED_MIGRATION_NOT_APPLICABLE/);
  assert.match(forwardingPreflight, /COMUN_P6C_C_UNRELATED_MIGRATION_NOT_APPLICABLE/);
  assert.match(observatoryPreflight, /_comun_pautas_vivas_public_evidence\.sql/);
  assert.match(forwardingPreflight, /_comun_pautas_vivas_public_evidence\.sql/);
});
