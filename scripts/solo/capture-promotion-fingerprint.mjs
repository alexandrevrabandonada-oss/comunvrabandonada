import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import pg from "pg";
import { schemaFingerprintQuery } from "./apply-forward-only.mjs";
import { buildDocuments, query as canonicalQuery } from "../db/verify-canonical-baseline.mjs";

const connectionString = process.env.SUPABASE_DB_URL;
const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
if (!connectionString || !output) throw new Error("CAPTURE_CONNECTION_OR_OUTPUT_MISSING");

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN READ ONLY");
  const mode = await client.query("select current_setting('transaction_read_only') as value");
  if (mode.rows[0]?.value !== "on") throw new Error("CAPTURE_TRANSACTION_NOT_READ_ONLY");
  const runnerRows = await client.query(schemaFingerprintQuery);
  const normalized = runnerRows.rows.map((row) => Object.values(row)[0]).join("\n").replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) throw new Error("CAPTURE_RUNNER_FINGERPRINT_EMPTY");
  const canonicalRows = await client.query(canonicalQuery);
  const raw = JSON.parse(Object.values(canonicalRows.rows[0] ?? {})[0]);
  const canonical = buildDocuments(raw).compact;
  const document = {
    scope: "COMUN_PR437_PROMOTION_FINGERPRINT_READ_ONLY",
    runnerAlgorithm: "sha256-postgres-public-catalog-v1",
    runnerFingerprint: createHash("sha256").update(normalized).digest("hex"),
    runnerRows: runnerRows.rows.length,
    canonicalAlgorithm: canonical.fingerprintAlgorithm,
    canonicalFingerprint: canonical.fingerprint,
    blockingFindings: canonical.security.blockingFindings.length,
    findingRules: [...new Set(canonical.security.blockingFindings.map((item) => item.rule))].sort(),
    migrationCount: canonical.canonical.migrations.length,
    consentMigrationPresent: canonical.canonical.migrations.includes("20260901000000"),
    legacyRelations: canonical.canonical.relations.filter((item) => ["comments", "communities", "knowledge_pages", "posts", "profiles", "project_links", "reactions_as_actions"].includes(item.name)).map((item) => item.name).sort(),
  };
  await writeFile(output, `${JSON.stringify(document, null, 2)}\n`);
  await client.query("ROLLBACK");
  console.log("COMUN_PR437_PROMOTION_FINGERPRINT_CAPTURED_READ_ONLY");
} finally {
  await client.end();
}
