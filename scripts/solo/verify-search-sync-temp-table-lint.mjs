import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";

const IDENTITY = "public.comun_sync_public_search_projection()";
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const HASH = /^[a-f0-9]{64}$/;
export const API_UNAVAILABLE = "COMUN_SEARCH_LINT_PRAGMA_API_UNAVAILABLE";

export function selectPragmaApi(functions) {
  const make = functions.find(
    (item) =>
      item.name === "plpgsql_make_pragma" &&
      ["regprocedure", "text"].includes(item.firstArgument),
  );
  const check = functions.find(
    (item) =>
      item.name === "plpgsql_check_function_tb" &&
      ["regprocedure", "text"].includes(item.firstArgument) &&
      item.arguments.includes("pragmas"),
  );
  if (!make || !check) throw new Error(API_UNAVAILABLE);
  return { makeType: make.firstArgument, checkType: check.firstArgument };
}

export async function verifySearchSync({ connectionString, output }) {
  if (!connectionString || !output)
    throw new Error("COMUN_SEARCH_LINT_ARGUMENTS_MISSING");
  const reference = JSON.parse(
    await readFile(
      "reports/current/comun-pr437-production-preflight-reference.json",
      "utf8",
    ),
  );
  if (
    !HASH.test(reference.searchSyncDefinitionSha256 ?? "") ||
    !IDENTIFIER.test(reference.searchSyncOwner ?? "")
  )
    throw new Error("COMUN_SEARCH_LINT_REFERENCE_INVALID");
  const client = new pg.Client({ connectionString });
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN READ ONLY");
    transactionOpen = true;
    const mode = await client.query(
      "select current_setting('transaction_read_only') as value",
    );
    if (mode.rows[0]?.value !== "on")
      throw new Error("COMUN_SEARCH_LINT_NOT_READ_ONLY");
    const identity = await client.query(
      String.raw`
      select l.lanname as language, p.prosecdef as security_definer,
        p.proconfig as config, pg_get_userbyid(p.proowner) as owner,
      regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g') as definition
      from pg_proc p join pg_language l on l.oid=p.prolang
      where p.oid=to_regprocedure($1)`,
      [IDENTITY],
    );
    const target = identity.rows[0];
    if (
      !target ||
      target.language !== "plpgsql" ||
      target.security_definer !== true ||
      JSON.stringify(target.config) !==
        JSON.stringify(["search_path=pg_catalog"]) ||
      target.owner !== reference.searchSyncOwner ||
      createHash("sha256").update(target.definition).digest("hex") !==
        reference.searchSyncDefinitionSha256
    )
      throw new Error("COMUN_SEARCH_LINT_FUNCTION_IDENTITY_MISMATCH");
    const extensions = await client.query(`
      select n.nspname as schema, e.extversion as version
      from pg_extension e join pg_namespace n on n.oid=e.extnamespace
      where e.extname='plpgsql_check'`);
    const extension = extensions.rows[0];
    if (!extension || !IDENTIFIER.test(extension.schema))
      throw new Error(API_UNAVAILABLE);
    const apiRows = await client.query(
      `
      select p.proname as name, p.proargtypes[0]::regtype::text as first_argument,
        coalesce(p.proargnames, array[]::text[]) as arguments
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname=$1 and p.proname in ('plpgsql_make_pragma','plpgsql_check_function_tb')`,
      [extension.schema],
    );
    const functions = apiRows.rows.map((row) => ({
      name: row.name,
      firstArgument: row.first_argument,
      arguments: row.arguments,
    }));
    let api;
    try {
      api = selectPragmaApi(functions);
    } catch {
      const error = new Error(API_UNAVAILABLE);
      error.details = {
        extensionVersion: extension.version,
        makePragmaAvailable: functions.some(
          (item) => item.name === "plpgsql_make_pragma",
        ),
        checkerAcceptsPragmas: functions.some(
          (item) =>
            item.name === "plpgsql_check_function_tb" &&
            item.arguments.includes("pragmas"),
        ),
      };
      throw error;
    }
    const qualifiedMake = `"${extension.schema}"."plpgsql_make_pragma"`;
    const qualifiedCheck = `"${extension.schema}"."plpgsql_check_function_tb"`;
    const pragmaRows = await client.query(
      `select ${qualifiedMake}($1::${api.makeType}) as pragma`,
      [IDENTITY],
    );
    const pragmas = pragmaRows.rows
      .map((row) => row.pragma)
      .filter((value) => typeof value === "string");
    if (
      !pragmas.length ||
      !pragmas.some((value) => value.includes("comun_search_candidates"))
    )
      throw new Error("COMUN_SEARCH_LINT_TEMP_PRAGMA_MISSING");
    const findings = await client.query(
      `select level from ${qualifiedCheck}($1::${api.checkType}, fatal_errors => false, pragmas => $2::text[])`,
      [IDENTITY, pragmas],
    );
    const errors = findings.rows.filter(
      (row) => String(row.level).toLowerCase() === "error",
    ).length;
    const artifact = {
      scope: "COMUN_SEARCH_SYNC_TEMP_TABLE_PRAGMA_LINT",
      status: errors === 0 ? "GREEN" : "BLOCKED",
      function: IDENTITY,
      functionDefinitionSha256: reference.searchSyncDefinitionSha256,
      extensionVersion: extension.version,
      pragmaCount: pragmas.length,
      searchCandidatesPragmaPresent: true,
      pragmasSha256: createHash("sha256")
        .update(JSON.stringify(pragmas))
        .digest("hex"),
      checkerErrors: errors,
      checkerWarnings: findings.rows.length - errors,
      readOnly: true,
    };
    await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
    if (errors !== 0) throw new Error("COMUN_SEARCH_LINT_PRAGMA_ERRORS");
    console.log("COMUN_SEARCH_SYNC_PRAGMA_LINT_GREEN");
    return artifact;
  } finally {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
}

if (process.argv[1]?.endsWith("verify-search-sync-temp-table-lint.mjs")) {
  const output = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.slice(9);
  try {
    await verifySearchSync({
      connectionString: process.env.SUPABASE_DB_URL,
      output,
    });
  } catch (error) {
    const marker = /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "COMUN_SEARCH_LINT_UNEXPECTED_FAILURE";
    if (output)
      await writeFile(
        output,
        `${JSON.stringify({ scope: "COMUN_SEARCH_SYNC_TEMP_TABLE_PRAGMA_LINT", status: "BLOCKED", marker, ...(error.details ?? {}) }, null, 2)}\n`,
      );
    console.error(marker);
    process.exitCode = 1;
  }
}
