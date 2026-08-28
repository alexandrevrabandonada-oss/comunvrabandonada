import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("B2-A2 migration stays additive and wallet-owned", () => {
  const migration = read(
    "supabase/migrations/20260827120000_comun_denuncias_private_collective_matching.sql",
  );
  assert.doesNotMatch(migration, /create\s+table/i);
  assert.match(migration, /comun_relata_associate_collective_for_wallet/);
  assert.match(migration, /comun_relata_public_projection_consents/);
  assert.match(migration, /consent\.scope\s*=\s*'collective_projection'/);
  assert.match(migration, /relata-match-v1/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /match_key\.key_hash=any\(p_spatial_keys\)/);
  assert.match(migration, /state='active'/);
  assert.match(migration, /auto_link_high_confidence/);
  assert.match(migration, /set search_path=pg_catalog,private,public/);
  assert.doesNotMatch(migration, /set search_path='pg_catalog,private,public'/);
  assert.match(migration, /revoke all on function public\.comun_relata_associate_collective_for_wallet/);
  assert.match(migration, /grant execute on function public\.comun_relata_associate_collective_for_wallet[\s\S]*to service_role/);
});

test("B2-A2 disposable workflow never promotes the historical local migration", () => {
  const workflow = read(".github/workflows/comun-48-6-b2-a2-disposable.yml");
  assert.match(workflow, /supabase\/setup-cli/);
  assert.match(workflow, /supabase start/);
  assert.match(workflow, /comun-denuncias-b2-a2-disposable\.sql/);
  assert.doesNotMatch(workflow, /supabase\/local-migrations\/20260803192419/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL/);
});

test("B2-A2 production rollout scopes the plan and flag mutation", () => {
  const runner = read("scripts/run-48-6-b2-a2-production.sh");
  const workflow = read(".github/workflows/comun-48-6-b2-a2-production.yml");
  assert.match(runner, /20260827120000_comun_denuncias_private_collective_matching\.sql/);
  assert.match(runner, /supabase db push --db-url .*--dry-run/);
  assert.match(runner, /sidewalk\.sql/);
  assert.match(runner, /restore_sidewalk/);
  assert.doesNotMatch(
    runner,
    /(?:supabase|npx)[^\n]*(?:--include-all|migration repair|db reset|\bseed\b)/i,
  );
  assert.match(runner, /COMUN_RELATA_COLLECTIVE_ENABLED/);
  assert.match(runner, /value":"enabled/);
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /comun-48-6-b2-a2-production/);
});

test("future production runner validates crypto key metadata without secret readback", () => {
  const runner = read("scripts/run-48-6-b2-a2-production.sh");
  assert.match(runner, /type==='sensitive'/);
  assert.match(runner, /R5_BLOCKED_LOCATION_KEY_METADATA_DRIFT/);
  assert.match(runner, /R5_BLOCKED_SPATIAL_HMAC_KEY_NOT_READY/);
  assert.match(runner, /secretReadback:false/);
  assert.doesNotMatch(runner, /env\.get\(['"]COMUN_RELATA_(?:LOCATION_ENCRYPTION|SPATIAL_HMAC)_KEY/);
  assert.doesNotMatch(runner, /Buffer\.from\(env\[/);
  assert.doesNotMatch(runner, /keysDistinct\s*=|IDENTICAL_KEYS/);
});

test("B2-A2 API and holder panel expose no internal relationship identifiers", () => {
  const route = read("app/api/comun/relata/evidence/grouping/route.ts");
  const panel = read(
    "app/comun/minha-participacao/public-projection-consent-panel.tsx",
  );
  assert.match(route, /walletItemId/);
  assert.match(route, /collectiveConnection/);
  assert.doesNotMatch(route, /associate_collective\("/);
  assert.doesNotMatch(route, /case_id|report_id|membership_id|collective_case_id/);
  assert.match(panel, /waiting/);
  assert.match(panel, /matched/);
  assert.match(panel, /outro relato compatível/);
  assert.doesNotMatch(panel, /collective_case_id|membership_id|case_id|report_id/);
});

test("B2-A2 stops implicit matching before explicit opt-in", () => {
  const reportRoute = read("app/api/comun/relata/route.ts");
  const locationRoute = read("app/api/comun/relata/evidence/location/route.ts");
  assert.doesNotMatch(reportRoute, /associateComunRelataCollective/);
  assert.doesNotMatch(locationRoute, /associateComunRelataCollective/);
});

test("B2-A2 matcher remains deterministic and excludes text/AI signals", () => {
  const evidence = read("lib/comun-relata-evidence.ts");
  assert.match(evidence, /COMUN_RELATA_MATCH_RULE_VERSION\s*=\s*"relata-match-v1"/);
  assert.match(evidence, /HMAC-SHA256|createHmac/);
  assert.doesNotMatch(evidence, /embedding|openai|llm|similarity/i);
});
