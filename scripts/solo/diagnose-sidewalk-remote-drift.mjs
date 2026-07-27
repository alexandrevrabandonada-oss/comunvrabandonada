import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildDocuments,
  query as globalFingerprintQuery,
} from "../db/verify-canonical-baseline.mjs";
import {
  buildDocument as buildScopedDocument,
  buildStructuralDocument,
  fingerprint as fingerprintScoped,
  fingerprintScope,
  query as scopedFingerprintQuery,
  scopedObjects,
  structuralFingerprintScope,
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

export const GRANT_CLASSIFICATIONS = Object.freeze([
  "REMOTE_EQUIVALENT_TO_PRE",
  "REMOTE_EQUIVALENT_TO_POST",
  "REMOTE_MORE_RESTRICTIVE_THAN_PRE",
  "REMOTE_MORE_PERMISSIVE_THAN_PRE",
  "SERVICE_ROLE_GRANT_DRIFT",
  "OTHER_GRANT_DRIFT",
  "INSUFFICIENT_READ_PERMISSION",
]);

export const AUDIT_GRANT_ROLES = Object.freeze([
  "anon",
  "authenticated",
  "service_role",
  "postgres",
  "supabase_admin",
  "authenticator",
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
  /postgres(?:ql)?:\/\/|\b(?:jwt|password|authorization|cookie|coordinates|exact_latitude|exact_longitude|object_key|private_notes|email|telefone)\b|service_role\s*(?:key|token|=|:)|(?:[a-z0-9-]+\.)+supabase\.co/i;

export const auditGrantMatrixQuery = String.raw`
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'schema', table_schema,
      'table', table_name,
      'grantee', grantee,
      'privilege', privilege_type,
      'isGrantable', is_grantable
    ) order by table_schema, table_name, grantee, privilege_type, is_grantable
  ),
  '[]'::jsonb
)::text
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'comun_admin_audit_log';`;

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

const auditGrantTarget = Object.freeze({
  schema: "public",
  table: "comun_admin_audit_log",
});
const publicGrantRoles = new Set(["anon", "authenticated"]);
const requiredServiceRoleCrud = new Set([
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
]);

export function sanitizeGrantRole(role) {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase();
  return AUDIT_GRANT_ROLES.includes(normalized) ||
    /^other-role-[a-f0-9]{12}$/.test(normalized)
    ? normalized
    : `other-role-${sha256(normalized).slice(0, 12)}`;
}

function normalizeIsGrantable(value) {
  return value === true || /^(?:yes|true)$/i.test(String(value ?? ""));
}

function sortGrantMatrix(entries) {
  return [...entries].sort((left, right) =>
    [left.role, left.privilege, String(left.isGrantable)]
      .join("\u0000")
      .localeCompare(
        [right.role, right.privilege, String(right.isGrantable)].join("\u0000"),
      ),
  );
}

export function normalizeAuditGrantMatrix(entries) {
  if (!Array.isArray(entries)) return null;
  return sortGrantMatrix(
    entries.map((entry) => ({
      ...auditGrantTarget,
      role: sanitizeGrantRole(entry.role ?? entry.grantee),
      privilege: String(entry.privilege ?? entry.privilege_type ?? "")
        .trim()
        .toUpperCase(),
      isGrantable: normalizeIsGrantable(
        entry.isGrantable ?? entry.is_grantable,
      ),
    })),
  );
}

function grantKey(grant) {
  return [grant.role, grant.privilege, String(grant.isGrantable)].join(
    "\u0000",
  );
}

function grantCapabilityKey(grant) {
  return [grant.role, grant.privilege].join("\u0000");
}

function grantMap(matrix) {
  return new Map(matrix.map((grant) => [grantKey(grant), grant]));
}

function capabilityMap(matrix) {
  return new Map(matrix.map((grant) => [grantCapabilityKey(grant), grant]));
}

export function diffAuditGrantMatrices(reference, remote) {
  if (!Array.isArray(reference) || !Array.isArray(remote)) return null;
  const expected = grantMap(reference);
  const observed = grantMap(remote);
  return {
    missingInRemote: sortGrantMatrix(
      [...expected.entries()]
        .filter(([key]) => !observed.has(key))
        .map(([, grant]) => grant),
    ),
    extraInRemote: sortGrantMatrix(
      [...observed.entries()]
        .filter(([key]) => !expected.has(key))
        .map(([, grant]) => grant),
    ),
    equal: sortGrantMatrix(
      [...observed.entries()]
        .filter(([key]) => expected.has(key))
        .map(([, grant]) => grant),
    ),
  };
}

function isMatrixEqual(delta) {
  return delta.missingInRemote.length === 0 && delta.extraInRemote.length === 0;
}

function isBroaderThanPre(remote, preCapabilities) {
  const pre = preCapabilities.get(grantCapabilityKey(remote));
  return !pre || (remote.isGrantable && !pre.isGrantable);
}

function isRestrictedFromPre(pre, remoteCapabilities) {
  const remote = remoteCapabilities.get(grantCapabilityKey(pre));
  return !remote || (pre.isGrantable && !remote.isGrantable);
}

function isReductionReplacement(remote, preCapabilities) {
  const pre = preCapabilities.get(grantCapabilityKey(remote));
  return pre?.isGrantable === true && remote.isGrantable === false;
}

function hasRequiredServiceRoleCrud(remote) {
  const privileges = new Set(
    remote
      .filter((grant) => grant.role === "service_role")
      .map((grant) => grant.privilege),
  );
  return [...requiredServiceRoleCrud].every((privilege) =>
    privileges.has(privilege),
  );
}

export function classifyAuditGrantDrift({
  pre,
  post,
  remote,
  unreadable = false,
} = {}) {
  if (
    unreadable ||
    !Array.isArray(pre) ||
    !Array.isArray(post) ||
    !Array.isArray(remote)
  ) {
    return { classification: "INSUFFICIENT_READ_PERMISSION", risk: "unknown" };
  }
  const remoteVsPre = diffAuditGrantMatrices(pre, remote);
  const remoteVsPost = diffAuditGrantMatrices(post, remote);
  if (isMatrixEqual(remoteVsPre)) {
    return {
      classification: "REMOTE_EQUIVALENT_TO_PRE",
      risk: "equivalent_pre",
    };
  }
  if (isMatrixEqual(remoteVsPost)) {
    return {
      classification: "REMOTE_EQUIVALENT_TO_POST",
      risk: "equivalent_post",
    };
  }
  const preCapabilities = capabilityMap(pre);
  const remoteCapabilities = capabilityMap(remote);
  const changed = [
    ...remoteVsPre.missingInRemote,
    ...remoteVsPre.extraInRemote,
  ];
  const publicCapabilityAdded = remote.some(
    (grant) =>
      publicGrantRoles.has(grant.role) &&
      isBroaderThanPre(grant, preCapabilities),
  );
  if (publicCapabilityAdded) {
    return {
      classification: "REMOTE_MORE_PERMISSIVE_THAN_PRE",
      risk: "more_exposed",
    };
  }
  if (
    changed.length > 0 &&
    changed.every((grant) => grant.role === "service_role")
  ) {
    return {
      classification: "SERVICE_ROLE_GRANT_DRIFT",
      risk: hasRequiredServiceRoleCrud(remote)
        ? "unknown"
        : "service_role_incompatible",
    };
  }
  const prePrivilegeRemoved = pre.some((grant) =>
    isRestrictedFromPre(grant, remoteCapabilities),
  );
  const onlyReductions = remoteVsPre.extraInRemote.every((grant) =>
    isReductionReplacement(grant, preCapabilities),
  );
  if (prePrivilegeRemoved && onlyReductions) {
    return {
      classification: "REMOTE_MORE_RESTRICTIVE_THAN_PRE",
      risk: "safer_than_pre",
    };
  }
  return { classification: "OTHER_GRANT_DRIFT", risk: "unknown" };
}

export function assessAuditGrantDrift({
  pre,
  post,
  remote,
  unreadable = false,
} = {}) {
  const normalizedPre = normalizeAuditGrantMatrix(pre);
  const normalizedPost = normalizeAuditGrantMatrix(post);
  const normalizedRemote = normalizeAuditGrantMatrix(remote);
  const assessment = classifyAuditGrantDrift({
    pre: normalizedPre,
    post: normalizedPost,
    remote: normalizedRemote,
    unreadable,
  });
  return {
    ...auditGrantTarget,
    pre: normalizedPre ?? [],
    post: normalizedPost ?? [],
    remote: normalizedRemote ?? [],
    remoteVsPre: diffAuditGrantMatrices(normalizedPre, normalizedRemote),
    remoteVsPost: diffAuditGrantMatrices(normalizedPost, normalizedRemote),
    unreadable:
      unreadable || !normalizedPre || !normalizedPost || !normalizedRemote,
    ...assessment,
  };
}

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
      const rawObjectName =
        kind === "grants" && entry.table
          ? `${entry.table}.${sanitizeGrantRole(entry.grantee)}.${String(
              entry.privilege ?? "",
            ).toUpperCase()}`
          : entry.table
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
    const hasObserved = observed.has(key);
    const hasPre = pre.has(key);
    const hasPost = post.has(key);
    const observedHash = observed.get(key) ?? null;
    const preHash = pre.get(key) ?? null;
    const postHash = post.get(key) ?? null;
    let state = "unexpected";
    if (!hasObserved && !hasPre && hasPost) state = "pre";
    else if (!hasObserved && hasPre && !hasPost) state = "post";
    else if (!hasObserved) state = "missing";
    else if (!hasPre && !hasPost) state = "unexpected";
    else if (
      hasPre &&
      hasPost &&
      observedHash === preHash &&
      observedHash === postHash
    )
      state = "equal";
    else if (hasPre && observedHash === preHash) state = "pre";
    else if (hasPost && observedHash === postHash) state = "post";
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

export function buildFingerprintDocument(raw, scope = fingerprintScope) {
  if (scope === fingerprintScope) return buildScopedDocument(raw);
  if (scope === structuralFingerprintScope) return buildStructuralDocument(raw);
  fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SCOPE_INVALID");
}

export function validateReference(reference) {
  if (
    !reference ||
    ![fingerprintScope, structuralFingerprintScope].includes(reference.scope) ||
    !/^[a-f0-9]{64}$/.test(reference.scopedPre ?? "") ||
    !/^[a-f0-9]{64}$/.test(reference.scopedPost ?? "") ||
    !Array.isArray(reference.objectsPre) ||
    !Array.isArray(reference.objectsPost) ||
    !Array.isArray(reference.auditGrantsPre) ||
    !Array.isArray(reference.auditGrantsPost)
  ) {
    fail("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_REFERENCE_INVALID");
  }
  return reference;
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
  const hasPartial = objectStates.has("pre") && objectStates.has("post");
  const hasRealPreDrift =
    objectStates.has("changed") ||
    objectStates.has("unexpected") ||
    objectStates.has("missing");
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
  if (
    evidence.ledger === "ABSENT" &&
    !objectStates.has("post") &&
    !scopedPre &&
    !scopedPost &&
    hasRealPreDrift
  ) {
    return "SIDEWALK_SCOPE_PRE_DRIFT";
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

function auditGrantOperationsFromMigration(source) {
  return String(source)
    .split(";")
    .flatMap((statement) => {
      if (!/\bcomun_admin_audit_log\b/i.test(statement)) return [];
      const operation = statement.match(
        /\b(grant|revoke)\s+(.+?)\s+on\s+table\b/is,
      );
      const roleMatch = statement.match(/\b(?:to|from)\s+([^;]+)$/is);
      if (!operation || !roleMatch) return [];
      const privileges = operation[2]
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
        .sort();
      const roles = roleMatch[1]
        .split(",")
        .map((value) => sanitizeGrantRole(value))
        .sort();
      return [
        {
          operation: operation[1].toLowerCase(),
          roles,
          privileges,
        },
      ];
    });
}

export async function auditGrantProvenance(remoteMigrations = []) {
  const remote = new Set(remoteMigrations.map(String));
  const directory = "supabase/migrations";
  const files = (await readdir(directory)).sort();
  const timeline = [];
  for (const file of files) {
    if (!file.endsWith(".sql")) continue;
    const source = await readFile(path.join(directory, file), "utf8");
    if (!/\bcomun_admin_audit_log\b/i.test(source)) continue;
    const migration = file.split("_")[0];
    const operations = auditGrantOperationsFromMigration(source);
    const presentInRemoteHistory = remote.has(migration);
    timeline.push({
      migration,
      operations,
      presentInRemoteHistory,
      causality:
        operations.length > 0 && presentInRemoteHistory
          ? "likely"
          : presentInRemoteHistory
            ? "unknown"
            : "unrelated",
    });
  }
  return timeline;
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

function grantRows(grants) {
  return grants.length
    ? grants.map(
        (grant) =>
          `| ${grant.role} | ${grant.privilege} | ${grant.isGrantable ? "yes" : "no"} |`,
      )
    : ["| none | — | — |"];
}

function grantMatrixMarkdown(title, grants) {
  return [
    `### ${title}`,
    "",
    "| Role | Privilege | Is grantable |",
    "| --- | --- | --- |",
    ...grantRows(grants),
    "",
  ];
}

function grantDeltaMarkdown(title, delta) {
  if (!delta) return [`### ${title}`, "", "- Matrix unreadable.", ""];
  return [
    `### ${title}`,
    "",
    ...grantMatrixMarkdown("Absent in remote", delta.missingInRemote),
    ...grantMatrixMarkdown("Extra in remote", delta.extraInRemote),
    ...grantMatrixMarkdown("Equal", delta.equal),
  ];
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
    "## Grant matrix: public.comun_admin_audit_log",
    "",
    `- Classification: ${diagnostic.grantAudit.classification}`,
    `- Risk: ${diagnostic.grantAudit.risk}`,
    ...grantMatrixMarkdown("Local PRE", diagnostic.grantAudit.pre),
    ...grantMatrixMarkdown("Local POST", diagnostic.grantAudit.post),
    ...grantMatrixMarkdown("Remote", diagnostic.grantAudit.remote),
    ...grantDeltaMarkdown("Remote vs PRE", diagnostic.grantAudit.remoteVsPre),
    ...grantDeltaMarkdown("Remote vs POST", diagnostic.grantAudit.remoteVsPost),
    "## Provenance",
    "",
    ...diagnostic.provenance.map(
      (item) =>
        `- ${item.migration}: ${item.operations.length ? item.operations.map((operation) => `${operation.operation} ${operation.privileges.join(", ")} for ${operation.roles.join(", ")}`).join("; ") : "no grant operation"}; remote history: ${item.presentInRemoteHistory ? "present" : "absent"}; causality: ${item.causality}`,
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
  validateReference(reference);
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
          scope: reference.scope,
          objects: scopedObjects,
        },
        ledger: "UNREADABLE",
        migrations: [],
        objects: [],
        findings: [],
        grantAudit: assessAuditGrantDrift({
          pre: reference.auditGrantsPre,
          post: reference.auditGrantsPost,
          remote: null,
          unreadable: true,
        }),
        provenance: await auditGrantProvenance([]),
      };
    }
    throw error;
  }
  const global = buildDocuments(rawGlobal).compact;
  const rawScopedDocument = buildScopedDocument(rawScoped);
  const scoped = buildFingerprintDocument(rawScoped, reference.scope);
  const remoteObjects = summarizeScopedObjects(rawScopedDocument);
  const objects = compareScopedObjects(
    remoteObjects,
    reference.objectsPre,
    reference.objectsPost,
  );
  const ledger = ledgerState(rawScopedDocument, release);
  let rawAuditGrants = null;
  let auditGrantUnreadable = false;
  try {
    rawAuditGrants = JSON.parse(execute(auditGrantMatrixQuery));
  } catch (error) {
    if (
      error instanceof DiagnosticError &&
      error.marker === "COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_UNREADABLE"
    ) {
      auditGrantUnreadable = true;
    } else {
      throw error;
    }
  }
  const grantAudit = assessAuditGrantDrift({
    pre: reference.auditGrantsPre,
    post: reference.auditGrantsPost,
    remote: rawAuditGrants,
    unreadable: auditGrantUnreadable,
  });
  const migrations = (global.canonical.migrations ?? []).map(String);
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
      algorithm: reference.algorithm,
      scope: reference.scope,
      objects: scopedObjects,
    },
    ledger,
    migrations,
    objects,
    findings: global.security.blockingFindings.map(sanitizeSecurityFinding),
    grantAudit,
    provenance: await auditGrantProvenance(migrations),
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
    grantClassification: diagnostic.grantAudit.classification,
    grantRisk: diagnostic.grantAudit.risk,
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
