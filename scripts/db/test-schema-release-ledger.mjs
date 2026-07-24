import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const list = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
const container = list.stdout
  .split(/\r?\n/)
  .find((name) => name.startsWith("supabase_db_"));
if (!container) throw new Error("COMUN_SCHEMA_RELEASE_LEDGER_LOCAL_DB_REQUIRED");

const psql = (sql, stop = true) =>
  spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-At", ...(stop ? ["-v", "ON_ERROR_STOP=1"] : [])],
    { input: sql, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );

const state = psql(`
select count(*) from public.comun_schema_releases
where release='20260723220112-canonical-security-hardening' and status='applied';
set role anon;
select has_table_privilege(current_user,'public.comun_schema_releases','SELECT');
reset role;
set role authenticated;
select has_table_privilege(current_user,'public.comun_schema_releases','SELECT');
reset role;
`);
if (state.status !== 0 || state.stdout.trim().split(/\r?\n/).join("|") !== "1|SET|f|RESET|SET|f|RESET") {
  throw new Error(`COMUN_SCHEMA_RELEASE_LEDGER_STATE_INVALID:${state.stderr.trim()}`);
}

const migration = readFileSync(
  "supabase/migrations/20260723220112_comun_canonical_security_hardening.sql",
  "utf8",
);
const divergent = migration.replace(
  /^\s*begin;\s*/i,
  `begin;
select pg_catalog.set_config('comun.release_sha256', 'DIVERGENT', true);
select pg_catalog.set_config('comun.release_pre_fingerprint', 'LOCAL_VALIDATION', true);
select pg_catalog.set_config('comun.release_post_fingerprint', 'LOCAL_VALIDATION', true);
`,
);
const rejected = psql(divergent, true);
if (rejected.status === 0 || !rejected.stderr.includes("COMUN_SCHEMA_RELEASE_LEDGER_DIVERGENCE")) {
  throw new Error("COMUN_SCHEMA_RELEASE_LEDGER_DIVERGENCE_NOT_REJECTED");
}
const unchanged = psql(`
select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint
from public.comun_schema_releases
where release='20260723220112-canonical-security-hardening';
`);
if (unchanged.status !== 0 || unchanged.stdout.trim() !== "LOCAL_VALIDATION|LOCAL_VALIDATION|LOCAL_VALIDATION") {
  throw new Error("COMUN_SCHEMA_RELEASE_LEDGER_ROLLBACK_FAILED");
}
console.log("COMUN_SCHEMA_RELEASE_LEDGER_OK");
