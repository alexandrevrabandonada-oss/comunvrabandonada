import { readFile, writeFile } from "node:fs/promises";

const SHA = /^[a-f0-9]{64}$/;
const VERSION = /^\d{12,14}$/;
const NAME = /^[a-z][a-z0-9_]*$/;

export function comparePreflight(actual, reference, release) {
  const expectedMigrations = reference.migrations ?? [];
  const actualMigrations = actual.migrations ?? [];
  const expectedLegacy = reference.legacyRelations ?? [];
  const actualLegacy = actual.legacyRelations ?? [];
  const expectedRelations = reference.publicRelations ?? [];
  const actualRelations = actual.publicRelations ?? [];
  if (
    ![
      actual.runnerFingerprint,
      actual.canonicalFingerprint,
      reference.canonicalFingerprint,
      release.expectedPreFingerprint,
    ].every((value) => SHA.test(value ?? ""))
  ) {
    throw new Error("PR437_PREFLIGHT_INVALID_FINGERPRINT");
  }
  if (
    ![...expectedMigrations, ...actualMigrations].every((value) =>
      VERSION.test(value),
    ) ||
    ![
      ...expectedLegacy,
      ...actualLegacy,
      ...expectedRelations,
      ...actualRelations,
    ].every((value) => NAME.test(value))
  ) {
    throw new Error("PR437_PREFLIGHT_UNSAFE_IDENTITY");
  }
  const missingMigrations = expectedMigrations.filter(
    (value) => !actualMigrations.includes(value),
  );
  const extraMigrations = actualMigrations.filter(
    (value) => !expectedMigrations.includes(value),
  );
  const missingLegacyRelations = expectedLegacy.filter(
    (value) => !actualLegacy.includes(value),
  );
  const extraLegacyRelations = actualLegacy.filter(
    (value) => !expectedLegacy.includes(value),
  );
  const missingRelations = expectedRelations.filter(
    (value) => !actualRelations.includes(value),
  );
  const extraRelations = actualRelations.filter(
    (value) => !expectedRelations.includes(value),
  );
  const matched =
    actual.runnerFingerprint === release.expectedPreFingerprint &&
    actual.canonicalFingerprint === reference.canonicalFingerprint &&
    actual.blockingFindings === reference.expectedBlockingFindings &&
    JSON.stringify(actual.findingRules) ===
      JSON.stringify(reference.expectedFindingRules) &&
    !missingMigrations.length &&
    !extraMigrations.length &&
    !missingLegacyRelations.length &&
    !extraLegacyRelations.length &&
    !missingRelations.length &&
    !extraRelations.length &&
    actual.consentMigrationPresent === false &&
    actual.consentObjectCount === 0;
  return {
    scope: "COMUN_PR437_PRODUCTION_PROMOTION_PREFLIGHT",
    status: matched ? "PASS" : "BLOCKED",
    expectedPre: release.expectedPreFingerprint,
    actualPre: actual.runnerFingerprint,
    expectedCanonical: reference.canonicalFingerprint,
    actualCanonical: actual.canonicalFingerprint,
    blockingFindingsCount: actual.blockingFindings,
    expectedBlockingFindings: reference.expectedBlockingFindings,
    missingMigrations,
    extraMigrations,
    expectedLegacyRelations: expectedLegacy,
    actualLegacyRelations: actualLegacy,
    missingLegacyRelations,
    extraLegacyRelations,
    missingRelations,
    extraRelations,
    consentMigrationPresent: actual.consentMigrationPresent,
    consentObjectCount: actual.consentObjectCount,
  };
}

if (process.argv[1]?.endsWith("check-pr437-promotion-preflight.mjs")) {
  const capture = process.argv
    .find((arg) => arg.startsWith("--capture="))
    ?.slice(10);
  const output = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.slice(9);
  if (!capture || !output) throw new Error("PR437_PREFLIGHT_ARGUMENTS_MISSING");
  const [actual, reference, release] = await Promise.all([
    readFile(capture, "utf8").then(JSON.parse),
    readFile(
      "reports/current/comun-pr437-production-preflight-reference.json",
      "utf8",
    ).then(JSON.parse),
    readFile(
      "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
      "utf8",
    ).then(JSON.parse),
  ]);
  const diagnostic = comparePreflight(actual, reference, release);
  await writeFile(output, `${JSON.stringify(diagnostic, null, 2)}\n`);
  if (diagnostic.status !== "PASS")
    throw new Error("PR437_PRODUCTION_PREFLIGHT_MISMATCH");
  console.log("PR437_PRODUCTION_PREFLIGHT_PASS_READ_ONLY");
}
