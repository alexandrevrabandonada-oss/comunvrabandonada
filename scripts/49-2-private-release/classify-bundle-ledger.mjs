const rowFields = [
  "release",
  "migrationPath",
  "migrationSha256",
  "preFingerprint",
  "postFingerprint",
  "status",
];

function exactFields(value, fields) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...fields].sort())
  );
}

export function classifyBundleLedgerRows(capture, manifest) {
  if (
    !exactFields(capture, ["transactionReadOnly", "rows"]) ||
    capture.transactionReadOnly !== "on" ||
    !Array.isArray(capture.rows) ||
    capture.rows.length > 1 ||
    typeof manifest?.release !== "string" ||
    !exactFields(manifest?.releaseLedger, [
      "relation",
      "migrationPath",
      "migrationSha256",
      "status",
    ]) ||
    manifest.releaseLedger.relation !== "public.comun_schema_releases" ||
    typeof manifest.expectedPreFingerprint !== "string" ||
    typeof manifest.expectedPostFingerprint !== "string"
  ) {
    throw new Error("COMUN_49_2_BUNDLE_LEDGER_CAPTURE_INVALID");
  }

  if (capture.rows.length === 0)
    return { bundleLedgerState: "ABSENT", bundleLedgerRowCount: 0 };

  const row = capture.rows[0];
  if (
    !exactFields(row, rowFields) ||
    rowFields.some((field) => typeof row[field] !== "string")
  ) {
    throw new Error("COMUN_49_2_BUNDLE_LEDGER_CAPTURE_INVALID");
  }
  const expected = {
    release: manifest.release,
    migrationPath: manifest.releaseLedger.migrationPath,
    migrationSha256: manifest.releaseLedger.migrationSha256,
    preFingerprint: manifest.expectedPreFingerprint,
    postFingerprint: manifest.expectedPostFingerprint,
    status: manifest.releaseLedger.status,
  };
  const mismatchedFields = rowFields.filter(
    (field) => row[field] !== expected[field],
  );
  return mismatchedFields.length === 0
    ? { bundleLedgerState: "PRESENT_ACCEPTED", bundleLedgerRowCount: 1 }
    : {
        bundleLedgerState: "PRESENT_MISMATCH",
        bundleLedgerRowCount: 1,
        mismatchedFields,
      };
}
