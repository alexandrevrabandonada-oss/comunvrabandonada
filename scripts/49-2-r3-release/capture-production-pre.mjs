import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { schemaFingerprintQuery } from "../solo/apply-forward-only.mjs";
import {
  buildDocuments,
  query as canonicalQuery,
} from "../db/verify-canonical-baseline.mjs";

const R1 = "20260901000000";
const R2 = "20260924015511";
const R3 = "20260924225210";
const R12_MANIFEST =
  "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json";
const HARDENING_MANIFEST =
  "supabase/releases/20260922120000-canonical-security-hardening-v2.json";
const output = process.argv
  .find((arg) => arg.startsWith("--output="))
  ?.slice(9);
const expectedSha = process.env.COMUN_R3_EXPECTED_MAIN_SHA;
if (!output || !/^[a-f0-9]{40}$/.test(expectedSha ?? ""))
  throw new Error("COMUN_R3_CAPTURE_CONTEXT_INVALID");
if (!process.env.SUPABASE_DB_URL)
  throw new Error("COMUN_R3_PRODUCTION_DB_URL_MISSING");
if (
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
    expectedSha ||
  process.env.GITHUB_BASE_REF !== "main" ||
  process.env.GITHUB_HEAD_REF !==
    "codex/comun-49-2-r3-private-candidate-release"
)
  throw new Error("COMUN_R3_CAPTURE_MAIN_SHA_MISMATCH");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const r12 = JSON.parse(readFileSync(R12_MANIFEST, "utf8"));
const hardening = JSON.parse(readFileSync(HARDENING_MANIFEST, "utf8"));
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const mode = (
    await db.query("select current_setting('transaction_read_only') as value")
  ).rows[0]?.value;
  if (mode !== "on") throw new Error("COMUN_R3_CAPTURE_NOT_READ_ONLY");
  const version = (await db.query("show server_version")).rows[0]
    ?.server_version;
  const runnerRows = await db.query(schemaFingerprintQuery);
  const normalized = runnerRows.rows
    .map((row) => Object.values(row)[0])
    .join("\n")
    .replace(/\r\n/g, "\n")
    .trimEnd();
  if (!normalized) throw new Error("COMUN_R3_RUNNER_FINGERPRINT_EMPTY");
  const canonicalRows = await db.query(canonicalQuery);
  const canonical = buildDocuments(
    JSON.parse(Object.values(canonicalRows.rows[0] ?? {})[0]),
  ).compact;
  const migrations = canonical.canonical.migrations;
  const objects = (
    await db.query(`
    select
      to_regclass('private.comun_relata_collective_entity_candidates') is not null as candidate_table,
      to_regprocedure('public.comun_relata_collective_entity_server_candidate_prepare(uuid,uuid,uuid)') is not null as candidate_bridge,
      (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname in (
         'comun_relata_collective_entity_server_create',
         'comun_relata_collective_entity_server_consent_set',
         'comun_relata_collective_entity_server_representation_revoke',
         'comun_relata_collective_entity_server_list_own')) as r2_bridge_count,
      (select count(*)::int from pg_trigger t
       where t.tgname in (
         'comun_relata_candidate_immutable',
         'comun_relata_candidate_consent_invalidate',
         'comun_relata_candidate_representation_invalidate',
         'comun_relata_candidate_entity_invalidate') and not t.tgisinternal) as r3_trigger_count,
      (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname like 'comun_relata_collective_entity%') as public_collective_relation_count
  `)
  ).rows[0];
  const ledgerRows = (
    await db.query(
      `
    select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status
    from public.comun_schema_releases where release = any($1::text[])
  `,
      [
        [
          r12.release,
          hardening.release,
          "20260924-comun-49-2-r3-private-candidate",
        ],
      ],
    )
  ).rows;
  function ledgerState(release, expected) {
    const rows = ledgerRows.filter((row) => row.release === release);
    if (rows.length === 0) return "ABSENT";
    if (rows.length !== 1) return "PRESENT_MISMATCH";
    const row = rows[0];
    return row.migration_path === expected.path &&
      row.migration_sha256 === expected.migrationSha256 &&
      row.pre_fingerprint === expected.preFingerprint &&
      row.post_fingerprint === expected.postFingerprint &&
      row.status === "applied"
      ? "PRESENT_ACCEPTED"
      : "PRESENT_MISMATCH";
  }
  const r12Ledger = ledgerState(r12.release, {
    path: r12.releaseLedger.migrationPath,
    migrationSha256: r12.migrationSetSha256,
    preFingerprint: r12.expectedPreFingerprint,
    postFingerprint: r12.expectedPostFingerprint,
  });
  const hardeningLedger = ledgerState(hardening.release, {
    path: hardening.migration,
    migrationSha256: hardening.migrationSha256,
    preFingerprint: hardening.expectedPreFingerprint,
    postFingerprint: hardening.expectedPostFingerprint,
  });
  const r3LedgerRows = ledgerRows.filter(
    (row) => row.release === "20260924-comun-49-2-r3-private-candidate",
  );
  const document = {
    scope: "COMUN_49_2_R3_PRODUCTION_PRE_READ_ONLY",
    sourceMainSha: expectedSha,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    transactionReadOnly: mode,
    postgresVersion: String(version).match(/^\d+\.\d+/)?.[0],
    runnerFingerprint: sha256(normalized),
    canonicalFingerprint: canonical.fingerprint,
    blockingFindings: canonical.security.blockingFindings.length,
    migrations,
    r1Present: migrations.includes(R1),
    r2Present: migrations.includes(R2),
    r3Present: migrations.includes(R3),
    r12Ledger,
    hardeningLedger,
    r3LedgerState: r3LedgerRows.length === 0 ? "ABSENT" : "PRESENT_UNEXPECTED",
    candidateTablePresent: objects.candidate_table,
    candidateBridgePresent: objects.candidate_bridge,
    r2BridgeCount: objects.r2_bridge_count,
    r3TriggerCount: objects.r3_trigger_count,
    publicCollectiveRelationCount: objects.public_collective_relation_count,
  };
  if (
    !document.r1Present ||
    !document.r2Present ||
    document.r3Present ||
    document.r12Ledger !== "PRESENT_ACCEPTED" ||
    document.hardeningLedger !== "PRESENT_ACCEPTED" ||
    document.r3LedgerState !== "ABSENT" ||
    document.candidateTablePresent ||
    document.candidateBridgePresent ||
    document.r2BridgeCount !== 4 ||
    document.r3TriggerCount !== 0 ||
    document.publicCollectiveRelationCount !== 0 ||
    document.blockingFindings !== 0
  )
    throw new Error("COMUN_49_2_R3_PRODUCTION_PRE_DIVERGED");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  console.log("COMUN_49_2_R3_PRODUCTION_BASELINE_PRIVATE_GREEN");
} finally {
  await db.query("ROLLBACK").catch(() => {});
  await db.end();
}
