import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [productionPath, prePath, postPath, outputPath] = process.argv.slice(2);
if (!productionPath || !prePath || !postPath || !outputPath)
  throw new Error("COMUN_R3_POST_INPUT_MISSING");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const productionBytes = readFileSync(productionPath);
const production = JSON.parse(productionBytes);
const pre = JSON.parse(readFileSync(prePath, "utf8"));
const post = JSON.parse(readFileSync(postPath, "utf8"));
const migrationPath = "supabase/migrations/20260924225210_comun_relata_collective_entity_private_candidate.sql";
const migrationSha256 = sha256(readFileSync(migrationPath));
if (migrationSha256 !== "873d3a2f6a86ed0225cda1bef77841bc35247630a4708ba2bb2f7c041f7970af")
  throw new Error("COMUN_R3_MIGRATION_BYTES_CHANGED");
if (pre.runnerFingerprint !== production.runnerFingerprint ||
    pre.canonicalFingerprint !== production.canonicalFingerprint ||
    post.target !== "DISPOSABLE" ||
    post.postgresVersion !== production.postgresVersion ||
    post.blockingFindings !== 0 ||
    post.releaseLedgerState !== "PRESENT_ACCEPTED" ||
    post.consentObjectCount !== 6 ||
    typeof post.runnerFingerprint !== "string" ||
    typeof post.canonicalFingerprint !== "string" ||
    JSON.stringify(post.migrations) !==
      JSON.stringify([...production.migrations, "20260924225210"]))
  throw new Error("COMUN_49_2_R3_DISPOSABLE_POST_INVALID");
const document = {
  scope: "COMUN_49_2_R3_PRIVATE_RELEASE_DISPOSABLE_POST",
  productionCaptureRun: production.runId,
  productionCaptureSha256: sha256(productionBytes),
  sourceMainSha: production.sourceMainSha,
  fixture: "tests/fixtures/pr437-post plus R1/R2 recovery ACL",
  image: "docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52",
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
};
writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log("COMUN_49_2_R3_DISPOSABLE_POST_VALID");
