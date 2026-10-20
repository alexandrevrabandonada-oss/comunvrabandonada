import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { validateRemoteTarget } from "../security/comun-security-contract.mjs";

export const migrationPath =
  "supabase/migrations/20261006134804_comun_learning_r0.sql";
export const manifestPath =
  "supabase/releases/20261006134804-comun-learning-r0.json";
export const migrationHash =
  "5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7";
export const manifestHash =
  "3b598bc6b3ea3dfe462ba205b6747016aace52de87c87dec332ecbb1a567d4de";
export const version = "20261006134804";
export const tables = [
  "programs",
  "units",
  "resources",
  "enrollments",
  "progress",
  "practice_links",
].map((name) => `comun_learning_${name}`);
export const functions = [
  "event",
  "submit_practice",
  "review_practice",
  "bookmark",
].map((name) => `comun_learning_${name}`);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function reviewPackage({ manifestBytes, migrationBytes, catalog }) {
  assert.equal(
    sha256(manifestBytes),
    manifestHash,
    "LEARNING_MANIFEST_BYTES_CHANGED",
  );
  assert.equal(
    sha256(migrationBytes),
    migrationHash,
    "LEARNING_MIGRATION_BYTES_CHANGED",
  );
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.remotePromotionAllowed, false);
  assert.equal(manifest.scope, "local_candidate");
  assert.equal(manifest.migration, migrationPath);
  assert.equal(manifest.expectedObjects, 10);
  assert.equal(manifest.expectedRlsObjects, 6);
  const sql = migrationBytes.toString();
  const seeds = [...sql.matchAll(/'((?:[^']|'')*)'::jsonb/g)].map((match) =>
    JSON.parse(match[1].replaceAll("''", "'")),
  );
  const sorted = (items) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(
    sorted(seeds),
    sorted([...catalog.tracks, ...catalog.missions, ...catalog.resources]),
    "LEARNING_EDITORIAL_SEED_DRIFT",
  );
  assert.deepEqual(
    [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]),
    tables,
  );
  assert.deepEqual(
    [...sql.matchAll(/create function public\.(\w+)/g)].map((m) => m[1]),
    functions,
  );
  return {
    status: "COMUN_LEARNING_PACKAGE_REVIEWED_OFFLINE",
    migrationPath,
    migrationSha256: migrationHash,
    manifestSha256: manifestHash,
    catalogSha256: sha256(JSON.stringify(catalog)),
    objects: { tables, functions },
    editorialSeed: {
      tracks: catalog.tracks.length,
      missions: catalog.missions.length,
      resources: catalog.resources.length,
    },
    remotePromotionAllowed: false,
    schemaWrites: 0,
    featureFlagChanges: 0,
    remoteState: "NOT_CAPTURED",
    promotionReady: false,
  };
}

// Only catalogs and migration-history metadata; no learning/business rows.
export const metadataSql = `select
  current_setting('transaction_read_only') as read_only,
  exists(select 1 from supabase_migrations.schema_migrations where version=$1) as history_present,
  coalesce((select jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity) order by c.relname)
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and left(c.relname,15)='comun_learning_' and c.relkind in ('r','p','v','m')), '[]'::jsonb) as relations,
  coalesce((select jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),'security_definer',p.prosecdef) order by p.proname,p.oid)
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and left(p.proname,15)='comun_learning_'), '[]'::jsonb) as functions`;

export function classifyMetadata(row) {
  assert.ok(row && row.read_only === "on", "LEARNING_READ_ONLY_REQUIRED");
  assert.equal(
    typeof row.history_present,
    "boolean",
    "LEARNING_HISTORY_SHAPE_INVALID",
  );
  assert.ok(
    Array.isArray(row.relations) && Array.isArray(row.functions),
    "LEARNING_METADATA_SHAPE_INVALID",
  );
  if (!row.history_present && !row.relations.length && !row.functions.length)
    return "ABSENT_REQUIRES_BASELINE_AND_PROMOTION_REVIEW";
  // Presence is never a substitute for signatures, grants, RLS, ledger and
  // canonical PRE/POST fingerprint verification.
  return "BLOCKED_PRESENT_OR_PARTIAL_REQUIRES_SEPARATE_POSTFLIGHT";
}

export async function captureMetadata(client) {
  let begun = false;
  try {
    await client.query("BEGIN READ ONLY");
    begun = true;
    const result = await client.query(metadataSql, [version]);
    assert.equal(result.rows?.length, 1, "LEARNING_METADATA_SHAPE_INVALID");
    const row = result.rows[0];
    const classification = classifyMetadata(row);
    await client.query("ROLLBACK");
    begun = false;
    return {
      classification,
      transactionReadOnly: true,
      businessRowsRead: false,
      schemaWrites: 0,
      promotionReady: false,
      metadata: row,
    };
  } catch {
    if (begun) {
      try {
        await client.query("ROLLBACK");
      } catch {
        throw new Error("COMUN_LEARNING_REVIEW_ROLLBACK_FAILED_SANITIZED");
      }
    }
    throw new Error("COMUN_LEARNING_REVIEW_CAPTURE_BLOCKED_SANITIZED");
  }
}

async function main() {
  assert.ok(
    process.argv.slice(2).every((arg) => arg === "--capture"),
    "LEARNING_REVIEW_UNKNOWN_ARGUMENT",
  );
  const packet = reviewPackage({
    manifestBytes: await readFile(manifestPath),
    migrationBytes: await readFile(migrationPath),
    catalog: JSON.parse(await readFile("lib/learning/catalog.json", "utf8")),
  });
  packet.sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (process.argv.includes("--capture")) {
    validateRemoteTarget({
      databaseUrl: process.env.SUPABASE_DB_URL,
      projectRef: process.env.SUPABASE_PROJECT_REF,
      allowedRefs: process.env.COMUN_LEARNING_REVIEW_ALLOWED_PROJECT_REFS,
    });
    const { default: pg } = await import("pg");
    const client = new pg.Client({
      connectionString: process.env.SUPABASE_DB_URL,
      options: "-c default_transaction_read_only=on",
      connectionTimeoutMillis: 15000,
      query_timeout: 30000,
    });
    try {
      await client.connect();
      packet.capture = await captureMetadata(client);
    } finally {
      await client.end();
    }
  }
  await mkdir(".ci-artifacts/learning-release-review", { recursive: true });
  await writeFile(
    ".ci-artifacts/learning-release-review/package.json",
    `${JSON.stringify(packet, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(packet.status);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch {
    console.error("COMUN_LEARNING_PACKAGE_REVIEW_BLOCKED_SANITIZED");
    process.exitCode = 1;
  }
}
