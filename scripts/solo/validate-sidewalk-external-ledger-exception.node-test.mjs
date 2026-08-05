import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  SIDEWALK_EXCEPTION,
  validateSidewalkExternalLedgerException,
} from "./validate-sidewalk-external-ledger-exception.mjs";

const exceptionPath =
  "supabase/migration-exceptions/20260724233256-sidewalk-external-ledger.json";
const migrationPath =
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";

test("external ledger exception validates the immutable migration and scope", async () => {
  const exception = JSON.parse(await readFile(exceptionPath, "utf8"));
  const migration = await readFile(migrationPath, "utf8");
  assert.equal(validateSidewalkExternalLedgerException(exception, migration), true);
  assert.equal(exception.excludeFromCliPlanning, true);
  assert.equal(exception.remoteStateRequired, "applied_exact_scoped");
});

test("external ledger exception fails closed when any contract value changes", async () => {
  const exception = JSON.parse(await readFile(exceptionPath, "utf8"));
  const migration = await readFile(migrationPath, "utf8");
  for (const key of ["version", "path", "sha256", "historyAuthority", "cliHistoryExpected", "remoteStateRequired"]) {
    const mutated = { ...exception, [key]: `${exception[key]}-changed` };
    assert.equal(validateSidewalkExternalLedgerException(mutated, migration), false, key);
  }
  assert.equal(
    validateSidewalkExternalLedgerException(
      { ...exception, scopedFingerprint: "0".repeat(64) },
      migration,
    ),
    false,
  );
  assert.equal(SIDEWALK_EXCEPTION.failClosedOnChange, true);
});
