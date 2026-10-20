import { createHash } from "node:crypto";
import { validateHardeningLedger } from "./readonly-reconciled-migration-plan.mjs";

const learning = "20261006134804_comun_learning_r0.sql";
const catalogHash =
  "79b965aeea23a3784e29956c24048dd610bad08b0d244471c077302581dc1bd6";
const manifestHash =
  "3b598bc6b3ea3dfe462ba205b6747016aace52de87c87dec332ecbb1a567d4de";
const lanes = new Set([
  "48-2-a",
  ...Array.from({ length: 6 }, (_, i) => `48-4-a${i + 1}`),
]);
const external = new Set([
  "20260724233256_comun_sidewalk_operational_hardening.sql",
  "20260922120000_comun_canonical_security_hardening_v2.sql",
]);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const refuse = () => {
  throw new Error("DOMAIN_MIGRATION_STATUS_NOT_ACCEPTED");
};

// Pure classifier only. Callers capture the complete unfiltered remote history in
// a verified-TLS read-only transaction, and hash every local SQL file. This is
// not migration permission or evidence that the global migration plan is empty.
export function validateDomainMigrationStatus({
  lane,
  localCatalog,
  remoteVersions,
  changedMigrations,
  hardeningManifest,
  hardeningRows,
  learningManifestBytes,
}) {
  if (
    !lanes.has(lane) ||
    !Array.isArray(changedMigrations) ||
    changedMigrations.length !== 0
  )
    refuse();
  if (!Array.isArray(localCatalog) || localCatalog.length !== 116) refuse();
  const catalog = localCatalog
    .map((entry) => {
      if (
        !entry ||
        Object.keys(entry).sort().join(",") !== "name,sha256" ||
        !/^\d{12}(?:\d{2})?_[a-z0-9_]+\.sql$/.test(entry.name) ||
        !/^[a-f0-9]{64}$/.test(entry.sha256)
      )
        refuse();
      return { name: entry.name, sha256: entry.sha256 };
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  // Pinning the full source catalog prevents a caller from silently removing a
  // local migration to make either drift or an unrelated pending plan disappear.
  if (digest(JSON.stringify(catalog)) !== catalogHash) refuse();
  if (!learningManifestBytes || digest(learningManifestBytes) !== manifestHash)
    refuse();
  let manifest;
  try {
    manifest = JSON.parse(learningManifestBytes.toString("utf8"));
  } catch {
    refuse();
  }
  if (
    manifest.migration !== `supabase/migrations/${learning}` ||
    manifest.remotePromotionAllowed !== false ||
    manifest.scope !== "local_candidate"
  )
    refuse();
  try {
    validateHardeningLedger(hardeningManifest, hardeningRows);
  } catch {
    refuse();
  }
  if (
    !Array.isArray(remoteVersions) ||
    remoteVersions.length === 0 ||
    remoteVersions.some(
      (version) =>
        typeof version !== "string" || !/^\d{12}(?:\d{2})?$/.test(version),
    ) ||
    new Set(remoteVersions).size !== remoteVersions.length
  )
    refuse();
  const known = new Map(catalog.map(({ name }) => [name.split("_")[0], name]));
  if (
    known.size !== catalog.length ||
    remoteVersions.some((version) => !known.has(version))
  )
    refuse();
  const remote = new Set(remoteVersions);
  const pendingAll = catalog
    .filter(({ name }) => !remote.has(name.split("_")[0]))
    .map(({ name }) => name);
  const pending = pendingAll.filter((name) => !external.has(name));
  // This exception is intentionally narrow: only the already canonical local
  // Escola candidate may remain pending. All owned or unknown pending work blocks.
  if (pending.length > 1 || (pending.length === 1 && pending[0] !== learning))
    refuse();
  return {
    state: pending.length
      ? "domain-current-with-deferred-learning"
      : "domain-current",
    lane,
    catalogSha256: catalogHash,
    pending,
    pendingBeforeReconciliation: pendingAll,
    reconciledExternal: pendingAll.filter((name) => external.has(name)),
    unknownRemoteVersions: [],
    changedMigrations: [],
    migrationHistoryCurrent: pendingAll.length === 0,
    globalMigrationPlanStatus: "NOT_CERTIFIED_BY_DOMAIN_CLASSIFIER",
    migrationExecutionAuthorized: false,
  };
}
