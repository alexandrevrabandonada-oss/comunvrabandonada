import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildTransactionalPackage } from "./sql-contract.mjs";
import { buildDocuments, query } from "../db/verify-canonical-baseline.mjs";
import {
  selectReleaseManifest,
  validateReleaseSql,
} from "./validate-forward-only-sql.mjs";
import {
  buildDocument as buildScopedDocument,
  buildStructuralDocument,
  fingerprint as fingerprintScoped,
  fingerprintScope,
  query as scopedFingerprintQuery,
  structuralFingerprintScope,
} from "./sidewalk-operational-fingerprint.mjs";

const MAX_CAPTURE_BUFFER = 64 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 5 * 60 * 1000;
const QUERY_FLAGS = [
  "--no-psqlrc",
  "--tuples-only",
  "--no-align",
  "--quiet",
  "--set=ON_ERROR_STOP=1",
];
const EXECUTE_FLAGS = ["--no-psqlrc", "--set=ON_ERROR_STOP=1"];
const LEDGER_ABSENT = "__COMUN_RELEASE_LEDGER_ABSENT__";
const SECURITY_DIAGNOSTIC_PREFIX = "COMUN_RELEASE_SECURITY_DIAGNOSTIC ";
const DIAGNOSTIC_FORBIDDEN_KEY =
  /(?:email|phone|user.?id|object_key|exact_latitude|exact_longitude|file(?:name)?|content|notes?|password|token|dsn)/i;
const DIAGNOSTIC_FORBIDDEN_VALUE =
  /(?:postgres(?:ql)?:\/\/|\b(?:password|token|secret|dsn)\b|\b(?:email|phone|user_id|object_key|exact_latitude|exact_longitude)\b|[-+]?\d{1,3}\.\d{4,}\s*,\s*[-+]?\d{1,3}\.\d{4,})/i;
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

function stableSort(items) {
  return [...items].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function safeDiagnosticObject(value) {
  const object = String(value ?? "");
  if (object === "schema public") return object;
  if (
    /^(?:public|storage)\.[a-z_][a-z0-9_-]*(?:\.[a-z_][a-z0-9_-]*)?(?:\([a-z0-9_, ]*\))?$/i.test(
      object,
    )
  ) {
    return object;
  }
  if (/^(?:public|\*):[a-z]$/i.test(object)) return object;
  return "redacted-catalog-object";
}

function safeDiagnosticDetail(rule, sourceDetail) {
  if (rule === "DANGEROUS_RELATION_GRANT") {
    const match = String(sourceDetail ?? "").match(
      /^(anon|authenticated):(TRUNCATE|TRIGGER|MAINTAIN)$/,
    );
    if (match) return `role=${match[1]}; privilege=${match[2]}`;
  }
  const details = {
    RLS_ENABLED: "exposed relation has row-level security disabled",
    DANGEROUS_RELATION_GRANT: "dangerous relation privilege is exposed",
    PUBLIC_SCHEMA_CREATE: "public schema create privilege is exposed",
    DEFINER_SEARCH_PATH: "security definer search path is not fixed",
    DEFINER_EXECUTE: "security definer execute privilege is exposed",
    VIEW_SECURITY_INVOKER: "exposed view is not security invoker",
    PRIVATE_BUCKET: "private or original bucket is public",
    STORAGE_POLICY_EXPOSURE:
      "exposed storage policy references a sensitive locator",
    DANGEROUS_DEFAULT_PRIVILEGE: "dangerous default privilege is exposed",
    SUPABASE_ADMIN_DEFAULT_PRIVILEGES:
      "managed platform default privileges observed",
  };
  return details[rule] ?? "security rule violation";
}

function sanitizeDiagnosticItem(item) {
  return {
    classification: String(
      item?.classification ?? "UNKNOWN_SECURITY_CLASSIFICATION",
    )
      .replace(/[^A-Z0-9_]/gi, "_")
      .toUpperCase(),
    rule: String(item?.rule ?? "UNKNOWN_SECURITY_RULE")
      .replace(/[^A-Z0-9_]/gi, "_")
      .toUpperCase(),
    object: safeDiagnosticObject(item?.object),
    detail: safeDiagnosticDetail(item?.rule, item?.detail),
  };
}

function securityDiagnosticSnapshot(baseline, ledgerState) {
  const security = baseline?.security ?? {};
  const blockingFindings = stableSort(
    (security.blockingFindings ?? []).map(sanitizeDiagnosticItem),
  );
  const platformObservations = stableSort(
    (security.platformObservations ?? []).map(sanitizeDiagnosticItem),
  );
  return {
    fingerprint: baseline?.fingerprint ?? "NOT_REACHED",
    blockingFindingsCount: blockingFindings.length,
    blockingFindings,
    platformObservationsCount: platformObservations.length,
    platformObservations,
    ledgerState,
  };
}

export function buildSanitizedSecurityDiagnostic({
  before,
  after,
  beforeLedgerState,
  afterLedgerState,
}) {
  return {
    formatVersion: 1,
    scope: "COMUN_RELEASE_SECURITY_DIAGNOSTIC",
    before: securityDiagnosticSnapshot(before, beforeLedgerState),
    after: securityDiagnosticSnapshot(after, afterLedgerState),
  };
}

function assertExactKeys(value, expected) {
  const keys = Object.keys(value || {}).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...expected].sort())) {
    throw new Error("SOLO_SECURITY_DIAGNOSTIC_SHAPE_INVALID");
  }
}

function assertDiagnosticItem(item) {
  assertExactKeys(item, ["classification", "rule", "object", "detail"]);
  if (
    !/^[A-Z0-9_]+$/.test(item.classification) ||
    !/^[A-Z0-9_]+$/.test(item.rule)
  ) {
    throw new Error("SOLO_SECURITY_DIAGNOSTIC_SHAPE_INVALID");
  }
  const validGrantDetail =
    item.rule === "DANGEROUS_RELATION_GRANT" &&
    /^role=(?:anon|authenticated); privilege=(?:TRUNCATE|TRIGGER|MAINTAIN)$/.test(
      item.detail,
    );
  const validStaticDetail =
    item.rule !== "DANGEROUS_RELATION_GRANT" &&
    item.detail === safeDiagnosticDetail(item.rule);
  if (
    item.object !== safeDiagnosticObject(item.object) ||
    (!validGrantDetail && !validStaticDetail)
  ) {
    throw new Error("SOLO_SECURITY_DIAGNOSTIC_SHAPE_INVALID");
  }
}

function assertDiagnosticSnapshot(snapshot) {
  assertExactKeys(snapshot, [
    "fingerprint",
    "blockingFindingsCount",
    "blockingFindings",
    "platformObservationsCount",
    "platformObservations",
    "ledgerState",
  ]);
  if (
    !/^(?:[a-f0-9]{64}|NOT_REACHED)$/.test(snapshot.fingerprint) ||
    !["ABSENT", "PRESENT_ACCEPTED", "PRESENT_MISMATCH", "NOT_REACHED"].includes(
      snapshot.ledgerState,
    ) ||
    snapshot.blockingFindingsCount !== snapshot.blockingFindings.length ||
    snapshot.platformObservationsCount !== snapshot.platformObservations.length
  ) {
    throw new Error("SOLO_SECURITY_DIAGNOSTIC_SHAPE_INVALID");
  }
  snapshot.blockingFindings.forEach(assertDiagnosticItem);
  snapshot.platformObservations.forEach(assertDiagnosticItem);
}

function assertNoForbiddenDiagnosticData(value) {
  if (Array.isArray(value))
    return value.forEach(assertNoForbiddenDiagnosticData);
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (DIAGNOSTIC_FORBIDDEN_KEY.test(key))
        throw new Error("SOLO_SECURITY_DIAGNOSTIC_FORBIDDEN_FIELD");
      assertNoForbiddenDiagnosticData(nested);
    }
    return;
  }
  if (typeof value === "string" && DIAGNOSTIC_FORBIDDEN_VALUE.test(value))
    throw new Error("SOLO_SECURITY_DIAGNOSTIC_FORBIDDEN_VALUE");
}

export function serializeSanitizedSecurityDiagnostic(diagnostic) {
  assertExactKeys(diagnostic, ["formatVersion", "scope", "before", "after"]);
  if (
    diagnostic.formatVersion !== 1 ||
    diagnostic.scope !== "COMUN_RELEASE_SECURITY_DIAGNOSTIC"
  ) {
    throw new Error("SOLO_SECURITY_DIAGNOSTIC_SHAPE_INVALID");
  }
  assertDiagnosticSnapshot(diagnostic.before);
  assertDiagnosticSnapshot(diagnostic.after);
  assertNoForbiddenDiagnosticData(diagnostic);
  return `${JSON.stringify(diagnostic)}\n`;
}

function securityDiagnosticOutputPath(argv) {
  const value = argv
    .find((argument) => argument.startsWith("--security-diagnostic-output="))
    ?.slice(29);
  if (!value) return null;
  const artifactRoot = `${path.resolve(".ci-artifacts")}${path.sep}`;
  const target = path.resolve(value);
  if (!target.startsWith(artifactRoot))
    fail("SOLO_SECURITY_DIAGNOSTIC_OUTPUT_INVALID");
  return target;
}

async function emitSecurityDiagnostic(diagnostic, outputPath) {
  const serialized = serializeSanitizedSecurityDiagnostic(diagnostic);
  console.log(`${SECURITY_DIAGNOSTIC_PREFIX}${serialized.trimEnd()}`);
  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, "utf8");
  }
}

export function localPublishedDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return (
      ["postgres:", "postgresql:"].includes(parsed.protocol) &&
      ["127.0.0.1", "localhost", "host.docker.internal"].includes(
        parsed.hostname,
      ) &&
      /^\/[Pp]ostgres$/.test(parsed.pathname) &&
      /^\d{1,5}$/.test(parsed.port) &&
      Number(parsed.port) > 0 &&
      Number(parsed.port) <= 65535
    );
  } catch {
    return false;
  }
}

export function dockerDatabaseUrl(databaseUrl) {
  if (!localPublishedDatabaseUrl(databaseUrl)) return databaseUrl;
  const parsed = new URL(databaseUrl);
  if (["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    parsed.hostname = "host.docker.internal";
  }
  return parsed.toString();
}

function dockerNetworkArgs(dockerNetwork, requiresHostGateway = false) {
  const args = [];
  if (dockerNetwork) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(dockerNetwork)) {
      fail("SOLO_PSQL_CLIENT_NETWORK_INVALID");
    }
    args.push("--network", dockerNetwork);
  }
  if (requiresHostGateway)
    args.push("--add-host=host.docker.internal:host-gateway");
  return args;
}

export function runPsql(
  sql,
  flags,
  {
    databaseUrl = process.env.PR23_DATABASE_URL,
    dockerNetwork = process.env.PR23_DOCKER_NETWORK,
    spawn = spawnSync,
    maxBuffer = MAX_CAPTURE_BUFFER,
  } = {},
) {
  const psqlDatabaseUrl = dockerDatabaseUrl(databaseUrl);
  const requiresHostGateway = psqlDatabaseUrl !== databaseUrl;
  const result = spawn(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      ...dockerNetworkArgs(dockerNetwork, requiresHostGateway),
      "postgres:17",
      "psql",
      psqlDatabaseUrl,
      ...flags,
    ],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer,
      timeout: PROCESS_TIMEOUT_MS,
    },
  );
  if (result?.error?.code === "ENOBUFS")
    fail("SOLO_PSQL_OUTPUT_BUFFER_EXCEEDED");
  if (
    result?.error ||
    result?.status === null ||
    result?.status === undefined ||
    result?.signal
  ) {
    fail("SOLO_PSQL_PROCESS_FAILED");
  }
  return result;
}

export function executeSql(sql, options = {}) {
  const result = runPsql(sql, EXECUTE_FLAGS, options);
  if (result.status !== 0) fail("SOLO_CANONICAL_DATABASE_TRANSACTION_FAILED");
}

export function readOnlyTransactionSql(sql) {
  return [
    "set default_transaction_read_only = on;",
    "begin transaction read only;",
    String(sql).trim(),
    "rollback;",
  ].join("\n");
}

function queryOutput(sql, { readOnly = false, ...options } = {}) {
  const result = runPsql(
    readOnly ? readOnlyTransactionSql(sql) : sql,
    QUERY_FLAGS,
    options,
  );
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
    const explicit = argv
      .find((value) => value.startsWith("--release-manifest="))
      ?.slice(19);
    const selected = selectReleaseManifest(
      explicit ?? process.env.COMUN_RELEASE_MANIFEST,
    );
    return validateReleaseSql(selected);
  } catch (error) {
    const marker =
      error instanceof Error
        ? error.message
        : "SOLO_RELEASE_MANIFEST_NOT_SELECTED";
    fail(
      marker.startsWith("SOLO_")
        ? marker
        : "SOLO_RELEASE_MANIFEST_NOT_SELECTED",
    );
  }
}

function validateAllowlist() {
  const url = process.env.PR23_DATABASE_URL;
  const ref = process.env.SUPABASE_PROJECT_REF;
  const allowed = (process.env.PR23_ALLOWED_PROJECT_REFS ?? "")
    .split(",")
    .filter(Boolean);
  if (ref === "LOCAL_VALIDATION") {
    const localHostDatabase = localPublishedDatabaseUrl(url);
    const localNetworkDatabase =
      /^postgres(?:ql)?:\/\/[^@]+@db:5432\/postgres(?:[/?]|$)/.test(
        url ?? "",
      ) &&
      /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(
        process.env.PR23_DOCKER_NETWORK ?? "",
      );
    const localDatabase = localHostDatabase || localNetworkDatabase;
    if (!localDatabase || !allowed.includes(ref))
      fail("SOLO_REMOTE_DATABASE_NOT_ALLOWLISTED");
    return;
  }
  if (!url || !ref || !allowed.includes(ref) || !url.includes(ref)) {
    fail("SOLO_REMOTE_DATABASE_NOT_ALLOWLISTED");
  }
}

function captureBaseline({ readOnly = false } = {}) {
  const document = buildDocuments(queryJson(query, { readOnly })).compact;
  const normalized = queryOutput(schemaFingerprintQuery, { readOnly })
    .replace(/\r\n/g, "\n")
    .trimEnd();
  if (!normalized) fail("SOLO_SCHEMA_FINGERPRINT_EMPTY");
  return {
    ...document,
    fingerprint: createHash("sha256").update(normalized).digest("hex"),
    fingerprintAlgorithm: "sha256-postgres-public-catalog-v1",
  };
}

export function scopedFingerprintDocument(raw, scope) {
  if (scope === fingerprintScope) return buildScopedDocument(raw);
  if (scope === structuralFingerprintScope) return buildStructuralDocument(raw);
  fail("SOLO_SCOPED_FINGERPRINT_SCOPE_INVALID");
}

function captureScopedBaseline({ readOnly = false, release } = {}) {
  if (!release?.fingerprintScope) fail("SOLO_SCOPED_FINGERPRINT_SCOPE_INVALID");
  const raw = queryOutput(scopedFingerprintQuery, { readOnly });
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("SOLO_SCOPED_FINGERPRINT_JSON_INVALID");
  }
  const document = scopedFingerprintDocument(parsed, release.fingerprintScope);
  return { fingerprint: fingerprintScoped(document), document };
}

function expectedScopedFingerprint(release, key) {
  if (!release.fingerprintScope) return release[key];
  const scopedKey =
    key === "expectedPreFingerprint"
      ? "expectedScopedPreFingerprint"
      : "expectedScopedPostFingerprint";
  const value = release[scopedKey];
  if (!/^[a-f0-9]{64}$/.test(value ?? ""))
    fail("SOLO_SCOPED_FINGERPRINT_EXPECTATION_MISSING");
  return value;
}

const expectedPre = (release) =>
  expectedScopedFingerprint(release, "expectedPreFingerprint");
const expectedPost = (release) =>
  expectedScopedFingerprint(release, "expectedPostFingerprint");

export function localValidationLedgerAdoptionSql(release) {
  if (
    release.release !== "20260724233256-comun-sidewalk-operational-hardening" ||
    !/^[a-f0-9]{64}$/.test(release.migrationSha256 ?? "") ||
    !/^[a-f0-9]{64}$/.test(expectedPre(release)) ||
    !/^[a-f0-9]{64}$/.test(expectedPost(release))
  ) {
    fail("SOLO_LOCAL_LEDGER_RELEASE_INVALID");
  }
  const quoted = (value) => String(value).replaceAll("'", "''");
  return `
begin;
do $local_ledger$
declare
  adopted_count integer;
begin
  update public.comun_schema_releases
  set migration_sha256 = '${quoted(release.migrationSha256)}',
      pre_fingerprint = '${quoted(expectedPre(release))}',
      post_fingerprint = '${quoted(expectedPost(release))}'
  where release = '${quoted(release.release)}'
    and status = 'applied'
    and migration_path = '${quoted(release.migration)}'
    and migration_sha256 = 'LOCAL_VALIDATION'
    and pre_fingerprint = 'LOCAL_VALIDATION'
    and post_fingerprint = 'LOCAL_VALIDATION';
  get diagnostics adopted_count = row_count;
  if adopted_count <> 1 then
    raise exception 'COMUN_LOCAL_LEDGER_ADOPTION_REFUSED';
  end if;
end
$local_ledger$;
commit;`;
}

function ledgerValue(release) {
  return `${release.migrationSha256}|${expectedPre(release)}|${expectedPost(release)}`;
}

function acceptedLedgerValues(release) {
  return new Set([
    ledgerValue(release),
    ...(release.acceptedLegacyLedgerValues ?? []),
  ]);
}

function readLedger(release, options = {}) {
  return queryScalar(
    `select coalesce((
       select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint
       from public.comun_schema_releases
       where release = '${release.release.replaceAll("'", "''")}'
     ), '${LEDGER_ABSENT}');`,
    options,
  );
}

function summarizeLedgerState(release, options = {}) {
  const value = readLedger(release, options);
  if (value === LEDGER_ABSENT) return "ABSENT";
  return acceptedLedgerValues(release).has(value)
    ? "PRESENT_ACCEPTED"
    : "PRESENT_MISMATCH";
}

export function releaseMarker(release, suffix) {
  if (
    release.release === "20260724233256-comun-sidewalk-operational-hardening"
  ) {
    return `COMUN_SIDEWALK_OPERATIONAL_HARDENING_${suffix}`;
  }
  return `COMUN_CANONICAL_SECURITY_HARDENING_${suffix}`;
}

function readOnboardingTriggerCount(options = {}) {
  return queryScalar(
    `
    select pg_catalog.count(*)::text
    from pg_catalog.pg_trigger trigger
    join pg_catalog.pg_class relation on relation.oid = trigger.tgrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'auth'
      and relation.relname = 'users'
      and trigger.tgname = 'on_auth_user_created'
      and not trigger.tgisinternal;`,
    options,
  );
}

export function validatePreflightObjects(baseline, onboardingTriggerCount) {
  const relation = baseline.canonical.relations.find(
    (item) => item.schema === "public" && item.name === "comun_reports",
  );
  const view = baseline.canonical.relations.find(
    (item) => item.schema === "public" && item.name === "comun_public_reports",
  );
  const functions = new Set(
    baseline.canonical.functions.map((item) => item.name),
  );
  const hasOnboardingFunction = functions.has("handle_new_user");
  const validOnboardingState = hasOnboardingFunction
    ? onboardingTriggerCount === "1"
    : onboardingTriggerCount === "0";
  if (!relation?.rls || !view || !validOnboardingState) {
    fail("SOLO_CANONICAL_PREFLIGHT_OBJECTS_INVALID");
  }
}

export function validateCurrentState(
  before,
  release,
  readLedgerFn = readLedger,
) {
  const ledgerValueForRelease = readLedgerFn(release);
  if (before.fingerprint === expectedPre(release)) {
    if (ledgerValueForRelease !== LEDGER_ABSENT)
      fail("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
    return "PRE";
  }
  if (before.fingerprint === expectedPost(release)) {
    if (!acceptedLedgerValues(release).has(ledgerValueForRelease)) {
      fail("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
    }
    return "POST";
  }
  fail("SOLO_CANONICAL_PRE_FINGERPRINT_MISMATCH");
}

export function validateBlockingFindings(baseline, expectedBlockingFindings) {
  if (baseline.security.blockingFindings.length !== expectedBlockingFindings) {
    fail("SOLO_CANONICAL_SECURITY_FINDINGS_REMAIN");
  }
}

export async function main(argv = process.argv.slice(2)) {
  validateAllowlist();
  const { release, migration } = loadRelease(argv);
  const readOnlyPreflight = argv.includes("--read-only-preflight");
  const readOnlyPostflight = argv.includes("--read-only-postflight");
  if (readOnlyPreflight && readOnlyPostflight)
    fail("SOLO_CANONICAL_READONLY_MODE_INVALID");
  if (argv.includes("--adopt-local-validation-ledger")) {
    if (process.env.SUPABASE_PROJECT_REF !== "LOCAL_VALIDATION")
      fail("SOLO_LOCAL_LEDGER_LOCAL_ONLY");
    executeSql(localValidationLedgerAdoptionSql(release));
    console.log("COMUN_SIDEWALK_OPERATIONAL_LOCAL_LEDGER_READY");
    return;
  }
  const diagnosticOutput = securityDiagnosticOutputPath(argv);
  const readOnly = readOnlyPreflight || readOnlyPostflight;
  const globalBefore = captureBaseline({ readOnly });
  validatePreflightObjects(
    globalBefore,
    readOnboardingTriggerCount({ readOnly }),
  );
  const before = release.fingerprintScope
    ? captureScopedBaseline({ readOnly, release })
    : globalBefore;
  const readLedgerForState = (candidate) => readLedger(candidate, { readOnly });
  const state = validateCurrentState(before, release, readLedgerForState);
  const beforeLedgerState = summarizeLedgerState(release, { readOnly });

  if (readOnlyPreflight) {
    await emitSecurityDiagnostic(
      buildSanitizedSecurityDiagnostic({
        before: globalBefore,
        after: null,
        beforeLedgerState,
        afterLedgerState: "NOT_REACHED",
      }),
      diagnosticOutput,
    );
    console.log(
      `COMUN_CANONICAL_RELEASE_FINGERPRINT ${globalBefore.fingerprint}`,
    );
    console.log(`COMUN_SCOPED_RELEASE_FINGERPRINT ${before.fingerprint}`);
    console.log(
      `COMUN_CANONICAL_RELEASE_BLOCKING_FINDINGS ${globalBefore.security.blockingFindings.length}`,
    );
    console.log(
      `COMUN_CANONICAL_RELEASE_PLATFORM_OBSERVATIONS ${globalBefore.security.platformObservations.length}`,
    );
    console.log(
      `COMUN_CANONICAL_RELEASE_LEDGER_STATE ${state === "PRE" ? "ABSENT" : "PRESENT"}`,
    );
    console.log("COMUN_CANONICAL_RELEASE_REMOTE_READY");
    return;
  }

  if (readOnlyPostflight) {
    if (state !== "POST") fail("SOLO_CANONICAL_POST_FINGERPRINT_MISMATCH");
    await emitSecurityDiagnostic(
      buildSanitizedSecurityDiagnostic({
        before: globalBefore,
        after: globalBefore,
        beforeLedgerState,
        afterLedgerState: beforeLedgerState,
      }),
      diagnosticOutput,
    );
    console.log(
      `COMUN_CANONICAL_RELEASE_FINGERPRINT ${globalBefore.fingerprint}`,
    );
    console.log(`COMUN_SCOPED_RELEASE_FINGERPRINT ${before.fingerprint}`);
    console.log("COMUN_CANONICAL_RELEASE_POST_READY");
    return;
  }

  if (state === "POST") {
    await emitSecurityDiagnostic(
      buildSanitizedSecurityDiagnostic({
        before: globalBefore,
        after: globalBefore,
        beforeLedgerState,
        afterLedgerState: beforeLedgerState,
      }),
      diagnosticOutput,
    );
    console.log(releaseMarker(release, "ALREADY_APPLIED"));
    return;
  }

  const configuredMigration = migration.replace(
    /^\s*begin;\s*/i,
    `begin;
select pg_catalog.set_config('comun.release_sha256', '${release.migrationSha256}', true);
select pg_catalog.set_config('comun.release_pre_fingerprint', '${expectedPre(release)}', true);
select pg_catalog.set_config('comun.release_post_fingerprint', '${expectedPost(release)}', true);
`,
  );
  executeSql(configuredMigration);

  const globalAfter = captureBaseline();
  const after = release.fingerprintScope
    ? captureScopedBaseline({ release })
    : globalAfter;
  const afterLedgerState = summarizeLedgerState(release);
  const diagnostic = buildSanitizedSecurityDiagnostic({
    before: globalBefore,
    after: globalAfter,
    beforeLedgerState,
    afterLedgerState,
  });
  await emitSecurityDiagnostic(diagnostic, diagnosticOutput);
  if (after.fingerprint !== expectedPost(release)) {
    fail("SOLO_CANONICAL_POST_FINGERPRINT_MISMATCH");
  }
  validateBlockingFindings(globalAfter, release.expectedBlockingFindings);
  if (
    globalAfter.security.platformObservations.length &&
    !release.platformObservationsAllowed
  ) {
    fail("SOLO_CANONICAL_PLATFORM_OBSERVATION_NOT_ALLOWED");
  }
  if (!acceptedLedgerValues(release).has(readLedger(release))) {
    fail("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH");
  }
  if (globalAfter.security.platformObservations.length) {
    console.log(
      `COMUN_PLATFORM_DEFAULTS_OBSERVED ${globalAfter.security.platformObservations.length}`,
    );
  }
  console.log(releaseMarker(release, "OK"));
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((error) => {
    const marker =
      error instanceof SoloRunnerError
        ? error.marker
        : "SOLO_PSQL_PROCESS_FAILED";
    console.error(marker);
    process.exitCode = 1;
  });
}
