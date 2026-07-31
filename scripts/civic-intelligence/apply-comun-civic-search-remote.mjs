import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { validateRemoteTarget } from "../security/comun-security-contract.mjs";

const databaseUrl = process.env.SUPABASE_DB_URL;
const projectRef = process.env.SUPABASE_PROJECT_REF;
validateRemoteTarget({
  databaseUrl,
  projectRef,
  allowedRefs: process.env.COMUN_CIVIC_ALLOWED_PROJECT_REFS,
});

async function loadRelease(manifest, version, name) {
  const release = JSON.parse(await readFile(manifest, "utf8"));
  const migration = await readFile(release.migration, "utf8");
  const migrationSha256 = createHash("sha256").update(migration).digest("hex");
  if (migrationSha256 !== release.migrationSha256)
    throw new Error("COMUN_CIVIC_MIGRATION_CHECKSUM_MISMATCH");
  return { release, migration, version, name };
}

const releases = await Promise.all([
  loadRelease(
    "supabase/releases/20260731183339-comun-civic-search-foundation.json",
    "20260731183339",
    "comun_civic_search_foundation",
  ),
  loadRelease(
    "supabase/releases/20260731220000-comun-civic-search-service-observability.json",
    "20260731220000",
    "comun_civic_search_service_observability",
  ),
]);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
const migrationResults = [];
let capabilities;
try {
  const observed = await client.query(`
    select
      current_setting('server_version_num')::int as server_version_num,
      exists(select 1 from pg_available_extensions where name='vector') as vector_available,
      exists(select 1 from pg_available_extensions where name='unaccent') as unaccent_available,
      exists(select 1 from pg_available_extensions where name='pg_trgm') as pg_trgm_available,
      exists(select 1 from pg_ts_config where cfgname='portuguese') as portuguese_fts
  `);
  capabilities = observed.rows[0];
  if (
    Number(capabilities.server_version_num) < 170000 ||
    !capabilities.vector_available ||
    !capabilities.unaccent_available ||
    !capabilities.pg_trgm_available ||
    !capabilities.portuguese_fts
  )
    throw new Error("COMUN_CIVIC_PROVIDER_CAPABILITY_INCOMPLETE");

  const ledgerColumns = (
    await client.query(`
        select column_name from information_schema.columns
        where table_schema='supabase_migrations' and table_name='schema_migrations'
      `)
  ).rows.map((row) => row.column_name);
  for (const item of releases) {
    const ledger = await client.query(
      "select exists(select 1 from supabase_migrations.schema_migrations where version=$1) as applied",
      [item.version],
    );
    const alreadyApplied = ledger.rows[0].applied;
    if (!alreadyApplied) {
      await client.query(item.migration);
      const insertColumns = ["version"];
      const insertValues = [item.version];
      if (ledgerColumns.includes("name")) {
        insertColumns.push("name");
        insertValues.push(item.name);
      }
      if (ledgerColumns.includes("statements")) {
        insertColumns.push("statements");
        insertValues.push(["checksum_verified_external_transport"]);
      }
      await client.query(
        `insert into supabase_migrations.schema_migrations (${insertColumns.join(",")})
       values (${insertValues.map((_, index) => `$${index + 1}`).join(",")})
       on conflict (version) do nothing`,
        insertValues,
      );
    }
    migrationResults.push({ version: item.version, alreadyApplied });
  }

  const postflight = await client.query(`
    select
      to_regclass('public.comun_search_documents') is not null as documents,
      to_regclass('public.comun_search_sections') is not null as sections,
      to_regprocedure('public.comun_public_search_hybrid(text,text,uuid,uuid,extensions.vector,integer)') is not null as hybrid,
      exists(select 1 from supabase_migrations.schema_migrations where version='20260731183339') as foundation_ledger,
      exists(select 1 from supabase_migrations.schema_migrations where version='20260731220000') as observability_ledger,
      has_table_privilege('service_role','public.comun_search_documents','select') as service_documents,
      has_table_privilege('service_role','public.comun_search_sections','select') as service_sections
  `);
  if (Object.values(postflight.rows[0]).some((value) => value !== true))
    throw new Error("COMUN_CIVIC_REMOTE_MIGRATION_POSTFLIGHT_FAILED");
  await client.query("select pg_notify('pgrst','reload schema')");
} finally {
  await client.end();
}

await mkdir(".ci-artifacts/civic-intelligence", { recursive: true });
await writeFile(
  ".ci-artifacts/civic-intelligence/migration.json",
  `${JSON.stringify(
    {
      result: "COMUN_CIVIC_REMOTE_MIGRATION_GREEN",
      target: "allowlisted_remote",
      migrationsApplied: migrationResults.filter((item) => !item.alreadyApplied)
        .length,
      idempotentReplays: migrationResults.filter((item) => item.alreadyApplied)
        .length,
      migrationSha256Verified: true,
      postgresMajor: Math.floor(
        Number(capabilities.server_version_num) / 10000,
      ),
      extensions: {
        vector: "available",
        unaccent: "available",
        pgTrgm: "available",
        portugueseFts: "available",
      },
      containsSecrets: false,
      containsHost: false,
      containsDocuments: false,
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
console.log("COMUN_CIVIC_REMOTE_MIGRATION_GREEN");
