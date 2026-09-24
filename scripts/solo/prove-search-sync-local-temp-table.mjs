import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import {
  classifyVersionEquivalence,
  loadReleaseContract,
  requireDisposableCapture,
  requireProductionCapture,
  sha256,
} from "./pr437-search-proof-contract.mjs";

const FUNCTION = "public.comun_sync_public_search_projection()";
const NEGATIVE = "public.comun_search_lint_negative_fixture";
const TEMP_COLUMNS = [
  "domain:text",
  "source_type:text",
  "source_key:text",
  "source_version:text",
  "canonical_route:text",
  "title:text",
  "summary:text",
  "public_text:text",
  "territory_id:uuid",
  "pauta_id:uuid",
  "process_state:text",
  "source_date:timestamp with time zone",
  "content_checksum:text",
];

export function requireRawFindings(rows, expected) {
  if (
    !Array.isArray(rows) ||
    !Array.isArray(expected) ||
    rows.length !== expected.length ||
    rows.length !== 3
  )
    throw new Error("COMUN_SEARCH_LINT_RAW_FINDING_CHANGED");
  const compact = rows.map((row) => ({
    line: Number(row.lineno),
    querySha256: sha256(
      String(row.query ?? "")
        .trim()
        .replace(/\s+/g, " "),
    ),
  }));
  if (
    rows.some(
      (row) =>
        row.sqlstate !== "42P01" ||
        row.message !== 'relation "comun_search_candidates" does not exist' ||
        !String(row.query ?? "").includes("comun_search_candidates"),
    ) ||
    JSON.stringify(compact) !== JSON.stringify(expected)
  )
    throw new Error("COMUN_SEARCH_LINT_RAW_FINDING_CHANGED");
  return compact;
}

export function requireTempColumns(rows) {
  const actual = rows.map((row) => `${row.name}:${row.type}`);
  if (JSON.stringify(actual) !== JSON.stringify(TEMP_COLUMNS))
    throw new Error("COMUN_SEARCH_LINT_TEMP_TABLE_STRUCTURE_CHANGED");
  return actual.length;
}

export function requireDisposableUrl(connectionString) {
  const url = new URL(connectionString);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !/^comun_pr437_prodlike_post_[0-9]+$/.test(
      decodeURIComponent(url.pathname.slice(1)),
    )
  )
    throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_TARGET_REQUIRED");
}

export function validateLocalProof(proof) {
  if (
    proof.status !== "GREEN" ||
    !proof.definitionMatchesProduction ||
    proof.postgresVersion !== "17.6" ||
    !/^2\.[0-9]+$/.test(proof.plpgsqlCheckVersion ?? "") ||
    !proof.rawFindingExact ||
    proof.rawFindingCount !== 3 ||
    !proof.tempTablePresent ||
    proof.tempTableColumnCount !== 13 ||
    proof.runtimeSqlState !== null ||
    proof.checkerErrors !== 0 ||
    !proof.negativeFixtureDetected ||
    !proof.countsRestored ||
    !proof.tempTableRemoved ||
    !proof.negativeFixtureRemoved
  )
    throw new Error("COMUN_SEARCH_LINT_LOCAL_PROOF_INCOMPLETE");
  return proof;
}

export async function proveLocalTempTable({
  connectionString,
  output,
  productionCapture,
  disposableCapture,
  captureSha256,
  fixture,
  runSha,
  runId,
}) {
  requireDisposableUrl(connectionString);
  if (
    !output ||
    !productionCapture ||
    !disposableCapture ||
    !captureSha256 ||
    !fixture ||
    !runSha ||
    !runId
  )
    throw new Error("COMUN_SEARCH_LINT_ARGUMENTS_MISSING");
  const { reference, release, manifestSha256 } = await loadReleaseContract();
  const productionBytes = await readFile(productionCapture);
  if (sha256(productionBytes) !== captureSha256)
    throw new Error("COMUN_SEARCH_LINT_PRODUCTION_ARTIFACT_HASH_MISMATCH");
  const production = requireProductionCapture(
    JSON.parse(productionBytes),
    reference,
    release,
    manifestSha256,
  );
  const disposable = requireDisposableCapture(
    JSON.parse(await readFile(disposableCapture, "utf8")),
    production,
    fixture,
  );
  const client = new pg.Client({ connectionString });
  await client.connect();
  let transactionOpen = false;
  const artifact = {
    scope: "COMUN_SEARCH_SYNC_DISPOSABLE_TEMP_TABLE_PROOF",
    status: "BLOCKED",
    productionCaptureSha256: captureSha256,
    runSha,
    runId,
    productionPostgresVersion: production.postgresVersion,
    productionAvailableVersions: production.plpgsqlCheckCatalog.versions.map(
      (item) => item.version,
    ),
    productionDefinitionSha256: production.searchFunction.definitionSha256,
    disposableDefinitionSha256: disposable.searchFunction.definitionSha256,
    runnerFingerprint: disposable.runnerFingerprint,
    canonicalFingerprint: disposable.canonicalFingerprint,
    releaseLedgerState: disposable.releaseLedgerState,
    migrationSha256: release.migrationSha256,
    manifestSha256,
    imageDigest: fixture.postgresImage,
    imageTag: fixture.postgresImageTag,
    disposable: true,
  };
  try {
    const db = await client.query("select current_database() as name");
    if (!/^comun_pr437_prodlike_post_[0-9]+$/.test(db.rows[0]?.name))
      throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_TARGET_REQUIRED");
    const countSql = `select
      (select count(*)::int from public.comun_search_documents) as documents,
      (select count(*)::int from public.comun_search_sections) as sections`;
    const before = (await client.query(countSql)).rows[0];
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SET LOCAL search_path TO pg_catalog");
    const identity = await client.query(
      `select pg_get_functiondef(p.oid) as definition, p.proconfig as config,
        p.prosecdef as security_definer, pg_get_userbyid(p.proowner) as owner
       from pg_proc p where p.oid=to_regprocedure($1)`,
      [FUNCTION],
    );
    const target = identity.rows[0];
    const normalized = target?.definition.replace(/\s+/g, " ");
    const hash =
      normalized && createHash("sha256").update(normalized).digest("hex");
    artifact.definitionMatchesProduction =
      hash === production.searchFunction.definitionSha256 &&
      target?.owner === reference.searchSyncOwner &&
      target?.security_definer === true &&
      JSON.stringify(target?.config) ===
        JSON.stringify(["search_path=pg_catalog"]);
    if (!artifact.definitionMatchesProduction)
      throw new Error("COMUN_SEARCH_LINT_FUNCTION_IDENTITY_MISMATCH");
    const extension = await client.query(
      `select e.extversion as version, n.nspname as schema
       from pg_extension e join pg_namespace n on n.oid=e.extnamespace
       where e.extname='plpgsql_check'`,
    );
    const schema = extension.rows[0]?.schema;
    if (!/^[a-z_][a-z0-9_]*$/.test(schema ?? ""))
      throw new Error("COMUN_SEARCH_LINT_LOCAL_EXTENSION_MISSING");
    artifact.postgresVersion = (
      await client.query("show server_version")
    ).rows[0].server_version;
    artifact.plpgsqlCheckVersion = extension.rows[0].version;
    artifact.versionEquivalence = classifyVersionEquivalence(
      production.plpgsqlCheckCatalog.available.defaultVersion,
      artifact.plpgsqlCheckVersion,
    );
    if (
      artifact.plpgsqlCheckVersion !== fixture.plpgsqlCheckCatalogVersion ||
      artifact.versionEquivalence === "MISMATCH"
    )
      throw new Error("COMUN_SEARCH_LINT_EXTENSION_VERSION_MISMATCH");
    const raw = await client.query(
      `select lineno, sqlstate, message, query from "${schema}".plpgsql_check_function_tb($1::regprocedure, fatal_errors=>false) where level='error' order by lineno`,
      [FUNCTION],
    );
    artifact.rawFindingContract = requireRawFindings(
      raw.rows,
      fixture.expectedRawFindings,
    );
    artifact.rawFindingExact = true;
    artifact.rawFindingCount = raw.rows.length;
    artifact.runtimeSqlState = null;
    await client.query(`select * from ${FUNCTION}`);
    const temp = await client.query(
      "select to_regclass('pg_temp.comun_search_candidates') is not null as present",
    );
    artifact.tempTablePresent = temp.rows[0]?.present === true;
    const columns =
      await client.query(`select attname as name, format_type(atttypid,atttypmod) as type
      from pg_attribute where attrelid=to_regclass('pg_temp.comun_search_candidates')
      and attnum>0 and not attisdropped order by attnum`);
    artifact.tempTableColumnCount = requireTempColumns(columns.rows);
    const checked = await client.query(
      `select level from "${schema}".plpgsql_check_function_tb($1::regprocedure, fatal_errors=>false) where level='error'`,
      [FUNCTION],
    );
    artifact.checkerErrors = checked.rows.length;
    const clone = target.definition
      .replace(
        "FUNCTION public.comun_sync_public_search_projection()",
        `FUNCTION ${NEGATIVE}()`,
      )
      .replace(
        "insert into public.comun_search_documents (",
        "insert into public.__comun_missing_relation_fixture (",
      );
    if (
      clone === target.definition ||
      !clone.includes("public.__comun_missing_relation_fixture")
    )
      throw new Error("COMUN_SEARCH_LINT_NEGATIVE_FIXTURE_INVALID");
    await client.query(clone);
    const negative = await client.query(
      `select sqlstate, message from "${schema}".plpgsql_check_function_tb($1::regprocedure, fatal_errors=>false) where level='error'`,
      [`${NEGATIVE}()`],
    );
    artifact.negativeFixtureDetected = negative.rows.some(
      (row) =>
        row.sqlstate === "42P01" &&
        row.message.includes("__comun_missing_relation_fixture"),
    );
    if (!artifact.negativeFixtureDetected)
      throw new Error("COMUN_SEARCH_LINT_NEGATIVE_CONTROL_FAILED");
    await client.query("ROLLBACK");
    transactionOpen = false;
    const after = (await client.query(countSql)).rows[0];
    artifact.countsRestored = JSON.stringify(before) === JSON.stringify(after);
    artifact.tempTableRemoved =
      (
        await client.query(
          "select to_regclass('pg_temp.comun_search_candidates') as relation",
        )
      ).rows[0]?.relation === null;
    artifact.negativeFixtureRemoved =
      (
        await client.query("select to_regprocedure($1) as identity", [
          `${NEGATIVE}()`,
        ])
      ).rows[0]?.identity === null;
    artifact.status = "GREEN";
    validateLocalProof(artifact);
    await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log("COMUN_SEARCH_SYNC_DISPOSABLE_TEMP_TABLE_PROOF_GREEN");
    return artifact;
  } finally {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
}

if (process.argv[1]?.endsWith("prove-search-sync-local-temp-table.mjs")) {
  const arg = (key) =>
    process.argv
      .find((value) => value.startsWith(`--${key}=`))
      ?.slice(key.length + 3);
  try {
    await proveLocalTempTable({
      connectionString: process.env.COMUN_DISPOSABLE_DB_URL,
      output: arg("output"),
      productionCapture: arg("production-capture"),
      disposableCapture: arg("disposable-capture"),
      captureSha256: arg("capture-sha256"),
      fixture: JSON.parse(
        await readFile(
          "tests/fixtures/pr437-post/fixture-manifest.json",
          "utf8",
        ),
      ),
      runSha: arg("run-sha"),
      runId: arg("run-id"),
    });
  } catch (error) {
    console.error(
      /^[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "COMUN_SEARCH_LINT_LOCAL_PROOF_FAILED",
    );
    process.exitCode = 1;
  }
}
