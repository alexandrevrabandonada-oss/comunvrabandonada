import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { loadValidatedR4Manifest } from "./validate-manifest.mjs";
import { createR4PostgresAdapter } from "./postgres-adapter.mjs";
import { classifyR4Release } from "./state-machine.mjs";

const expectedSha = process.env.COMUN_R4_POST_MERGE_MAIN_SHA;
const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);

if (!output || !/^[a-f0-9]{40}$/.test(expectedSha ?? ""))
  throw new Error("COMUN_R4_POST_MERGE_CONTEXT_INVALID");
if (!process.env.SUPABASE_DB_URL)
  throw new Error("COMUN_R4_POST_MERGE_DB_URL_MISSING");
if (
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
    expectedSha
)
  throw new Error("COMUN_R4_POST_MERGE_SHA_MISMATCH");

const { manifest, baseline } = loadValidatedR4Manifest();
const adapter = createR4PostgresAdapter({
  url: process.env.SUPABASE_DB_URL,
  manifest,
});
const capture = await adapter.capture();
const classification = classifyR4Release(capture, manifest, baseline);

if (
  classification.state !== "PRE" ||
  capture.r4Present !== false ||
  capture.r4ReviewTablePresent !== false ||
  capture.r4BridgeCount !== 0 ||
  capture.r4ReviewTriggerCount !== 0 ||
  capture.r4LedgerState !== "ABSENT" ||
  capture.r12Ledger !== "PRESENT_ACCEPTED" ||
  capture.r3Ledger !== "PRESENT_ACCEPTED" ||
  capture.hardeningLedger !== "PRESENT_ACCEPTED" ||
  capture.blockingFindings !== 0 ||
  capture.runnerFingerprint !== manifest.expectedPreFingerprint ||
  capture.canonicalFingerprint !== manifest.expectedPreCanonicalFingerprint
)
  throw new Error("COMUN_49_2_R4_POST_MERGE_NOT_PRE");

const document = {
  scope: "COMUN_49_2_R4_POST_MERGE_PRODUCTION_READ_ONLY",
  sourceMainSha: expectedSha,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
  classification,
  capture,
  productionSchemaWrites: 0,
  productionBusinessWrites: 0,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
console.log("COMUN_49_2_R4_RELEASE_MERGED_SCHEMA_STILL_ABSENT");
