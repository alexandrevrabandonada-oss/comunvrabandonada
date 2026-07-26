import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

export const TARGET_RELEASE = "20260724233256-comun-sidewalk-operational-hardening";
export function resourceNames(roundId) {
  const suffix = `${roundId}-${randomUUID().replaceAll("-", "")}`;
  return { container: `supabase_db_scoped_${suffix}`, volume: `comun_scoped_${suffix}`, network: `comun_scoped_${suffix}` };
}
export function assertLocal({ backupDir, manifestPath, projectRef, dbUrl, localFlag }) {
  if (!localFlag || projectRef !== "LOCAL_VALIDATION" || dbUrl || !backupDir || path.resolve(backupDir).startsWith(path.resolve(".")) || !manifestPath?.replaceAll("\\", "/").startsWith("supabase/releases/")) throw new Error("SOLO_SCOPED_RECONCILIATION_REMOTE_FORBIDDEN");
}
const query = (commandRunner, sql) => commandRunner.run("psql", ["-XAt", "-v", "ON_ERROR_STOP=1", "-c", sql], { capture: true });
export async function runIndependentRound({ roundId, backupDir, manifestPath, discoveryMode, commandRunner, projectRef = "LOCAL_VALIDATION", dbUrl = "", localFlag = true }) {
  assertLocal({ backupDir, manifestPath, projectRef, dbUrl, localFlag });
  const resources = resourceNames(roundId); let result;
  try {
    await commandRunner.run("docker", ["network", "create", resources.network]);
    await commandRunner.run("docker", ["volume", "create", resources.volume]);
    await commandRunner.run("docker", ["run", "-d", "--name", resources.container, "--network", resources.network, "--mount", `source=${resources.volume},target=/var/lib/postgresql/data`, "postgres:17"]);
    await commandRunner.run("wait-ready", [resources.container]);
    await commandRunner.run("restore-schema", [resources.container, "public-schema.sql"]);
    await commandRunner.run("restore-data-copy", [resources.container, "public-data-copy.sql"]);
    const constraintsValid = (await query(commandRunner, "select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' and not c.convalidated;")) === "0";
    const sidewalkForeignKeys = Number(await query(commandRunner, "select count(*) from pg_constraint where conname like '%sidewalk_record_id_fkey';"));
    const ledgerAbsent = (await query(commandRunner, `select count(*) from public.comun_schema_releases where release='${TARGET_RELEASE}';`)) === "0";
    if (!constraintsValid || sidewalkForeignKeys !== 6 || !ledgerAbsent) throw new Error("COMUN_SCOPED_ROUND_PRECONDITION_FAILED");
    const pre = await commandRunner.run("capture-scoped-fingerprint", [resources.container, "pre"], { capture: true });
    await commandRunner.run("apply-local-migration", [resources.container, manifestPath, discoveryMode ? "discovery" : "verify"]);
    const post = await commandRunner.run("capture-scoped-fingerprint", [resources.container, "post"], { capture: true });
    const ledgerStatus = await query(commandRunner, `select status from public.comun_schema_releases where release='${TARGET_RELEASE}';`);
    if (ledgerStatus !== "applied") throw new Error("COMUN_SCOPED_ROUND_LEDGER_INVALID");
    result = { roundId, pre, post, migrationChecksum: createHash("sha256").update(TARGET_RELEASE).digest("hex"), constraintsValid, sidewalkForeignKeys, ledgerStatus, structuralCounts: { publicTables: Number(await query(commandRunner, "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';")) } };
  } finally {
    await Promise.allSettled([commandRunner.run("docker", ["rm", "-f", resources.container]), commandRunner.run("docker", ["volume", "rm", "-f", resources.volume]), commandRunner.run("docker", ["network", "rm", resources.network])]);
    if (result) result.cleanupComplete = true;
  }
  return result;
}
