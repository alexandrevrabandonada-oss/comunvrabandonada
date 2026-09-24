import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { verifySearchSync } from "./verify-search-sync-temp-table-lint.mjs";

const FUNCTION = "public.comun_sync_public_search_projection";
const MESSAGE = 'relation "comun_search_candidates" does not exist';

export function parseLintOutput(output) {
  const clean = String(output)
    .replace(/\x1b\[[0-9;]*m/g, "")
    .trim();
  const start = clean.indexOf("[");
  if (start < 0) throw new Error("COMUN_DB_LINT_OUTPUT_INVALID");
  let findings;
  try {
    findings = JSON.parse(clean.slice(start));
  } catch {
    throw new Error("COMUN_DB_LINT_OUTPUT_INVALID");
  }
  if (!Array.isArray(findings)) throw new Error("COMUN_DB_LINT_OUTPUT_INVALID");
  return findings;
}

export function classifyLint(findings) {
  const issues = findings.flatMap((item) =>
    (item.issues ?? []).map((issue) => ({
      function: item.function,
      ...issue,
    })),
  );
  if (!issues.length) return "GREEN";
  if (
    findings.length === 1 &&
    issues.length === 1 &&
    issues[0].function === FUNCTION &&
    issues[0].level === "error" &&
    issues[0].sqlState === "42P01" &&
    issues[0].message === MESSAGE &&
    /^update comun_search_candidates set content_checksum\b/.test(
      String(issues[0].query?.text ?? "").trim(),
    )
  )
    return "TEMP_TABLE_KNOWN";
  return "BLOCKED";
}

export async function runGate({ connectionString, output, cli = "supabase" }) {
  if (!connectionString || !output)
    throw new Error("COMUN_DB_LINT_ARGUMENTS_MISSING");
  const result = spawnSync(
    cli,
    [
      "db",
      "lint",
      "--db-url",
      connectionString,
      "--schema",
      "public",
      "--level",
      "error",
      "--fail-on",
      "none",
    ],
    { encoding: "utf8", timeout: 300000, maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error || result.status !== 0)
    throw new Error("COMUN_DB_LINT_CLI_FAILED");
  const findings = parseLintOutput(result.stdout || result.stderr);
  const classification = classifyLint(findings);
  const errorCount = findings.reduce(
    (count, item) =>
      count +
      (item.issues ?? []).filter((issue) => issue.level === "error").length,
    0,
  );
  const artifact = {
    scope: "COMUN_PR437_STRICT_DB_LINT_GATE",
    status: classification === "BLOCKED" ? "BLOCKED" : "GREEN",
    classification,
    errorCount,
    exactKnownFinding: classification === "TEMP_TABLE_KNOWN",
    pragmaCheckerErrors: null,
  };
  if (classification === "TEMP_TABLE_KNOWN") {
    const pragma = await verifySearchSync({
      connectionString,
      output: `${output}.pragma.json`,
    });
    artifact.pragmaCheckerErrors = pragma.checkerErrors;
    if (pragma.status !== "GREEN" || pragma.checkerErrors !== 0)
      artifact.status = "BLOCKED";
  }
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
  if (artifact.status !== "GREEN")
    throw new Error("COMUN_DB_LINT_UNEXPECTED_FINDING");
  console.log(
    classification === "TEMP_TABLE_KNOWN"
      ? "COMUN_DB_LINT_TEMP_TABLE_STATIC_LIMITATION_PROVED"
      : "COMUN_DB_LINT_GREEN",
  );
  return artifact;
}

if (process.argv[1]?.endsWith("run-production-db-lint-gate.mjs")) {
  const output = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.slice(9);
  try {
    await runGate({ connectionString: process.env.SUPABASE_DB_URL, output });
  } catch (error) {
    const marker = /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "COMUN_DB_LINT_UNEXPECTED_FAILURE";
    if (output)
      await writeFile(
        output,
        `${JSON.stringify({ scope: "COMUN_PR437_STRICT_DB_LINT_GATE", status: "BLOCKED", marker }, null, 2)}\n`,
      );
    console.error(marker);
    process.exitCode = 1;
  }
}
