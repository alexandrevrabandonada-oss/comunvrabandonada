import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDocuments,
  query as globalQuery,
} from "../db/verify-canonical-baseline.mjs";
import {
  buildDocument,
  fingerprint,
  query as scopedQuery,
  scopedObjects,
} from "./sidewalk-operational-fingerprint.mjs";
import {
  auditGrantMatrixQuery,
  normalizeAuditGrantMatrix,
  summarizeScopedObjects,
} from "./diagnose-sidewalk-remote-drift.mjs";

const output =
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
  ".ci-artifacts/local-sidewalk-reference.json";
function readJson(sql) {
  const databaseUrl = process.env.PR23_DATABASE_URL;
  if (!databaseUrl || !/(?:localhost|127\.0\.0\.1)/i.test(databaseUrl)) {
    throw new Error("COMUN_LOCAL_REFERENCE_REQUIRES_LOCAL_DATABASE");
  }
  const result = spawnSync(
    "psql",
    [
      databaseUrl,
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
  if (result.status !== 0)
    throw new Error("COMUN_LOCAL_REFERENCE_QUERY_FAILED");
  return JSON.parse(result.stdout.trim());
}

function capture() {
  const global = buildDocuments(readJson(globalQuery)).compact.fingerprint;
  const scoped = buildDocument(readJson(scopedQuery));
  return {
    global,
    scoped: fingerprint(scoped),
    objects: summarizeScopedObjects(scoped),
    auditGrants: normalizeAuditGrantMatrix(readJson(auditGrantMatrixQuery)),
  };
}

export async function persistLocalReference(output, reference) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(reference, null, 2)}\n`, "utf8");
}

async function main() {
  const pre = capture();
  const first = spawnSync("node", ["scripts/solo/apply-forward-only.mjs"], {
    encoding: "utf8",
    env: process.env,
  });
  if (
    first.status !== 0 ||
    !first.stdout.includes("COMUN_SIDEWALK_OPERATIONAL_HARDENING_OK")
  )
    throw new Error("COMUN_LOCAL_REFERENCE_FIRST_APPLY_FAILED");
  const post = capture();
  const second = spawnSync("node", ["scripts/solo/apply-forward-only.mjs"], {
    encoding: "utf8",
    env: process.env,
  });
  if (
    second.status !== 0 ||
    !second.stdout.includes(
      "COMUN_SIDEWALK_OPERATIONAL_HARDENING_ALREADY_APPLIED",
    )
  )
    throw new Error("COMUN_LOCAL_REFERENCE_REAPPLY_FAILED");
  const reference = {
    algorithm: "sha256-json-stable-v1",
    scope: "sidewalk-operational-v1",
    objects: scopedObjects,
    globalPre: pre.global,
    globalPost: post.global,
    scopedPre: pre.scoped,
    scopedPost: post.scoped,
    objectsPre: pre.objects,
    objectsPost: post.objects,
    auditGrantsPre: pre.auditGrants,
    auditGrantsPost: post.auditGrants,
    alreadyApplied: true,
  };
  await persistLocalReference(output, reference);
  console.log("COMUN_SIDEWALK_LOCAL_REFERENCE_READY");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
