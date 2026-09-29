import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import pg from "pg";
import { loadValidatedR5Manifest } from "./validate-manifest.mjs";
import { createR5PostgresAdapter } from "./postgres-adapter.mjs";
import { classifyR5Release } from "./state-machine.mjs";

const output =
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
  ".ci-artifacts/entity-onboarding-post-merge.json";
const expectedMainSha = process.env.COMUN_49_2_EXPECTED_MAIN_SHA;
const url = process.env.SUPABASE_DB_URL;

if (!url || !/^[a-f0-9]{40}$/.test(expectedMainSha ?? "")) {
  throw new Error("COMUN_49_2_ONBOARDING_POST_MERGE_CONTEXT_INVALID");
}

const { manifest, baseline } = loadValidatedR5Manifest();
const adapter = createR5PostgresAdapter({ url, manifest });
const r5 = await adapter.capture();
const classification = classifyR5Release(r5, manifest, baseline);

if (
  classification.state !== "POST" ||
  classification.action !== "ALREADY_APPLIED" ||
  r5.r5Ledger !== "PRESENT_ACCEPTED" ||
  r5.blockingFindings !== 0 ||
  r5.decisionRows !== 0 ||
  r5.projectionRows !== 0
) {
  throw new Error("COMUN_49_2_ONBOARDING_POST_MERGE_R5_DIVERGED");
}

await adapter.verifyPost();

const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const readOnly = (
    await db.query("select current_setting('transaction_read_only') as value")
  ).rows[0]?.value;
  if (readOnly !== "on")
    throw new Error("COMUN_49_2_ONBOARDING_POST_MERGE_NOT_READ_ONLY");

  const counts = (
    await db.query(`
      select
        (select count(*)::int
           from private.comun_relata_collective_entities) as entities,
        (select count(*)::int
           from private.comun_relata_collective_entity_representations) as representations,
        (select count(*)::int
           from private.comun_relata_collective_entity_consents) as consents,
        (select count(*)::int
           from private.comun_relata_collective_entity_candidates) as candidates,
        (select count(*)::int
           from private.comun_relata_collective_entity_candidate_reviews) as reviews,
        (select count(*)::int
           from private.comun_relata_collective_entity_projection_decisions) as projection_decisions,
        (select count(*)::int
           from public.comun_relata_collective_entity_public_projections) as projection_rows
    `)
  ).rows[0];

  const document = {
    checkpoint:
      "COMUN_49_2_ENTITY_ONBOARDING_R4_REVIEW_DEPLOYED_ZERO_BUSINESS_ROWS_MAP_CLOSED",
    expectedMainSha,
    transactionReadOnly: readOnly,
    r5State: classification.state,
    r5Action: classification.action,
    r5Ledger: r5.r5Ledger,
    runnerFingerprint: r5.runnerFingerprint,
    canonicalFingerprint: r5.canonicalFingerprint,
    blockingFindings: r5.blockingFindings,
    entities: Number(counts.entities),
    representations: Number(counts.representations),
    consents: Number(counts.consents),
    candidates: Number(counts.candidates),
    reviews: Number(counts.reviews),
    projectionDecisions: Number(counts.projection_decisions),
    projectionRows: Number(counts.projection_rows),
  };

  for (const key of [
    "entities",
    "representations",
    "consents",
    "candidates",
    "reviews",
    "projectionDecisions",
    "projectionRows",
  ]) {
    if (document[key] !== 0)
      throw new Error(
        `COMUN_49_2_ONBOARDING_POST_MERGE_UNEXPECTED_${key.toUpperCase()}`,
      );
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(document, null, 2) + "\n");
  console.log(document.checkpoint);
} finally {
  await db.query("ROLLBACK").catch(() => {});
  await db.end();
}
