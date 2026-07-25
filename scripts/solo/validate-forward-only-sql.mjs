import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTransactionalPackage } from "./sql-contract.mjs";

const root = path.resolve("supabase/releases");
const marker = (name) => { throw new Error(name); };
const arg = process.argv.find((value) => value.startsWith("--release-manifest="));
const ALLOWED_PUBLIC_SUMMARY_NULLABILITY = "alter table public.comun_sidewalk_records alter column public_summary drop not null";
const ALLOWED_LEGACY_GRANT_REPAIR = "revoke trigger, truncate on table public.comun_actions, public.comun_admin_audit_log, public.comun_admin_users, public.comun_communities, public.comun_dossiers, public.comun_issues, public.comun_pauta_evidence_items, public.comun_pauta_spaces, public.comun_pauta_tasks, public.comun_public_lookup_events, public.comun_report_attachments, public.comun_reports from anon, authenticated";
const OPERATIONAL_HARDENING_RELEASE = "20260724233256-comun-sidewalk-operational-hardening";

export function selectReleaseManifest(value = arg?.slice(19) ?? process.env.COMUN_RELEASE_MANIFEST) {
  if (!value) {
    const base = process.env.COMUN_RELEASE_BASE ?? "origin/main";
    const changed = execFileSync("git", ["diff", "--name-status", `${base}...HEAD`, "--", "supabase/releases"], { encoding: "utf8" })
      .trim().split(/\r?\n/).filter(Boolean);
    if (changed.some((line) => /^[DR]/.test(line))) marker("SOLO_RELEASE_MANIFEST_PATH_INVALID");
    const manifests = changed.map((line) => line.split(/\s+/).at(-1)).filter((name) => name?.endsWith(".json"));
    if (manifests.length !== 1) marker("SOLO_RELEASE_MANIFEST_COUNT_INVALID");
    value = `supabase/releases/${manifests[0]}`;
  }
  if (path.isAbsolute(value)) marker("SOLO_RELEASE_MANIFEST_PATH_INVALID");
  const absolute = path.resolve(value);
  if (!value.endsWith(".json") || !absolute.startsWith(`${root}${path.sep}`)) marker("SOLO_RELEASE_MANIFEST_PATH_INVALID");
  if (!existsSync(absolute)) marker("SOLO_RELEASE_MANIFEST_NOT_FOUND");
  return absolute;
}

export function validateForwardOnlySqlText(release, migration) {
  if (release.destructiveSql !== false || release.expectedBlockingFindings !== 0 || release.platformObservationsAllowed !== true || release.releaseLedger !== "public.comun_schema_releases") marker("SOLO_CANONICAL_RELEASE_SECURITY_CONTRACT_INVALID");
  const trimmed = migration.trim();
  if (!/^begin;[\s\S]*commit;$/i.test(trimmed) || (trimmed.match(/\bbegin;/gi) ?? []).length !== 1 || (trimmed.match(/\bcommit;/gi) ?? []).length !== 1) marker("SOLO_CANONICAL_TRANSACTION_BOUNDARY_INVALID");
  const executable = migration.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/'(?:''|[^'])*'/g, "''");
  const normalized = executable.replace(/\s+/g, " ").trim().toLowerCase();
  const requiresLegacyGrantRepair = release.release === OPERATIONAL_HARDENING_RELEASE;
  const allowedStatements = [
    ALLOWED_PUBLIC_SUMMARY_NULLABILITY,
    ...(requiresLegacyGrantRepair ? [ALLOWED_LEGACY_GRANT_REPAIR] : []),
  ];
  if ((normalized.match(new RegExp(ALLOWED_PUBLIC_SUMMARY_NULLABILITY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length !== 1) marker("SOLO_PUBLIC_SUMMARY_NULLABILITY_EXCEPTION_INVALID");
  if (requiresLegacyGrantRepair && (normalized.match(new RegExp(ALLOWED_LEGACY_GRANT_REPAIR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length !== 1) marker("SOLO_LEGACY_GRANT_REPAIR_EXCEPTION_INVALID");
  const remaining = allowedStatements.reduce((text, statement) => text.replace(statement, ""), normalized);
  if (/\b(drop|truncate|delete)\b|\bcascade\b|\bexecute\s+(immediate|format)\b/i.test(remaining)) marker("SOLO_CANONICAL_RELEASE_DESTRUCTIVE_SQL");
}

export function validateReleaseSql(manifestPath = selectReleaseManifest()) {
  const release = JSON.parse(readFileSync(manifestPath, "utf8"));
  const migrationPath = path.resolve(release.migration ?? "");
  if (!migrationPath.startsWith(`${path.resolve("supabase/migrations")}${path.sep}`) || !existsSync(migrationPath)) marker("SOLO_RELEASE_MANIFEST_NOT_FOUND");
  const migration = readFileSync(migrationPath, "utf8");
  if (release.migrationSha256 !== "PENDING_LOCAL_RECONCILIATION" && createHash("sha256").update(migration).digest("hex") !== release.migrationSha256) marker("SOLO_CANONICAL_RELEASE_CHECKSUM_MISMATCH");
  validateForwardOnlySqlText(release, migration);
  return { release, migration, manifestPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const selected = process.argv.includes("--release-manifest") ? process.argv[process.argv.indexOf("--release-manifest") + 1] : undefined;
  validateReleaseSql(selected ? selectReleaseManifest(selected) : undefined);
  console.log("COMUN_CANONICAL_RELEASE_SQL_OK");
} else if (process.argv[1]?.endsWith("validate-forward-only-sql.mjs")) {
  validateReleaseSql();
  console.log("COMUN_CANONICAL_RELEASE_SQL_OK");
} else {
  const sql = buildTransactionalPackage();
  if (!sql.startsWith("\\set ON_ERROR_STOP on\nBEGIN;") || !sql.endsWith("COMMIT;\n")) marker("SOLO_TRANSACTION_BOUNDARY_INVALID");
}
