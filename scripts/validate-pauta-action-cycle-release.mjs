import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PAUTA_ACTION_CYCLE_MIGRATION_FILES,
  PAUTA_ACTION_CYCLE_MIGRATIONS,
} from "./preflight-pauta-action-cycle.mjs";

export const PAUTA_ACTION_CYCLE_RELEASE_MANIFEST =
  "supabase/releases/20260730122000-comun-pauta-action-cycle.json";

const destructiveSql = /\b(drop\s+(table|column)|truncate|delete\s+from)\b/i;
const connectionSensitivePattern =
  /postgres(?:ql)?:\/\/|authorization\s*:|password\s*[:=]|eyJ[a-zA-Z0-9_-]{20,}/i;
const manifestSensitivePattern = new RegExp(
  `${connectionSensitivePattern.source}|service_role`,
  "i",
);

export async function validatePautaActionCycleRelease(
  manifestPath = PAUTA_ACTION_CYCLE_RELEASE_MANIFEST,
) {
  if (manifestPath !== PAUTA_ACTION_CYCLE_RELEASE_MANIFEST)
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_RELEASE_PATH_BLOCKED");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    manifest.release !== "20260730122000-comun-pauta-action-cycle" ||
    manifest.releaseLedger !== "supabase_migrations.schema_migrations" ||
    manifest.destructiveSql !== false ||
    manifest.expectedBlockingFindings !== 0 ||
    manifest.featureFlag !== "COMUN_COLLECTIVE_ACTIONS_V1"
  )
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_RELEASE_CONTRACT_INVALID");
  const paths = (manifest.migrations ?? []).map((migration) => migration.path);
  if (
    JSON.stringify(paths) !== JSON.stringify(PAUTA_ACTION_CYCLE_MIGRATION_FILES)
  )
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_RELEASE_MIGRATIONS_INVALID");
  if (
    paths.map((file) => path.basename(file).slice(0, 14)).join(",") !==
    PAUTA_ACTION_CYCLE_MIGRATIONS.join(",")
  )
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_RELEASE_ORDER_INVALID");

  for (const migration of manifest.migrations) {
    const sql = await readFile(migration.path, "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    if (hash !== migration.sha256)
      throw new Error("COMUN_PAUTA_ACTION_CYCLE_RELEASE_CHECKSUM_MISMATCH");
    if (destructiveSql.test(sql))
      throw new Error("COMUN_PAUTA_ACTION_CYCLE_DESTRUCTIVE_SQL_BLOCKED");
    if (connectionSensitivePattern.test(sql))
      throw new Error("COMUN_PAUTA_ACTION_CYCLE_RELEASE_SENSITIVE_DATA");
  }
  if (manifestSensitivePattern.test(JSON.stringify(manifest)))
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_RELEASE_SENSITIVE_DATA");
  return {
    release: manifest.release,
    migrationCount: manifest.migrations.length,
    expectedObjects: manifest.expectedObjects,
    expectedRlsObjects: manifest.expectedRlsObjects,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validatePautaActionCycleRelease()
    .then(() =>
      process.stdout.write("COMUN_PAUTA_ACTION_CYCLE_RELEASE_CONTRACT_GREEN\n"),
    )
    .catch((error) => {
      process.stderr.write(`${String(error?.message ?? "RELEASE_FAILED")}\n`);
      process.exitCode = 1;
    });
}
