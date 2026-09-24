import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { schemaFingerprintQuery } from "./apply-forward-only.mjs";
import {
  buildDocuments,
  query as canonicalQuery,
} from "../db/verify-canonical-baseline.mjs";
import { inspectPragmaCatalog } from "./verify-search-sync-temp-table-lint.mjs";
import { requireDisposableUrl } from "./prove-search-sync-local-temp-table.mjs";

const disposable = process.argv.includes("--disposable");
const connectionString = disposable
  ? process.env.COMUN_DISPOSABLE_DB_URL
  : process.env.SUPABASE_DB_URL;
const output = process.argv
  .find((arg) => arg.startsWith("--output="))
  ?.slice(9);
if (!connectionString || !output)
  throw new Error("CAPTURE_CONNECTION_OR_OUTPUT_MISSING");
if (disposable) requireDisposableUrl(connectionString);

const client = new pg.Client({ connectionString });
const manifestText = await readFile(
  "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
  "utf8",
);
const release = JSON.parse(manifestText);
await client.connect();
try {
  await client.query("BEGIN READ ONLY");
  const mode = await client.query(
    "select current_setting('transaction_read_only') as value",
  );
  if (mode.rows[0]?.value !== "on")
    throw new Error("CAPTURE_TRANSACTION_NOT_READ_ONLY");
  const extensionCatalog = await inspectPragmaCatalog(client);
  const searchIdentity = await client.query(
    String.raw`select l.lanname as language, p.prosecdef as security_definer,
      p.proconfig as config, pg_get_userbyid(p.proowner) as owner,
      regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g') as definition
      from pg_proc p join pg_language l on l.oid=p.prolang
      where p.oid=to_regprocedure('public.comun_sync_public_search_projection()')`,
  );
  const search = searchIdentity.rows[0];
  if (!search) throw new Error("CAPTURE_SEARCH_FUNCTION_MISSING");
  const runnerRows = await client.query(schemaFingerprintQuery);
  const normalized = runnerRows.rows
    .map((row) => Object.values(row)[0])
    .join("\n")
    .replace(/\r\n/g, "\n")
    .trimEnd();
  if (!normalized) throw new Error("CAPTURE_RUNNER_FINGERPRINT_EMPTY");
  const canonicalRows = await client.query(canonicalQuery);
  const raw = JSON.parse(Object.values(canonicalRows.rows[0] ?? {})[0]);
  const canonical = buildDocuments(raw).compact;
  const consentObjects = await client.query(`
    select
      (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='private' and c.relname in (
         'comun_relata_collective_entities', 'comun_relata_collective_entity_representations',
         'comun_relata_collective_entity_consents', 'comun_relata_collective_entity_events'))
      + (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where (n.nspname='public' and p.proname in (
           'comun_relata_collective_entity_create', 'comun_relata_collective_entity_consent_set'))
            or (n.nspname='private' and p.proname in (
           'comun_relata_collective_entity_create_internal', 'comun_relata_collective_entity_consent_set_internal')))
      as count`);
  const ledgerRelation = await client.query(
    "select to_regclass('public.comun_schema_releases') is not null as present",
  );
  let releasePresent = false;
  let releaseLedgerState = "ABSENT";
  if (ledgerRelation.rows[0]?.present) {
    const ledger = await client.query(
      `select release, migration_path, migration_sha256, pre_fingerprint, post_fingerprint, status
       from public.comun_schema_releases where release = $1`,
      [release.release],
    );
    releasePresent = ledger.rows.length > 0;
    if (releasePresent) {
      const row = ledger.rows[0];
      releaseLedgerState =
        row.release === release.release &&
        row.migration_path === release.migration &&
        row.migration_sha256 === release.migrationSha256 &&
        row.pre_fingerprint === release.expectedPreFingerprint &&
        row.post_fingerprint === release.expectedPostFingerprint &&
        row.status === "applied"
          ? "PRESENT_ACCEPTED"
          : "PRESENT_MISMATCH";
    }
  }
  const document = {
    scope: "COMUN_PR437_PROMOTION_FINGERPRINT_READ_ONLY",
    target: disposable ? "DISPOSABLE" : "PRODUCTION",
    runnerAlgorithm: "sha256-postgres-public-catalog-v1",
    runnerFingerprint: createHash("sha256").update(normalized).digest("hex"),
    runnerRows: runnerRows.rows.length,
    canonicalAlgorithm: canonical.fingerprintAlgorithm,
    canonicalFingerprint: canonical.fingerprint,
    blockingFindings: canonical.security.blockingFindings.length,
    findingRules: [
      ...new Set(canonical.security.blockingFindings.map((item) => item.rule)),
    ].sort(),
    migrationCount: canonical.canonical.migrations.length,
    migrations: canonical.canonical.migrations,
    consentMigrationPresent:
      canonical.canonical.migrations.includes("20260901000000"),
    consentObjectCount: consentObjects.rows[0]?.count,
    releasePresent,
    releaseLedgerState,
    postgresVersion: extensionCatalog.postgresVersion,
    plpgsqlCheckCatalog: {
      name: "plpgsql_check",
      installed: extensionCatalog.installedExtension,
      available: extensionCatalog.availableExtension,
      versions: extensionCatalog.availableVersions,
    },
    searchFunction: {
      identity: "public.comun_sync_public_search_projection()",
      language: search.language,
      owner: search.owner,
      securityDefiner: search.security_definer,
      config: search.config,
      definitionSha256: createHash("sha256")
        .update(search.definition)
        .digest("hex"),
    },
    releaseIdentity: {
      release: release.release,
      migration: release.migration,
      migrationSha256: release.migrationSha256,
      manifestSha256: createHash("sha256").update(manifestText).digest("hex"),
      expectedPostFingerprint: release.expectedPostFingerprint,
    },
    publicRelations: canonical.canonical.relations
      .map((item) => item.name)
      .sort(),
    legacyRelations: canonical.canonical.relations
      .filter((item) =>
        [
          "comments",
          "communities",
          "knowledge_pages",
          "posts",
          "profiles",
          "project_links",
          "reactions_as_actions",
        ].includes(item.name),
      )
      .map((item) => item.name)
      .sort(),
  };
  await writeFile(output, `${JSON.stringify(document, null, 2)}\n`);
  await client.query("ROLLBACK");
  console.log("COMUN_PR437_PROMOTION_FINGERPRINT_CAPTURED_READ_ONLY");
} finally {
  await client.end();
}
