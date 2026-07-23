import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildTransactionalPackage } from "./sql-contract.mjs";
import { buildDocuments, query } from "../db/verify-canonical-baseline.mjs";

const url = process.env.PR23_DATABASE_URL;
const ref = process.env.SUPABASE_PROJECT_REF;
const allowed = (process.env.PR23_ALLOWED_PROJECT_REFS ?? "").split(",").filter(Boolean);
if (!url || !ref || !allowed.includes(ref) || !url.includes(ref)) {
  throw new Error("SOLO_REMOTE_DATABASE_NOT_ALLOWLISTED");
}

const postgres = (input) =>
  spawnSync(
    "docker",
    ["run", "--rm", "-i", "postgres:17", "psql", url, "-X", "-v", "ON_ERROR_STOP=1"],
    {
      input,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

const releaseFiles = readdirSync(path.resolve("supabase/releases"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name);

if (releaseFiles.length > 0) {
  if (releaseFiles.length !== 1) throw new Error("SOLO_CANONICAL_RELEASE_COUNT_INVALID");
  const release = JSON.parse(
    readFileSync(path.resolve("supabase/releases", releaseFiles[0]), "utf8"),
  );
  const migrationPath = path.resolve(release.migration);
  const migration = readFileSync(migrationPath, "utf8");
  const checksum = createHash("sha256").update(migration).digest("hex");
  if (checksum !== release.migrationSha256) {
    throw new Error("SOLO_CANONICAL_RELEASE_CHECKSUM_MISMATCH");
  }
  const executable = migration
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:''|[^'])*'/g, "''");
  if (/\b(drop|truncate|delete)\b/i.test(executable) || release.destructiveSql !== false) {
    throw new Error("SOLO_CANONICAL_RELEASE_DESTRUCTIVE_SQL");
  }
  const capture = () => {
    const result = postgres(query);
    if (result.status !== 0) throw new Error("SOLO_CANONICAL_BASELINE_CAPTURE_FAILED");
    const raw = JSON.parse(result.stdout.trim());
    return buildDocuments(raw).compact;
  };
  const before = capture();
  if (before.fingerprint !== release.expectedPreFingerprint) {
    if (before.fingerprint === release.expectedPostFingerprint) {
      const ledger = postgres(
        `select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint
         from public.comun_schema_releases
         where release = '${release.release.replaceAll("'", "''")}';`,
      );
      const expected = `${release.migrationSha256}|${release.expectedPreFingerprint}|${release.expectedPostFingerprint}`;
      if (ledger.status !== 0 || ledger.stdout.trim() !== expected) {
        throw new Error("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
      }
      console.log("COMUN_CANONICAL_SECURITY_HARDENING_ALREADY_APPLIED");
      process.exit(0);
    }
    throw new Error("SOLO_CANONICAL_PRE_FINGERPRINT_MISMATCH");
  }
  const configuredMigration = migration.replace(
    /^\s*begin;\s*/i,
    `begin;
select pg_catalog.set_config('comun.release_sha256', '${release.migrationSha256}', true);
select pg_catalog.set_config('comun.release_pre_fingerprint', '${release.expectedPreFingerprint}', true);
select pg_catalog.set_config('comun.release_post_fingerprint', '${release.expectedPostFingerprint}', true);
`,
  );
  const result = postgres(configuredMigration);
  if (result.status !== 0) {
    const message = (
      result.stderr.match(/ERROR:\s+([^\r\n]+)/)?.[1] ?? "transaction failed"
    ).slice(0, 240);
    throw new Error(`SOLO_CANONICAL_RELEASE_ROLLBACK:${message}`);
  }
  const after = capture();
  if (after.fingerprint !== release.expectedPostFingerprint) {
    throw new Error("SOLO_CANONICAL_POST_FINGERPRINT_MISMATCH");
  }
  if (after.security.blockingFindings.length !== release.expectedBlockingFindings) {
    throw new Error("SOLO_CANONICAL_SECURITY_FINDINGS_REMAIN");
  }
  if (after.security.platformObservations.length && !release.platformObservationsAllowed) {
    throw new Error("SOLO_CANONICAL_PLATFORM_OBSERVATION_NOT_ALLOWED");
  }
  if (after.security.platformObservations.length) {
    console.log(`COMUN_PLATFORM_DEFAULTS_OBSERVED ${after.security.platformObservations.length}`);
  }
  const ledger = postgres(
    `select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint
     from public.comun_schema_releases
     where release = '${release.release.replaceAll("'", "''")}';`,
  );
  const expectedLedger = `${release.migrationSha256}|${release.expectedPreFingerprint}|${release.expectedPostFingerprint}`;
  if (ledger.status !== 0 || ledger.stdout.trim() !== expectedLedger) {
    throw new Error("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
  }
  console.log("COMUN_CANONICAL_SECURITY_HARDENING_OK");
  process.exit(0);
}

const postflight = readFileSync(
  path.resolve("supabase/reconciliation/pr23/postflight_assertions.sql"),
  "utf8",
);
const current = postgres(postflight);
if (current.status === 0) {
  console.log("COMUN_FORWARD_ONLY_ALREADY_RECONCILED");
  process.exit(0);
}

const sql = buildTransactionalPackage();
const result = postgres(sql);
/*
 * O pacote completo só é executado quando o postflight read-only não reconhece
 * o estado final. A transação continua sendo a única fronteira de escrita.
 */
if (result.status !== 0) {
  const message = (result.stderr.match(/ERROR:\s+([^\r\n]+)/)?.[1] ?? "transaction failed").slice(0, 240);
  throw new Error(`SOLO_FORWARD_ONLY_ROLLBACK:${message}`);
}
console.log("COMUN_FORWARD_ONLY_TRANSACTION_COMMITTED");
