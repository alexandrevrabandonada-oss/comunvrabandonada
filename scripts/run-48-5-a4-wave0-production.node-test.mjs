import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/comun-48-5-a4-r2-wave0.yml", "utf8");
const runner = fs.readFileSync("scripts/run-48-5-a4-wave0-production.sh", "utf8");
const flagContract = fs.readFileSync("scripts/ci/a4-wave0-flag-contract.mjs", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260819130000_comun_cultural_progressive_rights.sql", "utf8");

test("Wave 0 is manually dispatched and has no Wave 1 or flag mutation path", () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /env add|env update|set_a4_flag|COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED.*enabled/i);
  assert.doesNotMatch(runner, /env add|env update|set_a4_flag|COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED.*enabled/i);
  assert.match(runner, /test \"\$MODE\" = wave0-only/);
});

test("Only the exact A4 migration can be planned and applied", () => {
  assert.match(runner, /A4_MIGRATION/);
  assert.match(runner, /migration_plan_exact_a4_pending/);
  assert.match(runner, /planned\[0\].*basename.*A4_MIGRATION/);
  assert.doesNotMatch(runner, /supabase db push --include-all/);
  assert.doesNotMatch(runner, /supabase (?:db reset|migration repair)/);
});

test("Snapshot phase is initialized before its derived artifact path", () => {
  assert.match(runner, /local phase="\$1"\s+local output="\$ARTIFACT_DIR\/\$\{phase\}-snapshot\.json"/);
});

test("Migration is schema-only and remains fail-closed", () => {
  assert.doesNotMatch(migration, /\b(?:insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i);
  assert.match(migration, /default 'rights_incomplete'/);
  assert.match(migration, /default 'review_only'/);
  assert.match(migration, /revoke all on/);
  assert.match(runner, /rightsBackfillZero/);
  assert.match(runner, /businessCountDelta=0/);
});

test("A3 is preserved, A4 is audited OFF, and the eight read-only routes are exercised", () => {
  assert.match(flagContract, /COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED/);
  assert.match(runner, /a3Flag=ON_preserved/);
  assert.match(runner, /COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED/);
  assert.match(runner, /smokeRoutes=8/);
  for (const route of ["/comun/acervo", "/comun/acervo/contribuir", "/comun/acervo/arte", "/comun/acervo/arte/contribuir", "/comun/acervo/historias-orais", "/comun/acervo/historias-orais/contribuir", "/comun/radio", "/comun/radio/contribuir"]) assert.match(runner, new RegExp(route.replaceAll("/", "\\/")));
});
