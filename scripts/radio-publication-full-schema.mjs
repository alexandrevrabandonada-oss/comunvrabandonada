import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Own only the dedicated contract database in the exact local CLI container.
// Neither remote URLs nor container discovery are accepted here.
const root = resolve(import.meta.dirname, "..");
const config = readFileSync(`${root}/supabase/config.toml`, "utf8");
const project = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
const port = config.match(/\[db\][\s\S]*?^port\s*=\s*(\d+)/m)?.[1];
assert.ok(project && port, "explicit local CLI configuration required");
const container = `supabase_db_${project}`;
const database = "comun_radio_contract";
const docker = (args, input) =>
  execFileSync("docker", args, {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
const sql = (db, statement) =>
  docker([
    "exec",
    container,
    "psql",
    "-U",
    "supabase_admin",
    "-d",
    db,
    "-X",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    statement,
  ]).trim();
let created = false;
let evidence;
let phase = "ledger";
try {
  const files = readdirSync(`${root}/supabase/migrations`)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const expected = files.map((name) => name.split("_")[0]);
  const actual = sql(
    "postgres",
    "select version from supabase_migrations.schema_migrations order by version",
  )
    .split(/\r?\n/)
    .filter(Boolean);
  assert.deepEqual(
    actual,
    expected,
    "full checked-out migration ledger required",
  );
  assert.equal(
    sql(
      "postgres",
      `select count(*) from pg_database where datname='${database}'`,
    ),
    "0",
    "refusing existing contract database",
  );
  phase = "create_database";
  sql("postgres", `create database ${database}`);
  created = true;
  phase = "schema_export";
  const schema = docker([
    "exec",
    container,
    "pg_dump",
    "-U",
    "supabase_admin",
    "-d",
    "postgres",
    "--schema-only",
    "--no-publications",
    "--no-subscriptions",
  ]);
  phase = "schema_import";
  docker(
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "supabase_admin",
      "-d",
      database,
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    schema,
  );
  sql(
    database,
    "create table public.comun_radio_contract_fixture_guard(scope text not null);insert into public.comun_radio_contract_fixture_guard values('full_local_chain_schema_only')",
  );
  phase = "publication_contract";
  const output = execFileSync(
    process.execPath,
    ["scripts/radio-publication-contract.mjs"],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        COMUN_RADIO_CONTRACT_SCHEMA: "full_local_chain",
        COMUN_RADIO_CONTRACT_DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/${database}`,
      },
    },
  );
  const digest = createHash("sha256");
  for (const name of files)
    digest
      .update(name)
      .update("\0")
      .update(readFileSync(`${root}/supabase/migrations/${name}`))
      .update("\0");
  evidence = {
    ...JSON.parse(output),
    migrationCount: files.length,
    migrationChainSha256: digest.digest("hex"),
    productionSchemaVerified: false,
  };
} catch {
  process.stderr.write(
    `COMUN_RADIO_FULL_SCHEMA_CONTRACT_FAILED phase=${phase}\n`,
  );
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      sql("postgres", `drop database ${database} with (force)`);
    } catch {
      evidence = undefined;
      process.stderr.write("COMUN_RADIO_FULL_SCHEMA_CLEANUP_FAILED\n");
      process.exitCode = 1;
    }
  }
}
if (evidence && !process.exitCode)
  console.log(
    JSON.stringify({ ...evidence, cleanup: "dedicated_database_removed" }),
  );
