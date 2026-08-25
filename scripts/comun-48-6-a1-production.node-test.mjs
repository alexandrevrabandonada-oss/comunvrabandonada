import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  ".github/workflows/comun-48-6-a1-production.yml",
  "utf8",
);
const runner = readFileSync("scripts/run-48-6-a1-production.sh", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260825090000_comun_multidomain_assisted_forwarding.sql",
  "utf8",
);

test("A1 production runner is exact-SHA and concurrency protected", () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /expected_main_sha/);
  assert.match(workflow, /group: comun-48-6-a1-production/);
  assert.match(runner, /git rev-parse HEAD/);
  assert.match(runner, /sha256sum/);
  assert.match(runner, /begin read only/);
  assert.match(runner, /trap restore EXIT/);
});

test("A1 production runner cannot use broad or destructive migration operations", () => {
  assert.doesNotMatch(
    runner,
    /supabase db push[^\n]*--include-all|supabase migration repair|supabase db reset|supabase seed/i,
  );
  assert.doesNotMatch(runner, /VERCEL_TOKEN|env (add|rm)|deploy --prod/i);
  assert.doesNotMatch(migration, /fetch\(|https?:\/\/|whatsapp/i);
});

test("A1 migration remains a narrow extension of the existing ledger", () => {
  assert.doesNotMatch(migration, /create table/i);
  assert.match(migration, /civic_service/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /p_preview_confirmed is not true/);
  assert.match(migration, /grant execute on function public\.comun_civic_assisted_prepare[\s\S]*service_role/);
  assert.match(migration, /revoke all on function public\.comun_civic_assisted_prepare[\s\S]*authenticated/);
});
