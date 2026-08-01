import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { validateRemoteTarget } from "../security/comun-security-contract.mjs";

const version = "20260731231411";
const name = "comun_quality_performance_observability";
const manifestPath =
  "supabase/releases/20260731231411-comun-quality-performance-observability.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const migration = await readFile(manifest.migration, "utf8");
const migrationSha256 = createHash("sha256").update(migration).digest("hex");
if (migrationSha256 !== manifest.migrationSha256)
  throw new Error("COMUN_QUALITY_MIGRATION_CHECKSUM_MISMATCH");

validateRemoteTarget({
  databaseUrl: process.env.SUPABASE_DB_URL,
  projectRef: process.env.SUPABASE_PROJECT_REF,
  allowedRefs: process.env.COMUN_QUALITY_ALLOWED_PROJECT_REFS,
});

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
let connected = false;
let alreadyApplied = false;
try {
  await client.connect();
  connected = true;
  const ledger = await client.query(
    "select exists(select 1 from supabase_migrations.schema_migrations where version=$1) as applied",
    [version],
  );
  alreadyApplied = Boolean(ledger.rows[0].applied);
  if (!alreadyApplied) {
    await client.query(
      "select pg_catalog.set_config('comun.release_sha256', $1, false)",
      [migrationSha256],
    );
    await client.query(migration);
    const columns = (
      await client.query(
        "select column_name from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations'",
      )
    ).rows.map((row) => row.column_name);
    const insertColumns = ["version"];
    const values = [version];
    if (columns.includes("name")) {
      insertColumns.push("name");
      values.push(name);
    }
    if (columns.includes("statements")) {
      insertColumns.push("statements");
      values.push(["checksum_verified_external_transport"]);
    }
    await client.query(
      `insert into supabase_migrations.schema_migrations (${insertColumns.join(",")}) values (${values.map((_, index) => `$${index + 1}`).join(",")}) on conflict (version) do nothing`,
      values,
    );
  }
  const postflight = await client.query(`select
    to_regclass('public.comun_quality_metrics_hourly') is not null as metrics,
    to_regprocedure('public.comun_record_quality_metric(text,text,text,text,integer,text)') is not null as recorder,
    exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='comun_quality_metrics_hourly' and c.relrowsecurity) as rls,
    not has_table_privilege('anon','public.comun_quality_metrics_hourly','select') as anon_denied,
    not has_table_privilege('authenticated','public.comun_quality_metrics_hourly','select') as authenticated_denied,
    has_table_privilege('service_role','public.comun_quality_metrics_hourly','select') as service_read`);
  if (Object.values(postflight.rows[0]).some((value) => value !== true))
    throw new Error("COMUN_QUALITY_REMOTE_POSTFLIGHT_FAILED");
  await client.query("select pg_notify('pgrst','reload schema')");
} catch {
  throw new Error("COMUN_QUALITY_REMOTE_MIGRATION_FAILED_SANITIZED");
} finally {
  if (connected) await client.end();
}

await mkdir(".ci-artifacts/quality-performance", { recursive: true });
await writeFile(
  ".ci-artifacts/quality-performance/migration.json",
  `${JSON.stringify({ result: "COMUN_QUALITY_REMOTE_MIGRATION_GREEN", target: "allowlisted_remote", migrationsApplied: alreadyApplied ? 0 : 1, idempotentReplays: alreadyApplied ? 1 : 0, checksumVerified: true, rls: "enabled", anonymousRead: "denied", containsSecrets: false, containsHost: false }, null, 2)}\n`,
  { mode: 0o600 },
);
console.log("COMUN_QUALITY_REMOTE_MIGRATION_GREEN");
