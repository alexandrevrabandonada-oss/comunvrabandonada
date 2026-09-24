import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Production PRE capture uses trusted main code and read-only catalog queries", () => {
  const workflow = readFileSync(
    ".github/workflows/comun-49-2-private-release-pre-capture.yml",
    "utf8",
  );
  assert.match(workflow, /types: \[opened\]/);
  assert.match(workflow, /ref: 438cf7e7bb630b08ccac348d3e0859dda2c02692/);
  assert.match(workflow, /persist-credentials: false/);
  assert.equal((workflow.match(/SUPABASE_DB_URL:/g) ?? []).length, 1);
  assert.match(workflow, /PGOPTIONS: -c default_transaction_read_only=on/);
  assert.match(workflow, /begin read only;/);
  assert.match(workflow, /current_setting\('transaction_read_only'\)/);
  assert.match(workflow, /capture-promotion-fingerprint\.mjs/);
  assert.match(workflow, /COMUN_49_2_PRIVATE_RELEASE_PRODUCTION_DRIFT/);
  assert.doesNotMatch(
    workflow,
    /CREATE\s|ALTER\s|DROP\s|INSERT\s|UPDATE\s|DELETE\s|supabase db lint/i,
  );
});
