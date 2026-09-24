import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import pg from "pg";
import {
  buildDocuments,
  query as canonicalQuery,
} from "../db/verify-canonical-baseline.mjs";

function requireLocalDatabase(url) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "postgresql:" ||
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    !/^comun_49_2_partial_diag_[0-9]+_[ab]$/.test(parsed.pathname.slice(1))
  ) {
    throw new Error("COMUN_49_2_PARTIAL_DIAG_LOCAL_DB_REQUIRED");
  }
  return url;
}

const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const url = requireLocalDatabase(process.env.COMUN_DIAG_DB_URL ?? "");
const output = process.argv
  .find((value) => value.startsWith("--output="))
  ?.slice("--output=".length);
if (!output) throw new Error("COMUN_49_2_PARTIAL_DIAG_OUTPUT_REQUIRED");

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("BEGIN READ ONLY");
  const rawRows = await client.query(canonicalQuery);
  const raw = JSON.parse(Object.values(rawRows.rows[0] ?? {})[0]);
  const document = buildDocuments(raw).compact;
  const components = Object.fromEntries(
    Object.entries(document.canonical).map(([key, value]) => [key, hash(value)]),
  );
  writeFileSync(
    output,
    `${JSON.stringify(
      {
        scope: "COMUN_49_2_PARTIAL_FINGERPRINT_DIAGNOSTIC",
        fingerprint: document.fingerprint,
        blockingFindings: document.security.blockingFindings.length,
        components,
        schemaGrants: document.canonical.schemaGrants,
        defaultPrivileges: document.canonical.defaultPrivileges,
        migrations: document.canonical.migrations,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
}
