import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const SIDEWALK_EXCEPTION = Object.freeze({
  version: "20260724233256",
  path: "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql",
  sha256: "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be",
  historyAuthority: "public.comun_schema_releases",
  cliHistoryExpected: "absent",
  remoteStateRequired: "applied_exact_scoped",
  scopedFingerprint:
    "4bebf4c1db4da58fd9710c7f9478bb2837b171aa4620de2d376e19d5a99b66d8",
  excludeFromCliPlanning: true,
  failClosedOnChange: true,
});

const sha256 = (value) =>
  createHash("sha256").update(String(value)).digest("hex");

export function validateSidewalkExternalLedgerException(
  exception,
  migrationSource,
) {
  if (!exception || !migrationSource) return false;
  for (const [key, expected] of Object.entries(SIDEWALK_EXCEPTION)) {
    if (exception[key] !== expected) return false;
  }
  return sha256(migrationSource) === SIDEWALK_EXCEPTION.sha256;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exceptionPath = process.argv[2];
  if (!exceptionPath) throw new Error("COMUN_SIDEWALK_EXCEPTION_REQUIRED");
  const exception = JSON.parse(await readFile(exceptionPath, "utf8"));
  const migrationPath = exception.path;
  const migration = await readFile(migrationPath, "utf8");
  if (!validateSidewalkExternalLedgerException(exception, migration)) {
    throw new Error("COMUN_48_1B_R1A_EXTERNAL_LEDGER_EXCEPTION_INVALID");
  }
  console.log("COMUN_SIDEWALK_EXTERNAL_LEDGER_EXCEPTION_VALID");
}
