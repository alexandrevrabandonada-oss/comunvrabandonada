import { readFileSync, writeFileSync } from "node:fs";

const [partialPath, grantsPath, pendingPath, postPath, outputPath] = process.argv.slice(2);
if (![partialPath, grantsPath, pendingPath, postPath, outputPath].every(Boolean))
  throw new Error("COMUN_49_2_RECOVERY_FINGERPRINT_INPUT_MISSING");

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const partial = read(partialPath);
const grants = read(grantsPath);
const pending = read(pendingPath);
const post = read(postPath);
const exactGrant = grants.grants.some(
  (item) => item.grantee === "postgres" && item.privilege === "USAGE",
);
const exposedCreate = grants.grants.some(
  (item) =>
    ["PUBLIC", "anon", "authenticated"].includes(item.grantee) &&
    item.privilege === "CREATE",
);

if (
  partial.runnerFingerprint !==
    "a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98" ||
  partial.blockingFindings !== 0 ||
  partial.consentObjectCount !== 6 ||
  !partial.migrations.includes("20260901000000") ||
  partial.migrations.includes("20260924015511") ||
  !exactGrant ||
  exposedCreate ||
  pending.runnerFingerprint !==
    "7e957c3f154efe87f7104915a5b1e095cc77dc04d488bd4041b4c859f5db1b60" ||
  pending.blockingFindings !== 0 ||
  pending.consentObjectCount !== 6 ||
  !pending.migrations.includes("20260924015511") ||
  post.runnerFingerprint !== pending.runnerFingerprint ||
  post.canonicalFingerprint !== pending.canonicalFingerprint
) {
  throw new Error("COMUN_49_2_RECOVERY_FINGERPRINT_PROOF_INVALID");
}

const document = {
  scope: "COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_FINGERPRINTS",
  observedAclDelta: "postgres:USAGE@schema public",
  partialR1: {
    runnerFingerprint: partial.runnerFingerprint,
    canonicalFingerprint: partial.canonicalFingerprint,
    blockingFindings: partial.blockingFindings,
    consentObjectCount: partial.consentObjectCount,
  },
  post: {
    runnerFingerprint: pending.runnerFingerprint,
    canonicalFingerprint: pending.canonicalFingerprint,
    blockingFindings: pending.blockingFindings,
    consentObjectCount: pending.consentObjectCount,
  },
  ledgerDoesNotChangeCanonicalFingerprint:
    pending.canonicalFingerprint === post.canonicalFingerprint,
  ledgerProof: "ABSENT_BEFORE_EXACT_ACCEPTED_AFTER",
};
writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(
  `COMUN_49_2_RECOVERY_FINGERPRINTS_DERIVED:${partial.canonicalFingerprint}:${pending.canonicalFingerprint}`,
);
