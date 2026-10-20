import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL(
    "../../.github/workflows/comun-experience-coherence.yml",
    import.meta.url,
  ),
  "utf8",
);

// The old CLI can retain stale Kong upstream addresses after db reset.
// v2.113.0's native TS reset reloads Kong before seeding buckets:
// https://github.com/supabase/cli/blob/v2.113.0/apps/cli/src/legacy/shared/db-bootstrap/restart-services.ts
function verifyLocalResetContract(source) {
  assert.match(
    source,
    /uses: supabase\/setup-cli@v1\s+with:\s+version: 2\.113\.0\b/,
  );
  assert.match(source, /timeout-minutes: 45/);
  assert.doesNotMatch(
    source,
    /continue-on-error|--linked|--db-url|--ignore-health-check/,
  );
  const start = source.indexOf(
    "node scripts/run-pauta-action-cycle-local-reset.mjs start",
  );
  const reset = source.indexOf(
    "node scripts/run-pauta-action-cycle-local-reset.mjs reset",
  );
  const browser = source.indexOf("npm run test:e2e:experience-coherence");
  assert.ok(start >= 0 && reset > start && browser > reset);
  assert.equal(source.match(/local-reset\.mjs reset/g)?.length, 2);
  assert.match(
    source,
    /if \(\(reset_status != 0\)\) && grep -q "Error status 502"/,
  );
  assert.match(source, /exit "\$reset_status"/);
  assert.match(source, /npm run build/);
}

test("certified CLI keeps local start, reset, bounded retry and downstream gates", () => {
  verifyLocalResetContract(workflow);
});

test("rejects the pre-Kong-reload CLI", () => {
  assert.throws(() =>
    verifyLocalResetContract(workflow.replace("2.113.0", "2.109.1")),
  );
});

test("rejects remote reset, skipped health checks and swallowed errors", () => {
  for (const forbidden of [
    "--linked",
    "--db-url",
    "--ignore-health-check",
    "continue-on-error: true",
  ]) {
    assert.throws(() => verifyLocalResetContract(`${workflow}\n${forbidden}`));
  }
});

test("rejects an extra reset retry or lost error propagation", () => {
  assert.throws(() =>
    verifyLocalResetContract(`${workflow}\nlocal-reset.mjs reset`),
  );
  assert.throws(() =>
    verifyLocalResetContract(workflow.replace('exit "$reset_status"', "true")),
  );
});
