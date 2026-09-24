import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  query as canonicalQuery,
  buildDocuments,
} from "../db/verify-canonical-baseline.mjs";

export const hashCanonicalSections = (canonical = {}) =>
  Object.fromEntries(
    Object.entries(canonical)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => [
        name,
        {
          count: Array.isArray(value) ? value.length : 0,
          sha256: createHash("sha256")
            .update(JSON.stringify(value))
            .digest("hex"),
        },
      ]),
  );

async function main() {
  const output =
    process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
    ".ci-artifacts/comun-49-2-partial-r1-canonical/section-hashes.json";
  const connectionString =
    process.env.COMUN_DISPOSABLE_DB_URL ?? process.env.SUPABASE_DB_URL;
  if (!connectionString)
    throw new Error("COMUN_49_2_SECTION_HASH_DB_URL_MISSING");

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const mode = await client.query(
      "select current_setting('transaction_read_only') as value",
    );
    if (mode.rows[0]?.value !== "on")
      throw new Error("COMUN_49_2_SECTION_HASH_NOT_READ_ONLY");

    const rows = await client.query(canonicalQuery);
    const raw = JSON.parse(Object.values(rows.rows[0] ?? {})[0]);
    const compact = buildDocuments(raw).compact;
    const migrations = compact.canonical.migrations ?? [];
    const document = {
      scope: "COMUN_49_2_PARTIAL_R1_CANONICAL_SECTION_HASHES",
      transactionReadOnly: mode.rows[0].value,
      canonicalFingerprint: compact.fingerprint,
      blockingFindings: compact.security.blockingFindings.length,
      sections: hashCanonicalSections(compact.canonical),
      migrationTail: migrations.slice(-12),
      hasR1: migrations.includes("20260901000000"),
      hasR2: migrations.includes("20260924015511"),
    };
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
    console.log(
      `COMUN_49_2_PARTIAL_R1_SECTION_HASHES_CAPTURED:${compact.fingerprint}`,
    );
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
