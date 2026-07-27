import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildDocuments,
  query as globalFingerprintQuery,
} from "../db/verify-canonical-baseline.mjs";
import {
  buildDocument as buildScopedDocument,
  fingerprint as fingerprintScoped,
  fingerprintScope,
  query as scopedFingerprintQuery,
  scopedObjects,
} from "./sidewalk-operational-fingerprint.mjs";
import {
  selectReleaseManifest,
  validateReleaseSql,
} from "./validate-forward-only-sql.mjs";

export const CLASSIFICATIONS = Object.freeze([
  "GLOBAL_ONLY_DRIFT",
  "SIDEWALK_SCOPE_PRE_DRIFT",
  "PARTIAL_RELEASE_STATE",
  "POST_WITH_LEDGER_MISMATCH",
  "ALREADY_APPLIED_ACCEPTED",
  "INSUFFICIENT_READ_PERMISSION",
]);

const RELEASE = "20260724233256-comun-sidewalk-operational-hardening";
const MIGRATION_SHA256 =
  "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be";
const MANIFEST_SHA256 =
  "ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335";
const READ_ONLY_PREFIX =
  "set default_transaction_read_only = on; begin transaction read only;";
const FORBIDDEN_SQL =
  /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|comment|copy|call|do|vacuum|analyze|refresh|reindex|cluster|set\s+role|reset\s+role|pg_advisory(?:_[a-z_]+)?|nextval|setval|lo_import|lo_export)\b/i;
const VOLATILE_SQL =
  /\b(?:random|clock_timestamp|statement_timestamp|transaction_timestamp|timeofday|gen_random_uuid|uuid_generate_v[0-9])\s*\(/i;
const SENSITIVE_ARTIFACT =
  /postgres(?:ql)?:\/\/|\b(?:jwt|service_role|password|authorization|cookie|coordinates|exact_latitude|exact_longitude|object_key|private_notes|email|telefone)\b|(?:[a-z0-9-]+\.)+supabase\.co/i;

export class DiagnosticError extends Error {
  constructor(marker) {
    super(marker);
    this.marker = marker;
  }
}

const fail = (marker) => {
  throw new DiagnosticError(marker);
};

const sha256 = (value) =>
  createHash("sha256").update(String(value)).digest("hex");
const normalize = (value) => JSON.parse(JSON.stringify(value));

function removeSqlStringsAndComments(sql) {
  return String(sql)
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:''|[^'])*'/g, "''");
}

export function assertReadOnlySql(sql) {
  const executable = removeSqlStringsAndComments(sql);
  if (FORBIDDEN_SQL.test(executable) || VOLATILE_SQL.test(executable)) {
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SQL_REJECTED");
  }
  if (!/^\s*(?:with|select)\b/i.test(executable)) {
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SQL_REJECTED");
  }
  return sql;
}

export function readOnlyTransaction(sql) {
  assertReadOnlySql(sql);
  return `${READ_ONLY_PREFIX}\n${sql.trim().replace(/;\s*$/, ";")}\nrollback;`;
}

function safePsqlFailure(result) {
  const stderr = String(result?.stderr ?? "");
  return /permission denied|must be owner|not authorized/i.test(stderr)
    ? "COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_UNREADABLE"
    : "COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_QUERY_FAILED";
}

export function runReadOnlyQuery(sql, { databaseUrl, run = spawnSync } = {}) {
  assertReadOnlySql(sql);
  if (!databaseUrl)
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_DATABASE_URL_REQUIRED");
  const result = run(
    "psql",
    [
      databaseUrl,
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      "-c",
      readOnlyTransaction(sql),
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) fail(safePsqlFailure(result));
  return String(result.stdout ?? "").trim();
}

export function validateRemoteEnvironment(env = process.env) {
  const allowed = String(env.PR23_ALLOWED_PROJECT_REFS ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  const projectRef = String(env.SUPABASE_PROJECT_REF ?? "");
  const databaseUrl = String(env.PR23_DATABASE_URL ?? "");
  if (!projectRef || allowed.length !== 1 || allowed[0] !== projectRef) {
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_PROJECT_NOT_ALLOWLISTED");
  }
  if (
    !databaseUrl ||
    /(?:localhost|127\.0\.0\.1|vercel\.app|cloudflare|r2\.)/i.test(databaseUrl)
  ) {
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_DESTINATION_INVALID");
  }
  return { projectRef, databaseUrl };
}

export async function validateCanonicalRelease() {
  const manifestPath = selectReleaseManifest(
    "supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json",
  );
  const { release } = validateReleaseSql(manifestPath);
  const [migration, manifest] = await Promise.all([
    readFile(release.migration, "utf8"),
    readFile(manifestPath, "utf8"),
  ]);
  if (
    release.release !== RELEASE ||
    release.migrationSha256 !== MIGRATION_SHA256 ||
    sha256(migration) !== MIGRATION_SHA256 ||
    sha256(manifest) !== MANIFEST_SHA256
  ) {
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_CANONICAL_HASH_MISMATCH");
  }
  return { release, manifestPath };
}

function objectHash(value) {
  return sha256(JSON.stringify(normalize(value)));
}

export function summarizeScopedObjects(document) {
  const canonical = document?.canonical ?? {};
  const summary = [];
  for (const [kind, entries] of Object.entries(canonical)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const rawObjectName = entry.table
        ? entry.name
          ? `${entry.table}.${entry.name}`
          : entry.table
        : (entry.release ?? "catalog");
      const rawName = String(rawObjectName);
      const name =
        /(?:private_notes|exact_latitude|exact_longitude|object_key|email|telefone)/i.test(
          rawName,
        )
          ? `redacted-${sha256(rawName).slice(0, 12)}`
          : rawName;
      summary.push({ type: kind, name, hash: objectHash(entry) });
    }
  }
  return summary.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function indexSummary(items = []) {
  return new Map(items.map((item) => [`${item.type}:${item.name}`, item.hash]));
}

export function compareScopedObjects(remote, localPre = [], localPost = []) {
  const observed = indexSummary(remote);
  const pre = indexSummary(localPre);
  const post = indexSummary(localPost);
  const keys = new Set([...observed.keys(), ...pre.keys(), ...post.keys()]);
  return [...keys].sort().map((key) => {
    const [type, ...rest] = key.split(":");
    const name = rest.join(":");
    const observedHash = observed.get(key) ?? null;
    const preHash = pre.get(key) ?? null;
    const postHash = post.get(key) ?? null;
    let state = "unexpected";
    if (observedHash === null) state = "missing";
    else if (observedHash === preHash && observedHash === postHash)
      state = "equal";
    else if (observedHash === preHash) state = "pre";
    else if (observedHash === postHash) state = "post";
    else state = "changed";
    return {
      type,
      name,
      expectedPreHash: preHash,
      expectedPostHash: postHash,
      observedHash,
      state,
    };
  });
}

export function ledgerState(scopedDocument, release) {
  const ledger = scopedDocument?.canonical?.ledger;
  if (!Array.isArray(ledger)) return "UNREADABLE";
  if (ledger.length === 0) return "ABSENT";
  const value = ledger.find((item) => item.release === release.release);
  if (!value) return "ABSENT";
  return value.migrationSha256 === release.migrationSha256 &&
    value.migrationPath === release.migration &&
    value.status === "applied"
    ? "PRESENT_ACCEPTED"
    : "PRESENT_MISMATCH";
}

export function classifyRemoteDrift(evidence) {
  const unreadable =
    evidence.unreadable === true ||
    !evidence.globalObserved ||
    !evidence.scopedObserved ||
    evidence.ledger === "UNREADABLE";
  if (unreadable) return "INSUFFICIENT_READ_PERMISSION";
  const objectStates = new Set(
    (evidence.objects ?? []).map((item) => item.state),
  );
  const hasPartial =
    (objectStates.has("pre") && objectStates.has("post")) ||
    ((objectStates.has("pre") || objectStates.has("post")) &&
      (objectStates.has("missing") || objectStates.has("unexpected")));
  const scopedPre = evidence.scopedObserved === evidence.scopedPre;
  const scopedPost = evidence.scopedObserved === evidence.scopedPost;
  const globalPre = evidence.globalObserved === evidence.globalPre;
  const globalPost = evidence.globalObserved === evidence.globalPost;
  if (scopedPost && evidence.ledger !== "PRESENT_ACCEPTED")
    return "POST_WITH_LEDGER_MISMATCH";
  if (
    scopedPost &&
    evidence.ledger === "PRESENT_ACCEPTED" &&
    evidence.blockingFindings === 0
  ) {
    return "ALREADY_APPLIED_ACCEPTED";
  }
  if (
    hasPartial &&
    (evidence.ledger === "ABSENT" || evidence.ledger === "PRESENT_MISMATCH")
  ) {
    return "PARTIAL_RELEASE_STATE";
  }
  if (!scopedPre && !scopedPost && evidence.ledger === "ABSENT") {
    return "SIDEWALK_SCOPE_PRE_DRIFT";
  }
  if (!globalPre && scopedPre && evidence.ledger === "ABSENT" && !hasPartial) {
    return "GLOBAL_ONLY_DRIFT";
  }
  if ((globalPost || scopedPost) && evidence.ledger !== "PRESENT_ACCEPTED") {
    return "POST_WITH_LEDGER_MISMATCH";
  }
  return "INSUFFICIENT_READ_PERMISSION";
}

function sanitizeSecurityFinding(item) {
  const allowed = new Set([
    "RLS_ENABLED",
    "DANGEROUS_RELATION_GRANT",
    "PUBLIC_SCHEMA_CREATE",
    "DEFINER_SEARCH_PATH",
    "DEFINER_EXECUTE",
    "VIEW_SECURITY_INVOKER",
    "PRIVATE_BUCKET",
    "STORAGE_POLICY_EXPOSURE",
    "DANGEROUS_DEFAULT_PRIVILEGE",
  ]);
  return {
    rule: allowed.has(item.rule) ? item.rule : "UNKNOWN_SECURITY_RULE",
    object: /^((public|storage)\.)[a-z0-9_.()-]+$/i.test(item.object ?? "")
      ? item.object
      : "redacted-catalog-object",
    classification: /^[A-Z_]+$/.test(item.classification ?? "")
      ? item.classification
      : "UNKNOWN",
    description:
      "catalog security rule evaluated without publishing definitions",
  };
}

export function sanitizeArtifact(value) {
  const serialized = JSON.stringify(value);
  if (SENSITIVE_ARTIFACT.test(serialized))
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SENSITIVE_ARTIFACT");
  return value;
}

export async function scanArtifacts(paths) {
  for (const target of paths) sanitizeArtifact(await readFile(target, "utf8"));
  return {
    status: "sanitized",
    files: paths.map((target) => path.basename(target)),
    forbiddenCount: 0,
  };
}

function markdown(diagnostic) {
  return [
    "# Diagnóstico remoto somente leitura das Calçadas",
    "",
    `- Classificação: ${diagnostic.classification}`,
    `- Ledger: ${diagnostic.ledger}`,
    `- Escritas remotas: none`,
    `- Global observado: ${diagnostic.global.observed}`,
    `- Escopado remoto: ${diagnostic.scoped.remoteObserved}`,
    "",
    "## Objetos escopados",
    "",
    "| Tipo | Objeto | Estado | Hash observado |",
    "| --- | --- | --- | --- |",
    ...diagnostic.objects.map(
      (item) =>
        `| ${item.type} | ${item.name} | ${item.state} | ${item.observedHash ?? "absent"} |`,
    ),
    "",
    "## Segurança",
    "",
    diagnostic.findings.length
      ? diagnostic.findings
          .map((item) => `- ${item.rule}: ${item.object}`)
          .join("\n")
      : "- Nenhum finding bloqueante no catálogo capturado.",
    "",
    "COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_READ_ONLY_ENFORCED",
    "COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SANITIZED",
    "",
  ].join("\n");
}

export async function diagnose({
  env = process.env,
  run = spawnSync,
  reference,
}) {
  const { release } = await validateCanonicalRelease();
  const { projectRef, databaseUrl } = validateRemoteEnvironment(env);
  const execute = (sql) => runReadOnlyQuery(sql, { databaseUrl, run });
  let rawGlobal;
  let rawScoped;
  try {
    rawGlobal = JSON.parse(execute(globalFingerprintQuery));
    rawScoped = JSON.parse(execute(scopedFingerprintQuery));
  } catch (error) {
    if (
      error instanceof DiagnosticError &&
      error.marker === "COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_UNREADABLE"
    ) {
      return {
        projectRef: `${projectRef.slice(0, 4)}…`,
        unreadable: true,
        release: release.release,
        zeroRemoteWrites: true,
        classification: "INSUFFICIENT_READ_PERMISSION",
        global: {
          expectedPre: release.expectedPreFingerprint,
          expectedPost: release.expectedPostFingerprint,
          observed: null,
        },
        scoped: {
          localPre: reference.scopedPre,
          localPost: reference.scopedPost,
          remoteObserved: null,
          algorithm: reference.algorithm,
          objects: scopedObjects,
        },
        ledger: "UNREADABLE",
        migrations: [],
        objects: [],
        findings: [],
      };
    }
    throw error;
  }
  const global = buildDocuments(rawGlobal).compact;
  const scoped = buildScopedDocument(rawScoped);
  const remoteObjects = summarizeScopedObjects(scoped);
  const objects = compareScopedObjects(
    remoteObjects,
    reference.objectsPre,
    reference.objectsPost,
  );
  const ledger = ledgerState(scoped, release);
  const evidence = {
    globalPre: release.expectedPreFingerprint,
    globalPost: release.expectedPostFingerprint,
    globalObserved: global.fingerprint,
    scopedPre: reference.scopedPre,
    scopedPost: reference.scopedPost,
    scopedObserved: fingerprintScoped(scoped),
    ledger,
    objects,
    blockingFindings: global.security.blockingFindings.length,
  };
  return {
    projectRef: `${projectRef.slice(0, 4)}…`,
    environment: "production",
    release: release.release,
    zeroRemoteWrites: true,
    classification: classifyRemoteDrift(evidence),
    global: {
      expectedPre: evidence.globalPre,
      expectedPost: evidence.globalPost,
      observed: evidence.globalObserved,
    },
    scoped: {
      localPre: evidence.scopedPre,
      localPost: evidence.scopedPost,
      remoteObserved: evidence.scopedObserved,
      algorithm: "sha256-json-stable-v1",
      objects: scopedObjects,
    },
    ledger,
    migrations: (global.canonical.migrations ?? []).map(String),
    objects,
    findings: global.security.blockingFindings.map(sanitizeSecurityFinding),
  };
}

async function main() {
  const referencePath = process.argv
    .find((arg) => arg.startsWith("--reference="))
    ?.slice(12);
  const outputDir =
    process.argv.find((arg) => arg.startsWith("--output-dir="))?.slice(13) ??
    ".ci-artifacts/comun-sidewalk-remote-diagnostic";
  if (!referencePath)
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_REFERENCE_REQUIRED");
  const reference = JSON.parse(await readFile(referencePath, "utf8"));
  const diagnostic = sanitizeArtifact(await diagnose({ reference }));
  if (!CLASSIFICATIONS.includes(diagnostic.classification))
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_CLASSIFICATION_INVALID");
  await mkdir(outputDir, { recursive: true });
  const classification = {
    classification: diagnostic.classification,
    release: diagnostic.release,
    zeroRemoteWrites: true,
  };
  const targets = {
    diagnostic: path.join(outputDir, "diagnostic.json"),
    markdown: path.join(outputDir, "diagnostic.md"),
    classification: path.join(outputDir, "classification.json"),
  };
  await writeFile(
    targets.diagnostic,
    `${JSON.stringify(diagnostic, null, 2)}\n`,
  );
  await writeFile(targets.markdown, markdown(diagnostic));
  await writeFile(
    targets.classification,
    `${JSON.stringify(classification, null, 2)}\n`,
  );
  const report = await scanArtifacts(Object.values(targets));
  await writeFile(
    path.join(outputDir, "sanitization-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_READ_ONLY_ENFORCED");
  console.log("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SANITIZED");
  console.log(
    `COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_CLASSIFICATION ${diagnostic.classification}`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
