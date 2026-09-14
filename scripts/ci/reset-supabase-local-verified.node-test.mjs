import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync(
  "scripts/ci/reset-supabase-local-verified.sh",
  "utf8",
);
const workflow = readFileSync(
  ".github/workflows/comun-quality-performance.yml",
  "utf8",
);

test("reset recovery is limited to recognized gateway transients after migration completion", () => {
  assert.match(script, /UPSTREAM_502/);
  assert.match(script, /UPSTREAM_503/);
  assert.match(script, /UPSTREAM_504/);
  assert.match(
    script,
    /Applying migration 20260912161253_radio_editorial_revision_identity\.sql/,
  );
  assert.match(script, /Seeding data from supabase\/seed\.sql/);
  assert.match(script, /supabase_migrations\.schema_migrations/);
});

test("recovery requires DB, Auth, PostgREST, and Storage health without logging env", () => {
  assert.match(script, /psql/);
  assert.match(script, /auth\/v1\/health/);
  assert.match(script, /rest\/v1\//);
  assert.match(script, /storage\/v1\/bucket/);
  assert.doesNotMatch(script, /echo \"\$local_env\"/);
});

test("quality workflow uses one verified reset path and always prepares diagnostics", () => {
  assert.equal(
    (workflow.match(/reset-supabase-local-verified\.sh/g) ?? []).length,
    2,
  );
  assert.match(workflow, /mkdir -p \.ci-artifacts\/p1-quality-a11y/);
  assert.match(workflow, /Envelope sanitizado antes da primeira escrita/);
});
