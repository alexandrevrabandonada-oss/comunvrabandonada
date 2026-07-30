import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL(
    "../.github/workflows/comun-operations-deliverability.yml",
    import.meta.url,
  ),
  "utf8",
);
const migration = await readFile(
  new URL(
    "../supabase/migrations/20260730230044_comun_operations_unified_projection.sql",
    import.meta.url,
  ),
  "utf8",
);

test("workflow separates fixed lanes and does not expose arbitrary SQL", () => {
  for (const mode of [
    "preflight",
    "migrate",
    "sync",
    "rehearsal",
    "postflight",
  ])
    assert.match(workflow, new RegExp(`- ${mode}`));
  assert.doesNotMatch(workflow, /sql_input|query_input|path_input/i);
});

test("PR lane has no remote credentials or writes", () => {
  const prBlock = workflow.slice(
    workflow.indexOf("  verify:"),
    workflow.indexOf("  validate-remote-input:"),
  );
  assert.doesNotMatch(prBlock, /SUPABASE_DB_URL:\s*\$\{\{\s*secrets/);
  assert.doesNotMatch(prBlock, /db push|--sync/);
});

test("migration is additive, private and idempotent by key", () => {
  assert.match(migration, /add column source_domain/);
  assert.match(migration, /idempotency_key_unique/);
  assert.match(migration, /projection_contract/);
  assert.doesNotMatch(migration, /\bdrop table\b|\btruncate\b/i);
  assert.doesNotMatch(migration, /grant\s+.*\s+to\s+(anon|authenticated)/i);
});

test("migration transport excludes the accepted sidewalk ledger drift", () => {
  const migrateBlock = workflow.slice(
    workflow.indexOf("  migrate:"),
    workflow.indexOf("  audit:"),
  );
  assert.match(
    migrateBlock,
    /20260724233256_comun_sidewalk_operational_hardening\.sql/,
  );
  assert.match(
    migrateBlock,
    /6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be/,
  );
  assert.match(migrateBlock, /supabase db push --include-all --dry-run/);
  assert.match(migrateBlock, /verify-comun-operations-push-plan\.mjs/);
  assert.match(migrateBlock, /supabase db push --include-all --db-url/);
  assert.match(migrateBlock, /trap restore_sidewalk EXIT/);
  assert.doesNotMatch(migrateBlock, /--include-all.*sidewalk_migration/);
});

test("static boundary recognizes the historical private grant contract", () => {
  assert.match(workflow, /from \(public, \)\?anon, authenticated/);
  assert.doesNotMatch(migration, /grant\s+.*\s+to\s+(anon|authenticated)/i);
});

test("daily artifacts and the one aggregated issue are sanitized", () => {
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /Operação unificada do COMUN/);
  assert.match(
    workflow,
    /! grep -R -n -E "raw_text\|contact_private\|object_key\|signed_url"/,
  );
  assert.doesNotMatch(workflow, /echo\s+.*\$\{\{\s*secrets\./);
});
