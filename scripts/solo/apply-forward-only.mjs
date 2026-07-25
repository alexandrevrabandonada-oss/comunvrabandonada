import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildTransactionalPackage } from "./sql-contract.mjs";
import { buildDocuments, query } from "../db/verify-canonical-baseline.mjs";
import { selectReleaseManifest, validateReleaseSql } from "./validate-forward-only-sql.mjs";

const MAX_CAPTURE_BUFFER = 64 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 5 * 60 * 1000;
const QUERY_FLAGS = ["--no-psqlrc", "--tuples-only", "--no-align", "--quiet", "--set=ON_ERROR_STOP=1"];
const EXECUTE_FLAGS = ["--no-psqlrc", "--set=ON_ERROR_STOP=1"];
const LEDGER_ABSENT = "__COMUN_RELEASE_LEDGER_ABSENT__";
export const schemaFingerprintQuery = String.raw`
with objects as (
  select 'column' kind, c.table_name || '.' || c.column_name name,
    concat_ws('|', c.ordinal_position, c.data_type, c.udt_schema, c.udt_name, c.is_nullable, coalesce(c.column_default, '')) definition
  from information_schema.columns c where c.table_schema = 'public'
  union all
  select 'constraint', cls.relname || '.' || con.conname, pg_get_constraintdef(con.oid, true)
  from pg_constraint con join pg_class cls on cls.oid = con.conrelid join pg_namespace ns on ns.oid = cls.relnamespace
  where ns.nspname = 'public'
  union all
  select 'index', tablename || '.' || indexname, indexdef from pg_indexes where schemaname = 'public'
  union all
  select 'policy', tablename || '.' || policyname,
    concat_ws('|', permissive, array_to_string(roles, ','), cmd, coalesce(qual, ''), coalesce(with_check, ''))
  from pg_policies where schemaname = 'public'
  union all
  select 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', pg_get_functiondef(p.oid)
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public'
)
select kind || E'\t' || name || E'\t' || definition from objects order by kind, name, definition;`;

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

function dockerNetworkArgs(dockerNetwork) {
  if (!dockerNetwork) return ["--add-host=host.docker.internal:host-gateway"];
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(dockerNetwork)) {
    fail("SOLO_PSQL_CLIENT_NETWORK_INVALID");
  }
  return ["--network", dockerNetwork];
}

function runPsql(sql, flags, {
  databaseUrl = process.env.PR23_DATABASE_URL,
  dockerNetwork = process.env.PR23_DOCKER_NETWORK,
  spawn = spawnSync,
  maxBuffer = MAX_CAPTURE_BUFFER,
} = {}) {
  const result = spawn(
    "docker",
    [
      "run", "--rm", "-i",
      ...dockerNetworkArgs(dockerNetwork),
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

function loadRelease(argv = []) {
  try {
    const explicit = argv.find((value) => value.startsWith("--release-manifest="))?.slice(19);
    const selected = selectReleaseManifest(explicit ?? process.env.COMUN_RELEASE_MANIFEST);
    return validateReleaseSql(selected);
  } catch (error) {
    const marker = error instanceof Error ? error.message : "SOLO_RELEASE_MANIFEST_NOT_SELECTED";
    fail(marker.startsWith("SOLO_") ? marker : "SOLO_RELEASE_MANIFEST_NOT_SELECTED");
  }
}

function validateAllowlist() {
  const url = process.env.PR23_DATABASE_URL;
  const ref = process.env.SUPABASE_PROJECT_REF;
  const allowed = (process.env.PR23_ALLOWED_PROJECT_REFS ?? "").split(",").filter(Boolean);
  if (ref === "LOCAL_VALIDATION") {
    const localHostDatabase = /^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost|host\.docker\.internal):55432\/postgres(?:[/?]|$)/.test(url ?? "");
    const localNetworkDatabase = /^postgres(?:ql)?:\/\/[^@]+@db:5432\/postgres(?:[/?]|$)/.test(url ?? "")
      && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(process.env.PR23_DOCKER_NETWORK ?? "");
    const localDatabase = localHostDatabase || localNetworkDatabase;
    if (!localDatabase || !allowed.includes(ref)) fail("SOLO_REMOTE_DATABASE_NOT_ALLOWLISTED");
    return;
  }
  if (!url || !ref || !allowed.includes(ref) || !url.includes(ref)) {
    fail("SOLO_REMOTE_DATABASE_NOT_ALLOWLISTED");
  }
}

function captureBaseline() {
  const document = buildDocuments(queryJson(query)).compact;
  const normalized = queryOutput(schemaFingerprintQuery).replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) fail("SOLO_SCHEMA_FINGERPRINT_EMPTY");
  return {
    ...document,
    fingerprint: createHash("sha256").update(normalized).digest("hex"),
    fingerprintAlgorithm: "sha256-postgres-public-catalog-v1",
  };
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
    `select coalesce((
       select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint
       from public.comun_schema_releases
       where release = '${release.release.replaceAll("'", "''")}'
     ), '${LEDGER_ABSENT}');`,
  );
}

export function releaseMarker(release, suffix) {
  if (release.release === "20260724233256-comun-sidewalk-operational-hardening") {
    return `COMUN_SIDEWALK_OPERATIONAL_HARDENING_${suffix}`;
  }
  return `COMUN_CANONICAL_SECURITY_HARDENING_${suffix}`;
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
  const hasOnboardingFunction = functions.has("handle_new_user");
  const validOnboardingState = hasOnboardingFunction
    ? onboardingTriggerCount === "1"
    : onboardingTriggerCount === "0";
  if (!relation?.rls || !view || !validOnboardingState) {
    fail("SOLO_CANONICAL_PREFLIGHT_OBJECTS_INVALID");
  }
}

export function validateCurrentState(before, release, readLedgerFn = readLedger) {
  const ledgerValueForRelease = readLedgerFn(release);
  if (before.fingerprint === release.expectedPreFingerprint) {
    if (ledgerValueForRelease !== LEDGER_ABSENT) fail("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
    return "PRE";
  }
  if (before.fingerprint === release.expectedPostFingerprint) {
    if (!acceptedLedgerValues(release).has(ledgerValueForRelease)) {
      fail("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
    }
    return "POST";
  }
  fail("SOLO_CANONICAL_PRE_FINGERPRINT_MISMATCH");
}

export async function main(argv = process.argv.slice(2)) {
  validateAllowlist();
  const { release, migration } = loadRelease(argv);
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
    console.log(releaseMarker(release, "ALREADY_APPLIED"));
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
  console.log(releaseMarker(release, "OK"));
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
