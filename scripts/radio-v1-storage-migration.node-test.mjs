import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertRadioV1MigrationArtifactSanitized,
  RADIO_V1_STORAGE_MIGRATION_VERSION,
  validateRadioV1AuditPlan,
  validateRadioV1StorageMigrationSql,
  verifyRadioV1SupabasePushPlan,
} from "./radio-v1-storage-migration.mjs";

test("migration nova ajusta somente os dois buckets de Rádio para 45 MiB", async () => {
  const sql = await readFile(
    "supabase/migrations/20260730213205_radio_v1_free_storage_profile.sql",
    "utf8",
  );
  assert.equal(validateRadioV1StorageMigrationSql(sql), true);
  assert.match(sql, /47185920/);
  assert.doesNotMatch(
    sql,
    /archive-private-originals|archive-public-derivatives/,
  );
});

test("migration histórica da Rádio permanece intacta", async () => {
  const { execFileSync } = await import("node:child_process");
  const path =
    "supabase/migrations/20260715185344_community_radio_foundation.sql";
  const baseline = execFileSync("git", ["show", `origin/main:${path}`]);
  const current = await readFile(path);
  assert.deepEqual(
    current,
    baseline,
    "a migration histórica deve permanecer byte a byte igual à main",
  );
});

test("plano remoto aceita somente os dois buckets ausentes e allowlisted", () => {
  const hash = "a".repeat(64);
  const artifact = {
    target: { verified: true },
    storage: {
      missingBuckets: ["radio-private-originals", "radio-public-audio"],
      incompatibleBuckets: [],
      policyEvidence: { policiesGreen: true },
    },
    radioStorageMigrationPlan: {
      exact: true,
      marker: "COMUN_RADIO_V1_STORAGE_MIGRATION_PLAN_EXACT",
      planHash: hash,
    },
  };
  assert.equal(validateRadioV1AuditPlan(artifact, hash), true);
  assert.throws(
    () =>
      validateRadioV1AuditPlan(
        {
          ...artifact,
          storage: {
            ...artifact.storage,
            missingBuckets: ["radio-public-audio"],
          },
        },
        hash,
      ),
    /REMOTE_PLAN_BLOCKED/,
  );
});

test("dry-run aceita exatamente a migration nova e rejeita migration adicional", () => {
  const exact = `Would push these migrations:\n • ${RADIO_V1_STORAGE_MIGRATION_VERSION}_radio_v1_free_storage_profile.sql\n`;
  assert.equal(verifyRadioV1SupabasePushPlan(exact), true);
  assert.throws(
    () =>
      verifyRadioV1SupabasePushPlan(
        `${exact} • 20260730220000_unexpected.sql\n`,
      ),
    /UNEXPECTED_MIGRATION_PLAN/,
  );
});

test("artifact sanitizado rejeita conexão e segredo", () => {
  assert.equal(
    assertRadioV1MigrationArtifactSanitized({
      result: "COMUN_RADIO_V1_STORAGE_MIGRATION_PLAN_GREEN",
    }),
    true,
  );
  assert.throws(
    () =>
      assertRadioV1MigrationArtifactSanitized({
        database: "postgresql://example.invalid/db",
      }),
    /NOT_SANITIZED/,
  );
});
