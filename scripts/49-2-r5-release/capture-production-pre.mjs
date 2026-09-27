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
const R4 = "20260925014131";
const R5 = "20260926110454";
const R12_MANIFEST =
  "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json";
const R3_MANIFEST =
  "supabase/release-bundles/20260924-comun-49-2-r3-private-candidate.json";
const R4_MANIFEST =
  "supabase/release-bundles/20260925-comun-49-2-r4-private-legitimacy-eligibility.json";
const HARDENING_MANIFEST =
  "supabase/releases/20260922120000-canonical-security-hardening-v2.json";
const R5_RELEASE = "20260927-comun-49-2-r5-public-projection-gate";

const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
const expectedSha = process.env.COMUN_R5_EXPECTED_MAIN_SHA;
if (!output || !/^[a-f0-9]{40}$/.test(expectedSha ?? ""))
  throw new Error("COMUN_R5_CAPTURE_CONTEXT_INVALID");
if (!process.env.SUPABASE_DB_URL)
  throw new Error("COMUN_R5_PRODUCTION_DB_URL_MISSING");
if (
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
    expectedSha ||
  process.env.GITHUB_BASE_REF !== "main" ||
  process.env.GITHUB_HEAD_REF !== "codex/comun-49-2-r5-public-projection-release"
)
  throw new Error("COMUN_R5_CAPTURE_MAIN_SHA_MISMATCH");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const r12 = JSON.parse(readFileSync(R12_MANIFEST, "utf8"));
const r3 = JSON.parse(readFileSync(R3_MANIFEST, "utf8"));
const r4 = JSON.parse(readFileSync(R4_MANIFEST, "utf8"));
const hardening = JSON.parse(readFileSync(HARDENING_MANIFEST, "utf8"));

function ledgerState(rows, release, expected) {
  const matches = rows.filter((row) => row.release === release);
  if (matches.length === 0) return "ABSENT";
  if (matches.length !== 1) return "PRESENT_MISMATCH";
  const row = matches[0];
  return row.migration_path === expected.path &&
    row.migration_sha256 === expected.migrationSha256 &&
    row.pre_fingerprint === expected.preFingerprint &&
    row.post_fingerprint === expected.postFingerprint &&
    row.status === "applied"
    ? "PRESENT_ACCEPTED"
    : "PRESENT_MISMATCH";
}

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const mode = (
    await db.query("select current_setting('transaction_read_only') as value")
  ).rows[0]?.value;
  if (mode !== "on") throw new Error("COMUN_R5_CAPTURE_NOT_READ_ONLY");

  const version = (await db.query("show server_version")).rows[0]?.server_version;
  const runnerRows = await db.query(schemaFingerprintQuery);
  const normalized = runnerRows.rows
    .map((row) => Object.values(row)[0])
    .join("\n")
    .replace(/\r\n/g, "\n")
    .trimEnd();
  if (!normalized) throw new Error("COMUN_R5_RUNNER_FINGERPRINT_EMPTY");

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
        to_regclass('private.comun_relata_collective_entity_candidate_reviews') is not null as r4_review_table,
        (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public' and p.proname in (
            'comun_relata_collective_entity_server_candidate_review',
            'comun_relata_collective_entity_server_candidate_review_queue',
            'comun_relata_entity_server_candidate_legitimacy_list_own'
          )) as r4_bridge_count,
        (select count(*)::int from pg_trigger t
          where t.tgname='comun_relata_candidate_review_append_only'
            and not t.tgisinternal) as r4_review_trigger_count,
        to_regclass('private.comun_relata_collective_entity_projection_decisions') is not null as r5_decision_table,
        to_regclass('public.comun_relata_collective_entity_public_projections') is not null as r5_projection_table,
        (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public' and p.proname in (
            'comun_relata_collective_entity_server_projection_review_queue',
            'comun_relata_collective_entity_server_projection_decide',
            'comun_relata_collective_entity_server_public_projection_list'
          )) as r5_bridge_count,
        (select count(*)::int from pg_trigger t
          where t.tgname in (
            'comun_relata_projection_decision_append_only',
            'comun_relata_public_entity_projection_guard',
            'comun_relata_projection_suppress_after_review',
            'comun_relata_projection_suppress_after_candidate_change'
          ) and not t.tgisinternal) as r5_trigger_count,
        (select count(*)::int from pg_trigger t
          where t.tgname in (
            'comun_relata_candidate_immutable',
            'comun_relata_candidate_consent_invalidate',
            'comun_relata_candidate_representation_invalidate',
            'comun_relata_candidate_entity_invalidate'
          ) and not t.tgisinternal) as r3_trigger_count,
        (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public'
            and c.relkind in ('r','v','m','p')
            and c.relname like 'comun_relata_collective_entity%') as public_collective_entity_relation_count
    `)
  ).rows[0];

  const r5DecisionRows = objects.r5_decision_table
    ? Number(
        (
          await db.query(
            "select count(*)::int as count from private.comun_relata_collective_entity_projection_decisions",
          )
        ).rows[0]?.count ?? 0,
      )
    : 0;
  const r5ProjectionRows = objects.r5_projection_table
    ? Number(
        (
          await db.query(
            "select count(*)::int as count from public.comun_relata_collective_entity_public_projections",
          )
        ).rows[0]?.count ?? 0,
      )
    : 0;

  const ledgerRows = (
    await db.query(
      `select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status
         from public.comun_schema_releases
        where release = any($1::text[])`,
      [[r12.release, r3.release, r4.release, hardening.release, R5_RELEASE]],
    )
  ).rows;

  const r12Ledger = ledgerState(ledgerRows, r12.release, {
    path: r12.releaseLedger.migrationPath,
    migrationSha256: r12.migrationSetSha256,
    preFingerprint: r12.expectedPreFingerprint,
    postFingerprint: r12.expectedPostFingerprint,
  });
  const r3Ledger = ledgerState(ledgerRows, r3.release, {
    path: r3.releaseLedger.migrationPath,
    migrationSha256: r3.migrationSetSha256,
    preFingerprint: r3.expectedPreFingerprint,
    postFingerprint: r3.expectedPostFingerprint,
  });
  const r4Ledger = ledgerState(ledgerRows, r4.release, {
    path: r4.releaseLedger.migrationPath,
    migrationSha256: r4.migrationSetSha256,
    preFingerprint: r4.expectedPreFingerprint,
    postFingerprint: r4.expectedPostFingerprint,
  });
  const hardeningLedger = ledgerState(ledgerRows, hardening.release, {
    path: hardening.migration,
    migrationSha256: hardening.migrationSha256,
    preFingerprint: hardening.expectedPreFingerprint,
    postFingerprint: hardening.expectedPostFingerprint,
  });
  const r5Rows = ledgerRows.filter((row) => row.release === R5_RELEASE);

  const document = {
    scope: "COMUN_49_2_R5_PRODUCTION_PRE_READ_ONLY",
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
    r4Present: migrations.includes(R4),
    r5Present: migrations.includes(R5),
    r12Ledger,
    r3Ledger,
    r4Ledger,
    hardeningLedger,
    r5LedgerState: r5Rows.length === 0 ? "ABSENT" : "PRESENT_UNEXPECTED",
    candidateTablePresent: objects.candidate_table,
    candidateBridgePresent: objects.candidate_bridge,
    r3TriggerCount: objects.r3_trigger_count,
    r4ReviewTablePresent: objects.r4_review_table,
    r4BridgeCount: objects.r4_bridge_count,
    r4ReviewTriggerCount: objects.r4_review_trigger_count,
    r5DecisionTablePresent: objects.r5_decision_table,
    r5ProjectionTablePresent: objects.r5_projection_table,
    r5BridgeCount: objects.r5_bridge_count,
    r5TriggerCount: objects.r5_trigger_count,
    r5DecisionRows,
    r5ProjectionRows,
    publicCollectiveEntityRelationCount:
      objects.public_collective_entity_relation_count,
  };

  if (
    !document.r1Present ||
    !document.r2Present ||
    !document.r3Present ||
    !document.r4Present ||
    document.r5Present ||
    document.r12Ledger !== "PRESENT_ACCEPTED" ||
    document.r3Ledger !== "PRESENT_ACCEPTED" ||
    document.r4Ledger !== "PRESENT_ACCEPTED" ||
    document.hardeningLedger !== "PRESENT_ACCEPTED" ||
    document.r5LedgerState !== "ABSENT" ||
    !document.candidateTablePresent ||
    !document.candidateBridgePresent ||
    document.r3TriggerCount !== 4 ||
    !document.r4ReviewTablePresent ||
    document.r4BridgeCount !== 3 ||
    document.r4ReviewTriggerCount !== 1 ||
    document.r5DecisionTablePresent ||
    document.r5ProjectionTablePresent ||
    document.r5BridgeCount !== 0 ||
    document.r5TriggerCount !== 0 ||
    document.r5DecisionRows !== 0 ||
    document.r5ProjectionRows !== 0 ||
    document.publicCollectiveEntityRelationCount !== 0 ||
    document.runnerFingerprint !== r4.expectedPostFingerprint ||
    document.canonicalFingerprint !== r4.expectedPostCanonicalFingerprint ||
    document.blockingFindings !== 0
  )
    throw new Error("COMUN_49_2_R5_PRODUCTION_PRE_DIVERGED");

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  console.log("COMUN_49_2_R5_PRODUCTION_PRE_R4_ACCEPTED_R5_ABSENT");
} finally {
  await db.query("ROLLBACK").catch(() => {});
  await db.end();
}
