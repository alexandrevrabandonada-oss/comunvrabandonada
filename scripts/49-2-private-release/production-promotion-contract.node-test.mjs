import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  ".github/workflows/comun-49-2-private-schema-promotion.yml",
  "utf8",
);
const runner = readFileSync(
  "scripts/49-2-private-release/run-production-promotion.mjs",
  "utf8",
);

test("49.2 promotion is main-only, owner-authorized and issue-gated", () => {
  assert.match(workflow, /issues:\s*\n\s*types: \[labeled\]/);
  assert.match(workflow, /github\.event\.label\.name == 'comun:promover'/);
  assert.match(
    workflow,
    /github\.event\.issue\.title == 'COMUN 49\.2 private schema promotion'/,
  );
  assert.match(workflow, /AUTHOR_ASSOCIATION.*OWNER/s);
  assert.match(workflow, /COMUN_49_2_PRODUCTION_SCHEMA_WRITE/);
  assert.match(workflow, /git ls-remote origin refs\/heads\/main/);
  assert.doesNotMatch(workflow, /pull_request:/);
});

test("49.2 promotion requires a fresh read-only PRE before write", () => {
  assert.match(workflow, /Fresh Production PRE — read only/);
  assert.match(workflow, /PGOPTIONS: -c default_transaction_read_only=on/);
  assert.match(workflow, /--mode=preflight/);
  assert.match(runner, /classification\.state !== "PRE"/);
  assert.match(runner, /COMUN_49_2_PRIVATE_SCHEMA_PREFLIGHT_NOT_PRE/);
});

test("49.2 write path uses only the proven bundle runner", () => {
  assert.match(workflow, /--mode=promote/);
  assert.match(runner, /rehearsePrivateReleasePromotion/);
  assert.match(runner, /adapter\.applyMigration/);
  assert.match(runner, /adapter\.recordLedger/);
  assert.doesNotMatch(workflow, /supabase db push|apply_migration|psql .*-(?:c|f)/i);
  assert.doesNotMatch(workflow, /20260901000000.*psql|20260924015511.*psql/i);
});

test("49.2 POST remains private and fail-closed", () => {
  assert.match(runner, /after\.classification\.state !== "POST"/);
  assert.match(runner, /bridges\.rows\.length !== 4/);
  assert.match(runner, /public_execute === true/);
  assert.match(runner, /authenticated_execute === true/);
  assert.match(runner, /service_role_execute !== true/);
  assert.match(runner, /publicRelations\.rows\.length !== 0/);
  assert.match(runner, /bundleLedgerState: "PRESENT_ACCEPTED"/);
  assert.match(workflow, /Capture recovery state on failure/);
});

test("49.2 workflow never opens R3 or mutates collective business data", () => {
  assert.doesNotMatch(workflow, /candidate|projection|map feature|auth\.users|collective_entity_server_create/i);
  assert.match(workflow, /Public application smoke — no collective mutation/);
  assert.match(runner, /publicProjectionCreated: false/);
  assert.match(runner, /r3Opened: false/);
});

test("49.2 inspect persists raw divergent state without write authorization", () => {
  assert.match(
    runner,
    /if \(mode === "inspect"\)[\s\S]*const capture = await adapter\.capture\(\)[\s\S]*classifyPrivateRelease\(capture/,
  );
  assert.match(runner, /COMUN_49_2_PRIVATE_SCHEMA_INSPECT/);
});

test("49.2 recovery diagnostic is exact-main and read-only", () => {
  const diagnostic = readFileSync(
    ".github/workflows/comun-49-2-private-schema-diagnostic.yml",
    "utf8",
  );
  assert.match(diagnostic, /COMUN 49\.2 private schema diagnostic/);
  assert.match(diagnostic, /github\.event\.label\.name == 'comun:promover'/);
  assert.match(diagnostic, /AUTHOR_ASSOCIATION.*OWNER/s);
  assert.match(diagnostic, /git ls-remote origin refs\/heads\/main/);
  assert.match(diagnostic, /PGOPTIONS: -c default_transaction_read_only=on/);
  assert.match(diagnostic, /--mode=inspect/);
  assert.doesNotMatch(
    diagnostic,
    /COMUN_49_2_SCHEMA_WRITE_AUTHORIZATION|--mode=promote/,
  );
});
