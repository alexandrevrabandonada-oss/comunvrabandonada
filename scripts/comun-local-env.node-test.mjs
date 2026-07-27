import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local environment forwards only the published local DB contract", async () => {
  const source = await readFile("scripts/comun-local-env.mjs", "utf8");
  assert.match(source, /PR23_DATABASE_URL: local\.DB_URL/);
  assert.match(source, /SUPABASE_PROJECT_REF: "LOCAL_VALIDATION"/);
  assert.match(source, /PR23_ALLOWED_PROJECT_REFS: "LOCAL_VALIDATION"/);
  assert.match(
    source,
    /COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL: local\.DB_URL/,
  );
  assert.match(source, /Destino remoto detectado/);
  assert.match(source, /secrets: "redacted"/);
  assert.doesNotMatch(source, /console\.log\([^\n]*DB_URL/);
});
