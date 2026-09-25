import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [productionPath, prePath, postPath, structurePath, outputPath] =
  process.argv.slice(2);
if (!productionPath || !prePath || !postPath || !structurePath || !outputPath)
  throw new Error("COMUN_R4_POST_INPUT_MISSING");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const productionBytes = readFileSync(productionPath);
const production = JSON.parse(productionBytes);
const pre = JSON.parse(readFileSync(prePath, "utf8"));
const post = JSON.parse(readFileSync(postPath, "utf8"));
const structure = JSON.parse(readFileSync(structurePath, "utf8"));
const migrationPath =
  "supabase/migrations/20260925014131_comun_relata_collective_entity_legitimacy_eligibility.sql";
const migrationSha256 = sha256(readFileSync(migrationPath));

if (
  pre.runnerFingerprint !== production.runnerFingerprint ||
  pre.canonicalFingerprint !== production.canonicalFingerprint ||
  post.target !== "DISPOSABLE" ||
  post.postgresVersion !== production.postgresVersion ||
  post.blockingFindings !== 0 ||
  post.releaseLedgerState !== "PRESENT_ACCEPTED" ||
  post.consentObjectCount !== 6 ||
  typeof post.runnerFingerprint !== "string" ||
  typeof post.canonicalFingerprint !== "string" ||
  JSON.stringify(post.migrations) !==
    JSON.stringify([...production.migrations, "20260925014131"]) ||
  structure.status !== "COMUN_49_2_R4_PRIVATE_LEGITIMACY_NO_PUBLIC_EFFECT" ||
  structure.reviewRows !== 0 ||
  structure.publicLegitimacyRelations !== 0
)
  throw new Error("COMUN_49_2_R4_DISPOSABLE_POST_INVALID");

const document = {
  scope: "COMUN_49_2_R4_PRIVATE_RELEASE_DISPOSABLE_POST",
  productionCaptureRun: production.runId,
  productionCaptureSha256: sha256(productionBytes),
  sourceMainSha: production.sourceMainSha,
  fixture: "tests/fixtures/pr437-post plus R1/R2 recovery ACL plus accepted R3",
  image:
    "docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52",
  postgresVersion: production.postgresVersion,
  migrationPath,
  migrationSha256,
  pre: {
    runnerFingerprint: pre.runnerFingerprint,
    canonicalFingerprint: pre.canonicalFingerprint,
    blockingFindings: pre.blockingFindings,
  },
  post: {
    runnerFingerprint: post.runnerFingerprint,
    canonicalFingerprint: post.canonicalFingerprint,
    blockingFindings: post.blockingFindings,
  },
  structure,
};
writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log("COMUN_49_2_R4_DISPOSABLE_POST_VALID");
