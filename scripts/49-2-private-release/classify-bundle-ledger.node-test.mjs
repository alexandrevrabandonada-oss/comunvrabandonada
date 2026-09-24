import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyBundleLedgerRows } from "./classify-bundle-ledger.mjs";

const manifest = JSON.parse(
  readFileSync(
    "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json",
  ),
);
const row = {
  release: manifest.release,
  migrationPath: manifest.releaseLedger.migrationPath,
  migrationSha256: manifest.releaseLedger.migrationSha256,
  preFingerprint: manifest.expectedPreFingerprint,
  postFingerprint: manifest.expectedPostFingerprint,
  status: manifest.releaseLedger.status,
};
const capture = (rows) => ({ transactionReadOnly: "on", rows });

test("direct read-only zero-row capture is ABSENT", () => {
  assert.deepEqual(classifyBundleLedgerRows(capture([]), manifest), {
    bundleLedgerState: "ABSENT",
    bundleLedgerRowCount: 0,
  });
});

test("exact logical bundle row is PRESENT_ACCEPTED", () => {
  assert.deepEqual(classifyBundleLedgerRows(capture([row]), manifest), {
    bundleLedgerState: "PRESENT_ACCEPTED",
    bundleLedgerRowCount: 1,
  });
});

for (const field of [
  "migrationPath",
  "migrationSha256",
  "preFingerprint",
  "postFingerprint",
  "status",
]) {
  test(`${field} drift is PRESENT_MISMATCH without leaking its value`, () => {
    assert.deepEqual(
      classifyBundleLedgerRows(capture([{ ...row, [field]: "different" }]), manifest),
      {
        bundleLedgerState: "PRESENT_MISMATCH",
        bundleLedgerRowCount: 1,
        mismatchedFields: [field],
      },
    );
  });
}

test("unexpected shape, duplicates and non-read-only capture block", () => {
  for (const invalid of [
    { ...capture([]), transactionReadOnly: "off" },
    capture([row, row]),
    capture([{ ...row, unknown: "value" }]),
    capture([{ ...row, status: null }]),
    { transactionReadOnly: "on" },
  ]) {
    assert.throws(
      () => classifyBundleLedgerRows(invalid, manifest),
      /COMUN_49_2_BUNDLE_LEDGER_CAPTURE_INVALID/,
    );
  }
});
