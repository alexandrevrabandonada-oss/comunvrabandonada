import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildTransactionalPackage } from "./sql-contract.mjs";
import { buildDocuments, query } from "../db/verify-canonical-baseline.mjs";

const MAX_CAPTURE_BUFFER = 64 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 5 * 60 * 1000;
const QUERY_FLAGS = ["--no-psqlrc", "--tuples-only", "--no-align", "--quiet", "--set=ON_ERROR_STOP=1"];
const EXECUTE_FLAGS = ["--no-psqlrc", "--set=ON_ERROR_STOP=1"];

export class SoloRunnerError extends Error {
  constructor(marker) {
    super(marker);
    this.name = "SoloRunnerError";
    this.marker = marker;
  }
}

function fail(marker) {
  throw new SoloRunnerError(marker);
}

function runPsql(sql, flags, {
  databaseUrl = process.env.PR23_DATABASE_URL,
  spawn = spawnSync,
  maxBuffer = MAX_CAPTURE_BUFFER,
} = {}) {
  const result = spawn(
    "docker",
    [
      "run", "--rm", "-i",
      "--add-host=host.docker.internal:host-gateway",
      "postgres:17", "psql", databaseUrl, ...flags,
    ],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer,
      timeout: PROCESS_TIMEOUT_MS,
    },
  );
  if (result?.error?.code === "ENOBUFS") fail("SOLO_PSQL_OUTPUT_BUFFER_EXCEEDED");
  if (result?.error || result?.status === null || result?.status === undefined || result?.signal) {
    fail("SOLO_PSQL_PROCESS_FAILED");
  }
  return result;
}

export function executeSql(sql, options = {}) {
  const result = runPsql(sql, EXECUTE_FLAGS, options);
  if (result.status !== 0) fail("SOLO_CANONICAL_DATABASE_TRANSACTION_FAILED");
}

function queryOutput(sql, options = {}) {
  const result = runPsql(sql, QUERY_FLAGS, options);
  if (result.status !== 0) fail("SOLO_CANONICAL_DATABASE_QUERY_FAILED");
  return typeof result.stdout === "string" ? result.stdout : "";
}

export function queryJson(sql, options = {}) {
  return parseJsonOutput(queryOutput(sql, options));
}

export function parseJsonOutput(stdout) {
  const output = stdout.trim();
  if (!output) fail("SOLO_CANONICAL_BASELINE_OUTPUT_EMPTY");
  try {
    return JSON.parse(output);
  } catch {
    fail("SOLO_CANONICAL_BASELINE_OUTPUT_INVALID");
  }
}

export function queryScalar(sql, options = {}) {
  return parseScalarOutput(queryOutput(sql, options));
}

export function parseScalarOutput(stdout) {
  const output = stdout.replace(/(?:\r?\n)+$/, "");
  if (!output) fail("SOLO_CANONICAL_SCALAR_OUTPUT_INVALID");
  const lines = output.split(/\r?\n/);
  if (lines.length !== 1 || lines[0] !== lines[0].trim()) {
    fail("SOLO_CANONICAL_SCALAR_OUTPUT_INVALID");
  }
  return lines[0];
}

function loadRelease() {
  const releaseFiles = readdirSync(path.resolve("supabase/releases"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
  if (releaseFiles.length !== 1) fail("SOLO_CANONICAL_RELEASE_COUNT_INVALID");
  const release = JSON.parse(
    readFileSync(path.resolve("supabase/releases", releaseFiles[0]), "utf8"),
  );
  const migration = readFileSync(path.resolve(release.migration), "utf8");
  const checksum = createHash("sha256").update(migration).digest("hex");
  if (checksum !== release.migrationSha256) fail("SOLO_CANONICAL_RELEASE_CHECKSUM_MISMATCH");
  const executable = migration
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:''|[^'])*'/g, "''");
  if (/\b(drop|truncate|delete)\b/i.test(executable) || release.destructiveSql !== false) {
    fail("SOLO_CANONICAL_RELEASE_DESTRUCTIVE_SQL");
  }
  return { release, migration };
}

function validateAllowlist() {
  const url = process.env.PR23_DATABASE_URL;
  const ref = process.env.SUPABASE_PROJECT_REF;
  const allowed = (process.env.PR23_ALLOWED_PROJECT_REFS ?? "").split(",").filter(Boolean);
  if (!url || !ref || !allowed.includes(ref) || !url.includes(ref)) {
    fail("SOLO_REMOTE_DATABASE_NOT_ALLOWLISTED");
  }
}

function captureBaseline() {
  return buildDocuments(queryJson(query)).compact;
}

function ledgerValue(release) {
  return `${release.migrationSha256}|${release.expectedPreFingerprint}|${release.expectedPostFingerprint}`;
}

function acceptedLedgerValues(release) {
  return new Set([
    ledgerValue(release),
    ...(release.acceptedLegacyLedgerValues ?? []),
  ]);
}

function readLedger(release) {
  return queryScalar(
    `select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint
     from public.comun_schema_releases
     where release = '${release.release.replaceAll("'", "''")}';`,
  );
}

function hasLedgerRelation(baseline) {
  return baseline.canonical.relations.some(
    (relation) => relation.schema === "public" && relation.name === "comun_schema_releases",
  );
}

function readOnboardingTriggerCount() {
  return queryScalar(`
    select pg_catalog.count(*)::text
    from pg_catalog.pg_trigger trigger
    join pg_catalog.pg_class relation on relation.oid = trigger.tgrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'auth'
      and relation.relname = 'users'
      and trigger.tgname = 'on_auth_user_created'
      and not trigger.tgisinternal;`);
}

export function validatePreflightObjects(baseline, onboardingTriggerCount) {
  const relation = baseline.canonical.relations.find(
    (item) => item.schema === "public" && item.name === "comun_reports",
  );
  const view = baseline.canonical.relations.find(
    (item) => item.schema === "public" && item.name === "comun_public_reports",
  );
  const functions = new Set(baseline.canonical.functions.map((item) => item.name));
  if (
    !relation?.rls
    || !view
    || !functions.has("handle_new_user")
    || onboardingTriggerCount !== "1"
  ) {
    fail("SOLO_CANONICAL_PREFLIGHT_OBJECTS_INVALID");
  }
}

export function validateCurrentState(before, release, readLedgerFn = readLedger) {
  const ledgerPresent = hasLedgerRelation(before);
  if (before.fingerprint === release.expectedPreFingerprint) {
    if (ledgerPresent) fail("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
    return "PRE";
  }
  if (before.fingerprint === release.expectedPostFingerprint) {
    if (!ledgerPresent || !acceptedLedgerValues(release).has(readLedgerFn(release))) {
      fail("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
    }
    return "POST";
  }
  fail("SOLO_CANONICAL_PRE_FINGERPRINT_MISMATCH");
}

export async function main(argv = process.argv.slice(2)) {
  validateAllowlist();
  const { release, migration } = loadRelease();
  const before = captureBaseline();
  validatePreflightObjects(before, readOnboardingTriggerCount());
  const state = validateCurrentState(before, release);

  if (argv.includes("--read-only-preflight")) {
    console.log(`COMUN_CANONICAL_RELEASE_FINGERPRINT ${before.fingerprint}`);
    console.log(`COMUN_CANONICAL_RELEASE_BLOCKING_FINDINGS ${before.security.blockingFindings.length}`);
    console.log(`COMUN_CANONICAL_RELEASE_PLATFORM_OBSERVATIONS ${before.security.platformObservations.length}`);
    console.log(`COMUN_CANONICAL_RELEASE_LEDGER_STATE ${state === "PRE" ? "ABSENT" : "PRESENT"}`);
    console.log("COMUN_CANONICAL_RELEASE_REMOTE_READY");
    return;
  }

  if (state === "POST") {
    console.log("COMUN_CANONICAL_SECURITY_HARDENING_ALREADY_APPLIED");
    return;
  }

  const configuredMigration = migration.replace(
    /^\s*begin;\s*/i,
    `begin;
select pg_catalog.set_config('comun.release_sha256', '${release.migrationSha256}', true);
select pg_catalog.set_config('comun.release_pre_fingerprint', '${release.expectedPreFingerprint}', true);
select pg_catalog.set_config('comun.release_post_fingerprint', '${release.expectedPostFingerprint}', true);
`,
  );
  executeSql(configuredMigration);

  const after = captureBaseline();
  if (after.fingerprint !== release.expectedPostFingerprint) {
    fail("SOLO_CANONICAL_POST_FINGERPRINT_MISMATCH");
  }
  if (after.security.blockingFindings.length !== release.expectedBlockingFindings) {
    fail("SOLO_CANONICAL_SECURITY_FINDINGS_REMAIN");
  }
  if (after.security.platformObservations.length && !release.platformObservationsAllowed) {
    fail("SOLO_CANONICAL_PLATFORM_OBSERVATION_NOT_ALLOWED");
  }
  if (!acceptedLedgerValues(release).has(readLedger(release))) {
    fail("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
  }
  if (after.security.platformObservations.length) {
    console.log(`COMUN_PLATFORM_DEFAULTS_OBSERVED ${after.security.platformObservations.length}`);
  }
  console.log("COMUN_CANONICAL_SECURITY_HARDENING_OK");
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((error) => {
    const marker = error instanceof SoloRunnerError
      ? error.marker
      : "SOLO_PSQL_PROCESS_FAILED";
    console.error(marker);
    process.exitCode = 1;
  });
}
