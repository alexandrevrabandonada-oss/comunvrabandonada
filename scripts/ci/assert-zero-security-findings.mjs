import pg from "pg";
import { buildDocuments, query } from "../db/verify-canonical-baseline.mjs";

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL;
if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(
    connectionString || "",
  )
) {
  throw new Error("COMUN_ZERO_SECURITY_LOCAL_DATABASE_REQUIRED");
}
const client = new pg.Client({ connectionString });
await client.connect();
try {
  const result = await client.query(query);
  const document = buildDocuments(JSON.parse(result.rows[0].value));
  const count = document.compact.security.blockingFindings.length;
  if (count !== 0)
    throw new Error(`COMUN_ZERO_SECURITY_FINDINGS_REQUIRED:${count}`);
  console.log(
    `COMUN_ZERO_SECURITY_FINDINGS_OK fingerprint=${document.compact.fingerprint}`,
  );
} finally {
  await client.end();
}
