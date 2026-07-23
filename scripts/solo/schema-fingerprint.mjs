import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const container = process.argv.find((arg) => arg.startsWith("--container="))?.slice(12);
if (!container || !/^supabase_db_[A-Za-z0-9_.-]+$/.test(container)) throw new Error("SOLO_SCHEMA_CONTAINER_INVALID");
const sql = String.raw`
with objects as (
  select 'column' kind, c.table_name || '.' || c.column_name name,
    concat_ws('|', c.ordinal_position, c.data_type, c.udt_schema, c.udt_name, c.is_nullable, coalesce(c.column_default, '')) definition
  from information_schema.columns c where c.table_schema = 'public'
  union all
  select 'constraint', cls.relname || '.' || con.conname, pg_get_constraintdef(con.oid, true)
  from pg_constraint con join pg_class cls on cls.oid = con.conrelid join pg_namespace ns on ns.oid = cls.relnamespace
  where ns.nspname = 'public'
  union all
  select 'index', tablename || '.' || indexname, indexdef from pg_indexes where schemaname = 'public'
  union all
  select 'policy', tablename || '.' || policyname,
    concat_ws('|', permissive, array_to_string(roles, ','), cmd, coalesce(qual, ''), coalesce(with_check, ''))
  from pg_policies where schemaname = 'public'
  union all
  select 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', pg_get_functiondef(p.oid)
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public'
)
select kind || E'\t' || name || E'\t' || definition from objects order by kind, name, definition;
`;
const result = spawnSync("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-XAt", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
if (result.status !== 0) throw new Error("SOLO_SCHEMA_FINGERPRINT_QUERY_FAILED");
const normalized = result.stdout.replace(/\r\n/g, "\n").trimEnd();
if (!normalized) throw new Error("SOLO_SCHEMA_FINGERPRINT_EMPTY");
console.log(createHash("sha256").update(normalized).digest("hex"));
