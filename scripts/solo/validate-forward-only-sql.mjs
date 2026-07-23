import { buildTransactionalPackage } from "./sql-contract.mjs";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const releases = existsSync("supabase/releases")
  ? readdirSync("supabase/releases").filter((name) => name.endsWith(".json"))
  : [];
if (releases.length) {
  if (releases.length !== 1) throw new Error("SOLO_CANONICAL_RELEASE_COUNT_INVALID");
  const release = JSON.parse(readFileSync(path.join("supabase/releases", releases[0]), "utf8"));
  const migration = readFileSync(release.migration, "utf8");
  const checksum = createHash("sha256").update(migration).digest("hex");
  if (checksum !== release.migrationSha256) throw new Error("SOLO_CANONICAL_RELEASE_CHECKSUM_MISMATCH");
  const executable = migration
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:''|[^'])*'/g, "''");
  if (/\b(drop|truncate|delete)\b/i.test(executable)) throw new Error("SOLO_CANONICAL_RELEASE_DESTRUCTIVE_SQL");
  if (!migration.trimStart().startsWith("begin;") || !migration.trimEnd().endsWith("commit;")) {
    throw new Error("SOLO_CANONICAL_TRANSACTION_BOUNDARY_INVALID");
  }
  console.log("COMUN_CANONICAL_RELEASE_SQL_OK");
  process.exit(0);
}

const sql = buildTransactionalPackage();
if (!sql.startsWith("\\set ON_ERROR_STOP on\nBEGIN;") || !sql.endsWith("COMMIT;\n")) throw new Error("SOLO_TRANSACTION_BOUNDARY_INVALID");
console.log("COMUN_FORWARD_ONLY_SQL_OK");
