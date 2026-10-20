import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateRemoteTarget } from "../security/comun-security-contract.mjs";

export const release = "20260731231411-comun-quality-performance-observability";
export const version = "20260731231411";
export const migrationPath =
  "supabase/migrations/20260731231411_comun_quality_performance_observability.sql";
export const migrationSha256 =
  "312a83f6f091beb1ba3b4a87c2805faf3eacd7338ff0d3e93e1a374b348852e3";
export const connectionOptions = "-c default_transaction_read_only=on";
export const controls = [
  "metrics",
  "recorder",
  "rls",
  "anon_denied",
  "authenticated_denied",
  "service_read",
];
export const postflightSql = `select
  pg_catalog.to_regclass('public.comun_quality_metrics_hourly') is not null as metrics,
  pg_catalog.to_regprocedure('public.comun_record_quality_metric(text,text,text,text,integer,text)') is not null as recorder,
  exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='comun_quality_metrics_hourly' and c.relrowsecurity) as rls,
  not pg_catalog.has_table_privilege('anon','public.comun_quality_metrics_hourly','select') as anon_denied,
  not pg_catalog.has_table_privilege('authenticated','public.comun_quality_metrics_hourly','select') as authenticated_denied,
  pg_catalog.has_table_privilege('service_role','public.comun_quality_metrics_hourly','select') as service_read`;

export function verifyRelease(manifest, migration) {
  if (
    manifest?.release !== release ||
    manifest.migration !== migrationPath ||
    manifest.migrationSha256 !== migrationSha256 ||
    createHash("sha256").update(migration).digest("hex") !== migrationSha256
  )
    throw new Error("COMUN_QUALITY_MIGRATION_CHECKSUM_MISMATCH");
}

function exactRow(result, keys) {
  const row = result?.rows?.[0];
  return (
    result?.rows?.length === 1 &&
    row !== null &&
    typeof row === "object" &&
    Object.keys(row).length === keys.length &&
    keys.every((key) => Object.hasOwn(row, key))
  );
}

// The caller owns the connection. This verifier can only inspect, never repair.
export async function verifyRemoteQuality(client) {
  let transaction = false;
  try {
    await client.query("BEGIN READ ONLY");
    transaction = true;
    const mode = await client.query(
      "select pg_catalog.current_setting('transaction_read_only') as read_only",
    );
    if (!exactRow(mode, ["read_only"]) || mode.rows[0].read_only !== "on")
      throw new Error("COMUN_QUALITY_READ_ONLY_REQUIRED");
    const history = await client.query(
      "select exists(select 1 from supabase_migrations.schema_migrations where version=$1) as applied",
      [version],
    );
    if (!exactRow(history, ["applied"]) || history.rows[0].applied !== true)
      throw new Error("COMUN_QUALITY_MIGRATION_NOT_PROVEN_APPLIED");
    const postflight = await client.query(postflightSql);
    if (
      !exactRow(postflight, controls) ||
      controls.some((key) => postflight.rows[0][key] !== true)
    )
      throw new Error("COMUN_QUALITY_REMOTE_POSTFLIGHT_FAILED");
    await client.query("ROLLBACK");
    transaction = false;
    return {
      result: "COMUN_QUALITY_REMOTE_READ_ONLY_GREEN",
      release,
      version,
      migrationSha256,
      transactionReadOnly: "on",
      migrationHistory: "PRESENT",
      controls: Object.fromEntries(controls.map((key) => [key, true])),
      migrationsApplied: 0,
      schemaWrites: 0,
      ledgerWrites: 0,
      notifications: 0,
      rollback: "CONFIRMED",
    };
  } catch (error) {
    if (transaction) {
      try {
        await client.query("ROLLBACK");
      } catch {
        throw new Error("COMUN_QUALITY_READ_ONLY_ROLLBACK_FAILED");
      }
    }
    const markers = [
      "COMUN_QUALITY_READ_ONLY_REQUIRED",
      "COMUN_QUALITY_MIGRATION_NOT_PROVEN_APPLIED",
      "COMUN_QUALITY_REMOTE_POSTFLIGHT_FAILED",
    ];
    throw new Error(
      markers.includes(error?.message)
        ? error.message
        : "COMUN_QUALITY_REMOTE_READ_ONLY_FAILED_SANITIZED",
    );
  }
}

async function main() {
  let client;
  try {
    const manifest = JSON.parse(
      await readFile(`supabase/releases/${release}.json`, "utf8"),
    );
    verifyRelease(manifest, await readFile(migrationPath));
    validateRemoteTarget({
      databaseUrl: process.env.SUPABASE_DB_URL,
      projectRef: process.env.SUPABASE_PROJECT_REF,
      allowedRefs: process.env.COMUN_QUALITY_ALLOWED_PROJECT_REFS,
    });
    const { default: pg } = await import("pg");
    client = new pg.Client({
      connectionString: process.env.SUPABASE_DB_URL,
      options: connectionOptions,
      connectionTimeoutMillis: 15000,
      query_timeout: 30000,
    });
    await client.connect();
    const report = await verifyRemoteQuality(client);
    await mkdir(".ci-artifacts/quality-performance", { recursive: true });
    await writeFile(
      ".ci-artifacts/quality-performance/schema-readonly.json",
      `${JSON.stringify(report, null, 2)}\n`,
      { mode: 0o600 },
    );
    console.log(report.result);
  } catch {
    console.error("COMUN_QUALITY_REMOTE_READ_ONLY_BLOCKED_SANITIZED");
    process.exitCode = 1;
  } finally {
    if (client) await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
