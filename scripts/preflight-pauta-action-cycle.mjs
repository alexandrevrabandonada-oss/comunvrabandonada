import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

export const PAUTA_ACTION_CYCLE_MIGRATIONS = [
  "20260726133409",
  "20260726161426",
  "20260726171220",
  "20260730122000",
];

export const PAUTA_ACTION_CYCLE_MIGRATION_FILES = [
  "supabase/migrations/20260726133409_comun_collective_actions_foundation.sql",
  "supabase/migrations/20260726161426_comun_collective_action_member_journey.sql",
  "supabase/migrations/20260726171220_collective_action_administration_memory.sql",
  "supabase/migrations/20260730122000_comun_pauta_action_cycle.sql",
];

export function classifyPautaActionCyclePreflight(
  input,
  expectedMode = "before",
) {
  const applied = input.appliedVersions ?? [];
  const appliedCount = PAUTA_ACTION_CYCLE_MIGRATIONS.filter((version) =>
    applied.includes(version),
  ).length;
  const objectCount = Number(input.objectCount ?? 0);
  const expectedObjectCount = 11;
  const rlsCount = Number(input.rlsCount ?? 0);
  const functionPresent = input.functionPresent === true;
  if (expectedMode === "after") {
    if (
      appliedCount === PAUTA_ACTION_CYCLE_MIGRATIONS.length &&
      objectCount === expectedObjectCount &&
      rlsCount === expectedObjectCount &&
      functionPresent
    )
      return "APPLIED_EXACT";
    return "INCOMPATIBLE";
  }
  if (
    appliedCount === 0 &&
    objectCount === 0 &&
    rlsCount === 0 &&
    !functionPresent
  )
    return "ABSENT_READY";
  if (
    appliedCount === PAUTA_ACTION_CYCLE_MIGRATIONS.length &&
    objectCount === expectedObjectCount &&
    rlsCount === expectedObjectCount &&
    functionPresent
  )
    return "APPLIED_EXACT";
  return "PARTIAL_OR_INCOMPATIBLE";
}

export async function migrationHashes() {
  const result = {};
  for (const file of PAUTA_ACTION_CYCLE_MIGRATION_FILES) {
    const content = await readFile(file);
    result[path.basename(file)] = createHash("sha256")
      .update(content)
      .digest("hex");
  }
  return result;
}

export async function runPautaActionCyclePreflight({
  connectionString,
  expectedMode = "before",
  output,
}) {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
  });
  const tables = [
    "comun_collective_actions",
    "comun_collective_action_participations",
    "comun_collective_action_tasks",
    "comun_collective_action_task_assignments",
    "comun_collective_action_updates",
    "comun_collective_action_sidewalk_records",
    "comun_collective_action_forwardings",
    "comun_collective_action_memory_assets",
    "comun_pauta_decisions",
    "comun_pauta_action_cycles",
    "comun_pauta_action_cycle_events",
  ];
  try {
    await client.connect();
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction read only");
    const [history, objects, rls, routine] = await Promise.all([
      client.query(
        `select version
         from supabase_migrations.schema_migrations
         where version = any($1::text[])
         order by version`,
        [PAUTA_ACTION_CYCLE_MIGRATIONS],
      ),
      client.query(
        `select count(*)::int as count
         from pg_catalog.pg_tables
         where schemaname = 'public'
           and tablename = any($1::text[])`,
        [tables],
      ),
      client.query(
        `select count(*)::int as count
         from pg_catalog.pg_class relation
         join pg_catalog.pg_namespace namespace
           on namespace.oid = relation.relnamespace
         where namespace.nspname = 'public'
           and relation.relname = any($1::text[])
           and relation.relrowsecurity`,
        [tables],
      ),
      client.query(
        `select to_regprocedure(
          'public.comun_transition_pauta_action_cycle(uuid,integer,text,text,uuid,text,text,text)'
        ) is not null as present`,
      ),
    ]);
    await client.query("rollback");
    const observed = {
      appliedVersions: history.rows.map((row) => row.version),
      objectCount: objects.rows[0]?.count ?? 0,
      rlsCount: rls.rows[0]?.count ?? 0,
      functionPresent: routine.rows[0]?.present === true,
    };
    const classification = classifyPautaActionCyclePreflight(
      observed,
      expectedMode,
    );
    const artifact = {
      formatVersion: 1,
      expectedMode,
      classification,
      appliedTargetMigrations: observed.appliedVersions.length,
      expectedTargetMigrations: PAUTA_ACTION_CYCLE_MIGRATIONS.length,
      objectCount: observed.objectCount,
      expectedObjectCount: tables.length,
      rlsCount: observed.rlsCount,
      functionPresent: observed.functionPresent,
      migrationHashes: await migrationHashes(),
      databaseWrites: "none",
      containsSensitiveData: false,
    };
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    if (
      !["ABSENT_READY", "APPLIED_EXACT"].includes(classification) ||
      (expectedMode === "after" && classification !== "APPLIED_EXACT")
    )
      throw new Error("COMUN_PAUTA_ACTION_CYCLE_PREFLIGHT_BLOCKED");
    return artifact;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output =
    outputIndex >= 0
      ? process.argv[outputIndex + 1]
      : ".ci-artifacts/pauta-action-cycle-preflight/preflight.json";
  const modeIndex = process.argv.indexOf("--expected");
  const expectedMode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "before";
  const connectionString =
    process.env.COMUN_COLLECTIVE_ACTIONS_DATABASE_URL ??
    process.env.SUPABASE_DB_URL;
  if (!connectionString)
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_PREFLIGHT_DATABASE_MISSING");
  const artifact = await runPautaActionCyclePreflight({
    connectionString,
    expectedMode,
    output,
  });
  process.stdout.write(
    `COMUN_PAUTA_ACTION_CYCLE_PREFLIGHT_${artifact.classification}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `${String(error?.message ?? "COMUN_PAUTA_ACTION_CYCLE_PREFLIGHT_FAILED")}\n`,
    );
    process.exitCode = 1;
  });
}
