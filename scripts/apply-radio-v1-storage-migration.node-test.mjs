import assert from "node:assert/strict";
import test from "node:test";
import {
  applyExactRadioV1StorageMigration,
  assertExactRadioV1BucketRows,
  RADIO_V1_STORAGE_MIGRATION_CONFIRMATION,
  validateRadioV1MigrationApplyEnvironment,
} from "./apply-radio-v1-storage-migration.mjs";

const expectedPlanHash = "a".repeat(64);
const environment = {
  SUPABASE_DB_URL: "postgresql://postgres:local@127.0.0.1:54322/postgres",
  SUPABASE_PROJECT_REF: "LOCAL_VALIDATION",
  COMUN_CULTURAL_ALLOWED_PROJECT_REFS: "LOCAL_VALIDATION",
  COMUN_CULTURAL_EXPECTED_PLAN_HASH: expectedPlanHash,
  COMUN_RADIO_V1_STORAGE_MIGRATION_CONFIRMATION:
    RADIO_V1_STORAGE_MIGRATION_CONFIRMATION,
};
const audit = {
  target: { verified: true },
  storage: {
    missingBuckets: ["radio-private-originals", "radio-public-audio"],
    incompatibleBuckets: [],
    policyEvidence: { policiesGreen: true },
  },
  radioStorageMigrationPlan: {
    exact: true,
    marker: "COMUN_RADIO_V1_STORAGE_MIGRATION_PLAN_EXACT",
    planHash: expectedPlanHash,
  },
};
const rows = [
  {
    id: "radio-private-originals",
    name: "radio-private-originals",
    public: false,
    file_size_limit: 47_185_920,
    allowed_mime_types: [
      "audio/wav",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "audio/flac",
    ],
  },
  {
    id: "radio-public-audio",
    name: "radio-public-audio",
    public: true,
    file_size_limit: 47_185_920,
    allowed_mime_types: [
      "audio/mpeg",
      "application/json",
      "text/vtt",
      "text/plain",
    ],
  },
];

test("ambiente de aplicação exige target local allowlisted e confirmação exata", () => {
  assert.equal(
    validateRadioV1MigrationApplyEnvironment(environment).targetVerified,
    true,
  );
  assert.throws(
    () =>
      validateRadioV1MigrationApplyEnvironment({
        ...environment,
        COMUN_RADIO_V1_STORAGE_MIGRATION_CONFIRMATION: "INVALIDA",
      }),
    /CONFIRMATION_INVALID/,
  );
});

test("postflight aceita somente as duas configurações exatas de buckets", () => {
  assert.equal(assertExactRadioV1BucketRows(rows), true);
  assert.throws(
    () =>
      assertExactRadioV1BucketRows([
        { ...rows[0], file_size_limit: 250 * 1024 * 1024 },
        rows[1],
      ]),
    /POSTFLIGHT_BLOCKED/,
  );
});

test("aplicador usa uma transação e registra somente a migration nova", async () => {
  const queries = [];
  class FakeClient {
    async connect() {}
    async end() {}
    async query(sql, parameters) {
      queries.push({ sql, parameters });
      if (/select version\s+from supabase_migrations/.test(sql))
        return { rowCount: 0, rows: [] };
      if (/select id\s+from storage\.buckets/.test(sql))
        return { rowCount: 0, rows: [] };
      if (/select id, name, public/.test(sql)) return { rowCount: 2, rows };
      if (/select count\(\*\).*storage\.objects/s.test(sql))
        return { rowCount: 1, rows: [{ count: 0 }] };
      if (/select version, name, statements/.test(sql))
        return {
          rowCount: 1,
          rows: [
            {
              version: "20260730213205",
              name: "radio_v1_free_storage_profile",
              statements: [migrationSql],
            },
          ],
        };
      return { rowCount: 1, rows: [] };
    }
  }
  const migrationSql =
    "insert into storage.buckets values ('radio-private-originals'), ('radio-public-audio'), (47185920) on conflict (id) do update set public = excluded.public where storage.buckets.id in ('radio-private-originals', 'radio-public-audio');";
  const result = await applyExactRadioV1StorageMigration({
    environment,
    audit,
    ClientClass: FakeClient,
    migrationSql,
  });
  assert.equal(result.historicalMigrationsApplied, 0);
  assert.equal(result.bucketRowsCreated, 2);
  assert.equal(queries[0].sql, "begin");
  assert.equal(queries.at(-1).sql, "commit");
  const ledgerInsert = queries.find(({ sql }) =>
    /insert into supabase_migrations\.schema_migrations/.test(sql),
  );
  assert.deepEqual(ledgerInsert.parameters[0], "20260730213205");
  assert.equal(
    queries.some(({ sql }) => /db push|20260724233256/.test(sql)),
    false,
  );
});

test("estado concorrente interrompe e faz rollback antes da migration", async () => {
  const queries = [];
  class ConcurrentClient {
    async connect() {}
    async end() {}
    async query(sql) {
      queries.push(sql);
      if (/select version\s+from supabase_migrations/.test(sql))
        return { rowCount: 1, rows: [{ version: "20260730213205" }] };
      return { rowCount: 0, rows: [] };
    }
  }
  await assert.rejects(
    applyExactRadioV1StorageMigration({
      environment,
      audit,
      ClientClass: ConcurrentClient,
      migrationSql:
        "insert into storage.buckets values ('radio-private-originals'), ('radio-public-audio'), (47185920) on conflict (id) do update set public = excluded.public where storage.buckets.id in ('radio-private-originals', 'radio-public-audio');",
    }),
    /CONCURRENT_STATE_CHANGED/,
  );
  assert.equal(queries.at(-1), "rollback");
});
