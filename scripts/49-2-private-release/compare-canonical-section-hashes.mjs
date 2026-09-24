import { readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

const [expectedPath, actualPath, outputPath] = process.argv.slice(2);
if (!expectedPath || !actualPath || !outputPath)
  throw new Error("COMUN_49_2_CANONICAL_COMPARE_INPUT_MISSING");

const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
const actual = JSON.parse(readFileSync(actualPath, "utf8"));
const expectedFingerprint =
  "208786bc2f6b595831e0a073f3bf7aac97fea955ce47e454cfde7d7e2ddc2c59";

if (
  expected.transactionReadOnly !== "on" ||
  actual.transactionReadOnly !== "on" ||
  expected.blockingFindings !== 0 ||
  actual.blockingFindings !== 0 ||
  expected.canonicalFingerprint !== expectedFingerprint ||
  expected.hasR1 !== true ||
  expected.hasR2 !== false ||
  actual.hasR1 !== true ||
  actual.hasR2 !== false
)
  throw new Error("COMUN_49_2_CANONICAL_COMPARE_CONTRACT_INVALID");

const names = [...new Set([
  ...Object.keys(expected.sections ?? {}),
  ...Object.keys(actual.sections ?? {}),
])].sort();
const mismatches = names
  .filter(
    (name) =>
      expected.sections?.[name]?.sha256 !== actual.sections?.[name]?.sha256,
  )
  .map((name) => ({
    section: name,
    expected: expected.sections?.[name] ?? null,
    actual: actual.sections?.[name] ?? null,
  }));

const document = {
  scope: "COMUN_49_2_PARTIAL_R1_CANONICAL_DIAGNOSTIC",
  expectedFingerprint: expected.canonicalFingerprint,
  actualFingerprint: actual.canonicalFingerprint,
  mismatchedSections: mismatches,
  expectedMigrationTail: expected.migrationTail,
  actualMigrationTail: actual.migrationTail,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(
  `COMUN_49_2_PARTIAL_R1_CANONICAL_MISMATCH_SECTIONS:${mismatches
    .map((item) => item.section)
    .join(",") || "NONE"}`,
);
