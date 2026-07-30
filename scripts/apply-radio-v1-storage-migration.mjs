import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { validateCulturalDatabaseTarget } from "./audit-comun-cultural-deliverability.mjs";
import {
  assertRadioV1MigrationArtifactSanitized,
  RADIO_V1_STORAGE_MIGRATION_NAME,
  RADIO_V1_STORAGE_MIGRATION_PATH,
  RADIO_V1_STORAGE_MIGRATION_SHA256,
  RADIO_V1_STORAGE_MIGRATION_VERSION,
  radioV1StorageMigrationSha256,
  validateRadioV1AuditPlan,
  validateRadioV1StorageMigrationSql,
} from "./radio-v1-storage-migration.mjs";

const { Client } = pg;

export const RADIO_V1_STORAGE_MIGRATION_CONFIRMATION =
  "APLICAR_PERFIL_GRATUITO_RADIO_V1_47_6B";

const expectedBuckets = new Map([
  [
    "radio-private-originals",
    {
      public: false,
      allowedMimeTypes: [
        "audio/wav",
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/flac",
      ],
    },
  ],
  [
    "radio-public-audio",
    {
      public: true,
      allowedMimeTypes: [
        "audio/mpeg",
        "application/json",
        "text/vtt",
        "text/plain",
      ],
    },
  ],
]);

export function validateRadioV1MigrationApplyEnvironment(
  environment = process.env,
) {
  const target = validateCulturalDatabaseTarget(environment);
  const expectedPlanHash = String(
    environment.COMUN_CULTURAL_EXPECTED_PLAN_HASH ?? "",
  ).trim();
  if (
    environment.COMUN_RADIO_V1_STORAGE_MIGRATION_CONFIRMATION !==
    RADIO_V1_STORAGE_MIGRATION_CONFIRMATION
  ) {
    throw new Error("COMUN_RADIO_V1_STORAGE_MIGRATION_CONFIRMATION_INVALID");
  }
  if (!/^[a-f0-9]{64}$/.test(expectedPlanHash)) {
    throw new Error("COMUN_RADIO_V1_STORAGE_PLAN_HASH_INVALID");
  }
  return { ...target, expectedPlanHash };
}

export function assertExactRadioV1BucketRows(rows) {
  if (rows.length !== expectedBuckets.size) {
    throw new Error("COMUN_RADIO_V1_STORAGE_POSTFLIGHT_BLOCKED");
  }
  for (const row of rows) {
    const expected = expectedBuckets.get(row.id);
    if (
      !expected ||
      row.name !== row.id ||
      row.public !== expected.public ||
      Number(row.file_size_limit) !== 47_185_920 ||
      JSON.stringify(row.allowed_mime_types) !==
        JSON.stringify(expected.allowedMimeTypes)
    ) {
      throw new Error("COMUN_RADIO_V1_STORAGE_POSTFLIGHT_BLOCKED");
    }
  }
  return true;
}

export async function applyExactRadioV1StorageMigration({
  environment = process.env,
  audit,
  ClientClass = Client,
  migrationSql,
} = {}) {
  const { databaseUrl, expectedPlanHash } =
    validateRadioV1MigrationApplyEnvironment(environment);
  validateRadioV1AuditPlan(audit, expectedPlanHash);
  const sql =
    migrationSql ?? (await readFile(RADIO_V1_STORAGE_MIGRATION_PATH, "utf8"));
  validateRadioV1StorageMigrationSql(sql);
  if (
    (await radioV1StorageMigrationSha256()) !==
    RADIO_V1_STORAGE_MIGRATION_SHA256
  ) {
    throw new Error("COMUN_RADIO_V1_STORAGE_MIGRATION_HASH_MISMATCH");
  }

  const client = new ClientClass({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    query_timeout: 20_000,
  });
  let transactionOpen = false;
  try {
    await client.connect();
    await client.query("begin");
    transactionOpen = true;
    await client.query(
      "select pg_advisory_xact_lock(hashtext('comun-radio-v1-storage-profile'))",
    );
    const ledgerBefore = await client.query(
      `select version
         from supabase_migrations.schema_migrations
        where version = $1`,
      [RADIO_V1_STORAGE_MIGRATION_VERSION],
    );
    const bucketsBefore = await client.query(
      `select id
         from storage.buckets
        where id = any($1::text[])
        order by id`,
      [[...expectedBuckets.keys()]],
    );
    if (ledgerBefore.rowCount !== 0 || bucketsBefore.rowCount !== 0) {
      throw new Error("COMUN_RADIO_V1_STORAGE_CONCURRENT_STATE_CHANGED");
    }

    await client.query(sql);
    await client.query(
      `insert into supabase_migrations.schema_migrations
         (version, statements, name)
       values ($1, $2::text[], $3)`,
      [
        RADIO_V1_STORAGE_MIGRATION_VERSION,
        [sql],
        RADIO_V1_STORAGE_MIGRATION_NAME,
      ],
    );

    const bucketsAfter = await client.query(
      `select id, name, public, file_size_limit, allowed_mime_types
         from storage.buckets
        where id = any($1::text[])
        order by id`,
      [[...expectedBuckets.keys()]],
    );
    assertExactRadioV1BucketRows(bucketsAfter.rows);
    const objectsAfter = await client.query(
      `select count(*)::integer as count
         from storage.objects
        where bucket_id = any($1::text[])`,
      [[...expectedBuckets.keys()]],
    );
    if (Number(objectsAfter.rows[0]?.count) !== 0) {
      throw new Error("COMUN_RADIO_V1_STORAGE_OBJECT_WRITE_DETECTED");
    }
    const ledgerAfter = await client.query(
      `select version, name, statements
         from supabase_migrations.schema_migrations
        where version = $1`,
      [RADIO_V1_STORAGE_MIGRATION_VERSION],
    );
    if (
      ledgerAfter.rowCount !== 1 ||
      ledgerAfter.rows[0].name !== RADIO_V1_STORAGE_MIGRATION_NAME ||
      JSON.stringify(ledgerAfter.rows[0].statements) !== JSON.stringify([sql])
    ) {
      throw new Error("COMUN_RADIO_V1_STORAGE_LEDGER_WRITE_MISMATCH");
    }
    await client.query("commit");
    transactionOpen = false;
    return {
      formatVersion: 1,
      result: "COMUN_RADIO_V1_STORAGE_PROFILE_APPLIED",
      migrationVersion: RADIO_V1_STORAGE_MIGRATION_VERSION,
      migrationSha256: RADIO_V1_STORAGE_MIGRATION_SHA256,
      bucketRowsCreated: 2,
      storageObjectsCreated: 0,
      contentRowsUpdated: 0,
      ledgerRowsCreated: 1,
      historicalMigrationsApplied: 0,
      targetVerified: true,
      containsSensitiveData: false,
    };
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const auditIndex = process.argv.indexOf("--audit");
  const outputIndex = process.argv.indexOf("--output");
  if (auditIndex < 0 || outputIndex < 0) {
    throw new Error("COMUN_RADIO_V1_STORAGE_MIGRATION_INPUT_REQUIRED");
  }
  const audit = JSON.parse(
    await readFile(process.argv[auditIndex + 1], "utf8"),
  );
  const artifact = await applyExactRadioV1StorageMigration({ audit });
  assertRadioV1MigrationArtifactSanitized(artifact);
  const output = process.argv[outputIndex + 1];
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${artifact.result}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const marker = String(error?.message ?? "");
    process.stderr.write(
      `${/^COMUN_[A-Z0-9_]+$/.test(marker) ? marker : "COMUN_RADIO_V1_STORAGE_MIGRATION_FAILED"}\n`,
    );
    process.exitCode = 1;
  });
}
