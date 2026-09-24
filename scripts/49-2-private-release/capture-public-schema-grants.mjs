import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export async function capturePublicSchemaGrants(connectionString, output) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const mode = await client.query(
      "select current_setting('transaction_read_only') as value",
    );
    if (mode.rows[0]?.value !== "on")
      throw new Error("COMUN_49_2_SCHEMA_GRANTS_NOT_READ_ONLY");
    const result = await client.query(`
      select
        case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end as grantee,
        x.privilege_type as privilege
      from pg_namespace n
      cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n',n.nspowner))) x
      where n.nspname='public'
      order by 1,2
    `);
    const grants = result.rows.map((row) => ({
      grantee: row.grantee,
      privilege: row.privilege,
    }));
    const document = {
      scope: "COMUN_49_2_PUBLIC_SCHEMA_GRANTS_READ_ONLY",
      transactionReadOnly: mode.rows[0].value,
      grants,
    };
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
    console.log(`COMUN_49_2_PUBLIC_SCHEMA_GRANTS_CAPTURED:${grants.length}`);
    return document;
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output =
    process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
    ".ci-artifacts/comun-49-2-schema-grants/grants.json";
  const connectionString =
    process.env.COMUN_DISPOSABLE_DB_URL ?? process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("COMUN_49_2_SCHEMA_GRANTS_DB_URL_MISSING");
  await capturePublicSchemaGrants(connectionString, output);
}
