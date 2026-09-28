import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadValidatedR5Manifest } from "./validate-manifest.mjs";
import { createR5PostgresAdapter } from "./postgres-adapter.mjs";
import { classifyR5Release } from "./state-machine.mjs";

const output =
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
  ".ci-artifacts/r5-desk-post-merge.json";
const expectedMainSha = process.env.COMUN_R5_EXPECTED_MAIN_SHA;
const url = process.env.SUPABASE_DB_URL;

if (!url || !/^[a-f0-9]{40}$/.test(expectedMainSha ?? "")) {
  throw new Error("COMUN_R5_DESK_POST_MERGE_CONTEXT_INVALID");
}

const { manifest, baseline } = loadValidatedR5Manifest();
const adapter = createR5PostgresAdapter({ url, manifest });
const snapshot = await adapter.capture();
const classification = classifyR5Release(snapshot, manifest, baseline);

if (
  classification.state !== "POST" ||
  classification.action !== "ALREADY_APPLIED" ||
  snapshot.r5Ledger !== "PRESENT_ACCEPTED" ||
  snapshot.r5Present !== true ||
  snapshot.decisionTablePresent !== true ||
  snapshot.projectionTablePresent !== true ||
  snapshot.bridgeCount !== 3 ||
  snapshot.helperCount !== 6 ||
  snapshot.triggerCount !== 4 ||
  snapshot.decisionRows !== 0 ||
  snapshot.projectionRows !== 0 ||
  snapshot.blockingFindings !== 0
) {
  throw new Error("COMUN_R5_DESK_POST_MERGE_PRODUCTION_DIVERGED");
}

await adapter.verifyPost();

const document = {
  checkpoint: "COMUN_49_2_R5_PUBLISHER_DESK_DEPLOYED_ZERO_BUSINESS_ROWS_MAP_CLOSED",
  expectedMainSha,
  classification,
  postgresVersion: snapshot.postgresVersion,
  runnerFingerprint: snapshot.runnerFingerprint,
  canonicalFingerprint: snapshot.canonicalFingerprint,
  blockingFindings: snapshot.blockingFindings,
  r5Ledger: snapshot.r5Ledger,
  r5Present: snapshot.r5Present,
  decisionTablePresent: snapshot.decisionTablePresent,
  projectionTablePresent: snapshot.projectionTablePresent,
  bridgeCount: snapshot.bridgeCount,
  helperCount: snapshot.helperCount,
  triggerCount: snapshot.triggerCount,
  decisionRows: snapshot.decisionRows,
  projectionRows: snapshot.projectionRows,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(document, null, 2) + "\n");
console.log(document.checkpoint);
