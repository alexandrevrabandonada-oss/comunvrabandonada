import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDocuments,
  query as globalQuery,
} from "../db/verify-canonical-baseline.mjs";
import { persistLocalReference } from "./capture-sidewalk-local-reference.mjs";
import {
  buildDocument,
  buildStructuralDocument,
  fingerprint,
  query as scopedQuery,
  scopedObjects,
  structuralFingerprintScope,
} from "./sidewalk-operational-fingerprint.mjs";
import {
  auditGrantMatrixQuery,
  normalizeAuditGrantMatrix,
  summarizeScopedObjects,
} from "./diagnose-sidewalk-remote-drift.mjs";
import {
  saferPreFixtureId,
  saferPreFixtureSql,
  saferPreLegacyTables,
  saferPrePublicPrivileges,
  saferPrePublicRoles,
} from "./sidewalk-safer-pre-v2-fixture.mjs";

const output =
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
  ".ci-artifacts/sidewalk-safer-pre-v2-reference.json";
const migrationPath =
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";

export function assertLocalOnly(env = process.env) {
  if (env.SUPABASE_PROJECT_REF !== "LOCAL_VALIDATION") {
    throw new Error("COMUN_SAFER_PRE_V2_REFERENCE_LOCAL_ONLY");
  }
  if (
    !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):\d{1,5}\/postgres(?:[/?]|$)/.test(
      env.PR23_DATABASE_URL ?? "",
    )
  ) {
    throw new Error("COMUN_SAFER_PRE_V2_REFERENCE_LOCAL_DATABASE_REQUIRED");
  }
}

function psql(sql, { run = spawnSync } = {}) {
  const result = run(
    "psql",
    [
      process.env.PR23_DATABASE_URL,
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error("COMUN_SAFER_PRE_V2_REFERENCE_PSQL_FAILED");
  }
  return String(result.stdout ?? "").trim();
}

function readJson(sql) {
  return JSON.parse(psql(sql));
}

export function captureReference() {
  const global = buildDocuments(readJson(globalQuery)).compact;
  const scoped = buildDocument(readJson(scopedQuery));
  const structural = buildStructuralDocument(scoped.canonical);
  return {
    global: global.fingerprint,
    scoped: fingerprint(structural),
    objects: summarizeScopedObjects(scoped),
    auditGrants: normalizeAuditGrantMatrix(readJson(auditGrantMatrixQuery)),
  };
}

export function buildDerivedReference(pre, post) {
  return {
    algorithm: "sha256-json-stable-v2-ledger-excluded",
    scope: structuralFingerprintScope,
    objects: scopedObjects,
    fixture: {
      id: saferPreFixtureId,
      tables: saferPreLegacyTables,
      roles: saferPrePublicRoles,
      privileges: saferPrePublicPrivileges,
    },
    globalPre: pre.global,
    globalPost: post.global,
    scopedPre: pre.scoped,
    scopedPost: post.scoped,
    objectsPre: pre.objects,
    objectsPost: post.objects,
    auditGrantsPre: pre.auditGrants,
    auditGrantsPost: post.auditGrants,
    rawMigrationReapplied: true,
  };
}

export async function deriveSaferPreV2Reference() {
  assertLocalOnly();
  psql(saferPreFixtureSql);
  const pre = captureReference();
  const migration = await readFile(migrationPath, "utf8");
  psql(migration);
  const post = captureReference();
  psql(migration);
  return buildDerivedReference(pre, post);
}

async function main() {
  const reference = await deriveSaferPreV2Reference();
  await persistLocalReference(output, reference);
  console.log("COMUN_SIDEWALK_SAFER_PRE_V2_MIGRATION_REAPPLIED");
  console.log("COMUN_SIDEWALK_SAFER_PRE_V2_REFERENCE_READY");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
