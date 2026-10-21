import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { matchesCanonicalCiSource } from "../../scripts/diagnostics/verify-ci-source-identity.mjs";

const projectRef = "nvmdszymrtacfehdynpg";
const canary = "SECRET_CREDENTIAL_CANARY_123";
const direct = `postgresql://postgres:${canary}@db.${projectRef}.supabase.co:5432/postgres`;
const pooler = `postgres://postgres.${projectRef}:${canary}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`;
const check = (databaseUrl, ref = projectRef) =>
  matchesCanonicalCiSource({ databaseUrl, projectRef: ref });

test("canonical direct and session pooler configuration match", () => {
  assert.equal(check(direct), true);
  assert.equal(check(pooler), true);
  assert.equal(check(`${direct}?sslmode=verify-full`), true);
  assert.equal(
    check(`${pooler}?sslmode=require&sslrootcert=%2Ftmp%2Froot.crt`),
    true,
  );
  assert.equal(check(pooler.replace("postgres.", "postgres%2E")), true);
});

test("different project, inconsistent ref and incomplete input refuse", () => {
  const other = "abcdefghijklmnopqrst";
  assert.equal(check(direct, other), false);
  assert.equal(check(direct.replaceAll(projectRef, other), other), false);
  assert.equal(check(pooler.replaceAll(projectRef, other)), false);
  for (const databaseUrl of [undefined, null, "", 42, "not a url"])
    assert.equal(check(databaseUrl), false);
  for (const ref of [undefined, null, "", "bad", 42])
    assert.equal(
      matchesCanonicalCiSource({ databaseUrl: direct, projectRef: ref }),
      false,
    );
  assert.equal(matchesCanonicalCiSource(), false);
});

test("spoofed hosts, users, protocols and connection overrides refuse", () => {
  for (const databaseUrl of [
    direct.replace("supabase.co", "supabase.co.evil.invalid"),
    pooler.replace("pooler.supabase.com", "pooler.supabase.com.evil.invalid"),
    direct.replace("postgres:", "attacker:"),
    direct.replace("postgresql:", "https:"),
    direct.replace("/postgres", "/other"),
    `${direct}?host=evil.invalid`,
    `${direct}?service=other`,
    `${direct}?hostaddr=127.0.0.1`,
    `${direct}?user=other`,
    `${direct}?dbname=other`,
    `${direct}?unknown=anything`,
    `${direct}?sslmode=disable`,
    `${direct}?sslmode=require&sslmode=verify-full`,
    `${direct}?sslrootcert=`,
    `${direct}#fragment`,
    pooler.replace("postgres.", "postgres%ZZ."),
    "postgresql://postgres:secret@127.0.0.1:5432/postgres",
  ])
    assert.equal(check(databaseUrl), false);
});

test("CLI emits only a fixed marker and never credentials or malformed URLs", () => {
  const cli = resolve("scripts/diagnostics/verify-ci-source-identity.mjs");
  for (const [databaseUrl, expectedStatus, marker] of [
    [direct, 0, "MATCH"],
    [pooler, 0, "MATCH"],
    [`${direct}?sslmode=verify-full`, 0, "MATCH"],
    [pooler.replace("postgres.", "postgres%2E"), 0, "MATCH"],
    [`malformed://${canary}%ZZ`, 1, "MISMATCH"],
    [`${direct}?host=${canary}.invalid`, 1, "MISMATCH"],
  ]) {
    const result = spawnSync(process.execPath, [cli], {
      env: {
        ...process.env,
        SUPABASE_DB_URL: databaseUrl,
        SUPABASE_PROJECT_REF: projectRef,
      },
      encoding: "utf8",
    });
    assert.equal(result.status, expectedStatus);
    assert.equal(result.stdout, `COMUN_CI_SOURCE_IDENTITY_${marker}\n`);
    assert.equal(result.stderr, "");
    assert.equal((result.stdout + result.stderr).includes(canary), false);
    assert.equal((result.stdout + result.stderr).includes(projectRef), false);
  }
});

test("workflow verifies identity before any psql and preserves schema gates", () => {
  const workflow = readFileSync(
    ".github/workflows/comun-48-2-a-remote-preflight.yml",
    "utf8",
  );
  const invocation = "node scripts/diagnostics/verify-ci-source-identity.mjs";
  assert.ok(workflow.indexOf(invocation) > 0);
  assert.ok(
    workflow.indexOf(invocation) < workflow.indexOf('psql "$SUPABASE_DB_URL"'),
  );
  assert.match(workflow, /COMUN_48_2_A_BLOCKED_REMOTE_SCHEMA_DRIFT/);
  assert.match(workflow, /PGSSLMODE: verify-full/);
});
