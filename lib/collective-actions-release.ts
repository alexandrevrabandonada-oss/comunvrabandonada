import "server-only";

import { Client } from "pg";
import {
  COLLECTIVE_ACTIONS_PAUSED_MESSAGE,
  COLLECTIVE_ACTIONS_RELEASE,
  isCollectiveActionsReleaseEnabled,
} from "@/lib/collective-actions-release-contract";

export { COLLECTIVE_ACTIONS_PAUSED_MESSAGE } from "@/lib/collective-actions-release-contract";

async function readReleaseState() {
  const connectionString = process.env.COMUN_COLLECTIVE_ACTIONS_DATABASE_URL;
  if (!connectionString) return { ledger: null, tablesPresent: false };
  const client = new Client({ connectionString, connectionTimeoutMillis: 1_500, query_timeout: 1_500 });
  try {
    await client.connect();
    const [ledgerResult, tablesResult] = await Promise.all([
      client.query("select release, status, migration_path, migration_sha256 from public.comun_schema_releases where release = $1 limit 1", [COLLECTIVE_ACTIONS_RELEASE]),
      client.query("select count(*)::int as count from pg_catalog.pg_tables where schemaname = 'public' and tablename = any($1::text[])", [["comun_collective_actions", "comun_collective_action_participations", "comun_collective_action_tasks", "comun_collective_action_task_assignments", "comun_collective_action_updates", "comun_collective_action_sidewalk_records"]]),
    ]);
    return { ledger: ledgerResult.rows[0] ?? null, tablesPresent: tablesResult.rows[0]?.count === 6 };
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** Fail closed: the flag permits a bounded server-only verification, never enables alone. */
export async function getCollectiveActionsRelease() {
  if (process.env.COMUN_COLLECTIVE_ACTIONS_V1 !== "enabled") return { enabled: false as const };
  try {
    const state = await readReleaseState();
    return { enabled: isCollectiveActionsReleaseEnabled(process.env.COMUN_COLLECTIVE_ACTIONS_V1, state.ledger, state.tablesPresent) as boolean };
  } catch {
    return { enabled: false as const };
  }
}

export async function requireCollectiveActionsRelease() {
  if (!(await getCollectiveActionsRelease()).enabled) throw new Error(COLLECTIVE_ACTIONS_PAUSED_MESSAGE);
}
