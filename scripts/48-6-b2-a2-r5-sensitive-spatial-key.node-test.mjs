import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const runner = read("scripts/run-48-6-b2-a2-r5-sensitive-spatial-key.sh");
const legacy = read("scripts/run-48-6-b2-a2-r1-secret-provisioning.sh");
const workflow = read(".github/workflows/comun-48-6-b2-a2-r5-sensitive-spatial-key.yml");

test("R5 is exact-main Production-only and does not run a migration", () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /environment: production/);
  assert.match(runner, /EXPECTED_MAIN_SHA/);
  assert.doesNotMatch(runner, /supabase\s+(?:db\s+push|migration|start)|apply_migration|COMUN_RELATA_COLLECTIVE_ENABLED.*enabled|COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.*enabled/i);
});

test("R5 keeps location untouched and provisions only an independent sensitive spatial key", () => {
  assert.match(runner, /locationKey.*p3b_runtime_validated/);
  assert.match(runner, /randomBytes\(32\)/);
  assert.match(runner, /COMUN_RELATA_SPATIAL_HMAC_KEY production --sensitive/);
  assert.doesNotMatch(runner, /COMUN_RELATA_LOCATION_ENCRYPTION_KEY production --sensitive/);
  assert.doesNotMatch(runner, /vercel[^\n]*env\s+pull/i);
  assert.doesNotMatch(runner, /decrypt=true|env\.get\(['"]COMUN_RELATA_(?:LOCATION_ENCRYPTION|SPATIAL_HMAC)_KEY|Buffer\.from\([^\n]*LOCATION/i);
  assert.match(runner, /secretReadback:false/);
});

test("R5 uses metadata-only race and postchecks with no artifact values", () => {
  assert.match(runner, /BLOCKED_SPATIAL_KEY_RACE_CONFLICT/);
  assert.match(runner, /BLOCKED_KEY_POSTCHECK/);
  assert.match(runner, /artifactSanitizerActuallyExecuted:true/);
  assert.doesNotMatch(runner, /--data[^\n]*@.*spatial\.key/);
  assert.doesNotMatch(runner, /productionKey|secretValue|ciphertext/);
  assert.match(runner, /POSTCHECK_JSON/);
  assert.match(runner, /const written=writtenArg==='true'/);
  assert.match(runner, /provenance:'r5_independent_random_32_bytes'/);
  assert.doesNotMatch(runner, /ARTIFACT_DIR\/postcheck\.json/);
});

test("legacy R1 entrypoint has the write-only sensitive contract too", () => {
  assert.doesNotMatch(legacy, /vercel(?:@[^ ]+)?\s+env\s+pull/i);
  assert.doesNotMatch(legacy, /type: "encrypted"|keysDistinct|validShape/);
  assert.match(legacy, /env add COMUN_RELATA_SPATIAL_HMAC_KEY production --sensitive/);
  assert.match(legacy, /matches\[0\]\.type === "sensitive"/);
});
