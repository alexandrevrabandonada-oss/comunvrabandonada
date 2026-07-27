import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executeSql, queryJson, queryScalar } from "./apply-forward-only.mjs";
import {
  auditGrantMatrixQuery,
  normalizeAuditGrantMatrix,
} from "./diagnose-sidewalk-remote-drift.mjs";
import {
  buildStructuralDocument,
  fingerprint,
  query as scopedFingerprintQuery,
} from "./sidewalk-operational-fingerprint.mjs";
import { saferPreFixtureSql } from "./sidewalk-safer-pre-v2-fixture.mjs";
import {
  assertExactContractMatrix,
  selectScopedPromotionContract,
} from "./sidewalk-scoped-promotion-contract.mjs";

export { saferPreFixtureSql } from "./sidewalk-safer-pre-v2-fixture.mjs";

const releaseManifest =
  "supabase/releases/20260724233256-comun-sidewalk-operational-hardening-safer-pre-v2.json";
const migrationPath =
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";
const ledgerAbsent = "__COMUN_RELEASE_LEDGER_ABSENT__";

function localOnly() {
  if (process.env.SUPABASE_PROJECT_REF !== "LOCAL_VALIDATION") {
    throw new Error("COMUN_SAFER_PRE_REHEARSAL_LOCAL_ONLY");
  }
}

function capture() {
  const document = buildStructuralDocument(queryJson(scopedFingerprintQuery));
  return {
    scopedFingerprint: fingerprint(document),
    auditGrants: normalizeAuditGrantMatrix(queryJson(auditGrantMatrixQuery)),
  };
}

function ledgerState() {
  return queryScalar(`select coalesce((
    select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint
    from public.comun_schema_releases
    where release = '20260724233256-comun-sidewalk-operational-hardening'
  ), '${ledgerAbsent}');`);
}

function runApply() {
  return spawnSync("node", ["scripts/solo/apply-forward-only.mjs"], {
    encoding: "utf8",
    env: { ...process.env, COMUN_RELEASE_MANIFEST: releaseManifest },
  });
}

export function assertSaferPreMatrix(matrix) {
  const publicGrants = matrix.filter((grant) =>
    ["anon", "authenticated"].includes(grant.role),
  );
  if (publicGrants.length !== 0) {
    throw new Error("COMUN_SAFER_PRE_GRANT_MATRIX_MISMATCH");
  }
  const serviceRole = new Set(
    matrix
      .filter((grant) => grant.role === "service_role")
      .map((grant) => grant.privilege),
  );
  for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    if (!serviceRole.has(privilege)) {
      throw new Error("COMUN_SAFER_PRE_SERVICE_ROLE_CRUD_MISSING");
    }
  }
}

export async function deriveSaferPreReference() {
  localOnly();
  executeSql(saferPreFixtureSql);
  const pre = capture();
  assertSaferPreMatrix(pre.auditGrants);
  if (ledgerState() !== ledgerAbsent) {
    throw new Error("COMUN_SAFER_PRE_LEDGER_NOT_ABSENT");
  }
  const migration = await readFile(migrationPath, "utf8");
  executeSql(migration);
  const post = capture();
  executeSql(migration);
  return { pre, post, rawMigrationReapplied: true };
}

export function verifySaferPreContract() {
  localOnly();
  const { contract } = selectScopedPromotionContract();
  executeSql(saferPreFixtureSql);
  const pre = capture();
  assertSaferPreMatrix(pre.auditGrants);
  if (pre.scopedFingerprint !== contract.expectedScopedPreFingerprint) {
    throw new Error("COMUN_SAFER_PRE_SCOPED_FINGERPRINT_MISMATCH");
  }
  assertExactContractMatrix(contract, "pre", pre.auditGrants);
  if (ledgerState() !== ledgerAbsent) {
    throw new Error("COMUN_SAFER_PRE_LEDGER_NOT_ABSENT");
  }
  const first = runApply();
  if (
    first.status !== 0 ||
    !first.stdout.includes("COMUN_SIDEWALK_OPERATIONAL_HARDENING_OK")
  ) {
    throw new Error("COMUN_SAFER_PRE_FIRST_APPLICATION_FAILED");
  }
  const post = capture();
  if (post.scopedFingerprint !== contract.expectedScopedPostFingerprint) {
    throw new Error("COMUN_SAFER_POST_SCOPED_FINGERPRINT_MISMATCH");
  }
  assertExactContractMatrix(contract, "post", post.auditGrants);
  const second = runApply();
  if (
    second.status !== 0 ||
    !second.stdout.includes(
      "COMUN_SIDEWALK_OPERATIONAL_HARDENING_ALREADY_APPLIED",
    )
  ) {
    throw new Error("COMUN_SAFER_PRE_REAPPLICATION_FAILED");
  }
  return { pre, post, alreadyApplied: true };
}

async function main(argv = process.argv.slice(2)) {
  const result = argv.includes("--derive")
    ? await deriveSaferPreReference()
    : verifySaferPreContract();
  console.log(
    JSON.stringify(
      {
        scopedPre: result.pre.scopedFingerprint,
        scopedPost: result.post.scopedFingerprint,
        alreadyApplied: result.alreadyApplied ?? result.rawMigrationReapplied,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
