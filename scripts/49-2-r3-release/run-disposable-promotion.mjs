import { writeFileSync } from "node:fs";
import pg from "pg";
import { loadValidatedR3Manifest } from "./validate-manifest.mjs";
import { createR3PostgresAdapter, requireDisposableUrl } from "./postgres-adapter.mjs";
import { promoteR3Release } from "./promotion-runner.mjs";

for (const name of ["SUPABASE_DB_URL", "SUPABASE_ACCESS_TOKEN", "SUPABASE_SERVICE_ROLE_KEY"])
  if (Object.hasOwn(process.env, name)) throw new Error("COMUN_R3_DISPOSABLE_PRODUCTION_SECRET_PRESENT");
const url = requireDisposableUrl(process.env.COMUN_DISPOSABLE_DB_URL ?? "");
const adminUrl = requireDisposableUrl(process.env.COMUN_DISPOSABLE_ADMIN_DB_URL ?? "");
if (new URL(url).pathname !== new URL(adminUrl).pathname)
  throw new Error("COMUN_R3_DISPOSABLE_DATABASE_MISMATCH");
const { manifest, baseline } = loadValidatedR3Manifest();
const adapter = createR3PostgresAdapter({ url, manifest, disposable: true });
const adminQuery = async (sql) => {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try { await client.query(sql); } finally { await client.end(); }
};
const applyMigration = async (migration) => {
  await adminQuery(`grant usage, create on schema private to postgres;
    grant create on schema public to postgres;
    grant references on auth.users to postgres;
    grant insert on supabase_migrations.schema_migrations to postgres;`);
  try { await adapter.applyMigration(migration); }
  finally {
    await adminQuery(`revoke usage, create on schema private from postgres;
      revoke create on schema public from postgres;
      revoke references on auth.users from postgres;
      revoke insert on supabase_migrations.schema_migrations from postgres;`);
  }
};
const result = await promoteR3Release({ manifest, baseline, ...adapter, applyMigration });
if (result.state !== "POST" || result.actions.join(",") !== "R3,LEDGER")
  throw new Error("COMUN_R3_DISPOSABLE_FORWARD_ONLY_INCOMPLETE");
const replay = await promoteR3Release({ manifest, baseline, ...adapter, applyMigration });
if (replay.state !== "POST" || replay.actions.length !== 0)
  throw new Error("COMUN_R3_DISPOSABLE_REPLAY_INVALID");
const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
if (!output) throw new Error("COMUN_R3_DISPOSABLE_OUTPUT_MISSING");
writeFileSync(output, `${JSON.stringify({ status: "COMUN_49_2_R3_FORWARD_ONLY_REHEARSAL_GREEN",
  firstActions: result.actions, replayActions: replay.actions, finalState: replay.state,
  migrationSha256: manifest.migrations[0].sha256 }, null, 2)}\n`);
console.log("COMUN_49_2_R3_FORWARD_ONLY_REHEARSAL_GREEN");
