import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";

const FUNCTION = "public.comun_sync_public_search_projection()";
const NEGATIVE = "public.comun_search_lint_negative_fixture";

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
    !(proof.rawFindingCount > 0) ||
    !proof.tempTablePresent ||
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

export async function proveLocalTempTable({ connectionString, output }) {
  requireDisposableUrl(connectionString);
  if (!output) throw new Error("COMUN_SEARCH_LINT_OUTPUT_REQUIRED");
  const reference = JSON.parse(
    await readFile(
      "reports/current/comun-pr437-production-preflight-reference.json",
      "utf8",
    ),
  );
  const client = new pg.Client({ connectionString });
  await client.connect();
  let transactionOpen = false;
  const artifact = {
    scope: "COMUN_SEARCH_SYNC_DISPOSABLE_TEMP_TABLE_PROOF",
    status: "BLOCKED",
    definitionSha256: reference.searchSyncDefinitionSha256,
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
      hash === reference.searchSyncDefinitionSha256 &&
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
    const raw = await client.query(
      `select level, sqlstate, message from "${schema}".plpgsql_check_function_tb($1::regprocedure, fatal_errors=>false) where level='error'`,
      [FUNCTION],
    );
    artifact.rawFindingExact =
      raw.rows.length > 0 &&
      raw.rows.every(
        (row) =>
          row.sqlstate === "42P01" &&
          row.message === 'relation "comun_search_candidates" does not exist',
      );
    artifact.rawFindingCount = raw.rows.length;
    if (!artifact.rawFindingExact)
      throw new Error("COMUN_SEARCH_LINT_RAW_FINDING_CHANGED");
    artifact.runtimeSqlState = null;
    await client.query(`select * from ${FUNCTION}`);
    const temp = await client.query(
      `select to_regclass('pg_temp.comun_search_candidates') is not null as present,
        (select count(*)::int from pg_attribute
         where attrelid=to_regclass('pg_temp.comun_search_candidates')
           and attnum>0 and not attisdropped) as column_count`,
    );
    artifact.tempTablePresent =
      temp.rows[0]?.present === true && temp.rows[0]?.column_count === 13;
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
  const output = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.slice(9);
  try {
    await proveLocalTempTable({
      connectionString: process.env.SUPABASE_DB_URL,
      output,
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
