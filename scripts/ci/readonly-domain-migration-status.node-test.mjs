import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { validateDomainMigrationStatus } from "./readonly-domain-migration-status.mjs";
const localCatalog = readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"))
  .map((name) => ({
    name,
    sha256: createHash("sha256")
      .update(readFileSync(`supabase/migrations/${name}`))
      .digest("hex"),
  }));
const hardeningManifest = JSON.parse(
  readFileSync(
    "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
    "utf8",
  ),
);
const hardeningRows = [
  {
    release: hardeningManifest.release,
    migration_path: hardeningManifest.migration,
    migration_sha256: hardeningManifest.migrationSha256,
    pre_fingerprint: hardeningManifest.expectedPreFingerprint,
    post_fingerprint: hardeningManifest.expectedPostFingerprint,
    status: "applied",
  },
];
const all = localCatalog.map(({ name }) => name.split("_")[0]);
const base = {
  lane: "48-2-a",
  localCatalog,
  remoteVersions: all.filter(
    (version) =>
      !["20261006134804", "20260724233256", "20260922120000"].includes(version),
  ),
  changedMigrations: [],
  hardeningManifest,
  hardeningRows,
  learningManifestBytes: readFileSync(
    "supabase/releases/20261006134804-comun-learning-r0.json",
  ),
};
test("seven historical domains preserve the exact deferred migration and external reconciliation", () => {
  for (const lane of [
    "48-2-a",
    "48-4-a1",
    "48-4-a2",
    "48-4-a3",
    "48-4-a4",
    "48-4-a5",
    "48-4-a6",
  ]) {
    const status = validateDomainMigrationStatus({ ...base, lane });
    assert.equal(status.state, "domain-current-with-deferred-learning");
    assert.deepEqual(status.pending, ["20261006134804_comun_learning_r0.sql"]);
    assert.equal(status.pendingBeforeReconciliation.length, 3);
    assert.equal(status.reconciledExternal.length, 2);
    assert.equal(status.migrationHistoryCurrent, false);
    assert.equal(status.migrationExecutionAuthorized, false);
  }
});
test("a fully current catalog is separately labeled", () => {
  const status = validateDomainMigrationStatus({
    ...base,
    remoteVersions: all,
  });
  assert.equal(status.state, "domain-current");
  assert.equal(status.migrationHistoryCurrent, true);
});
test("unknown, duplicate, malformed or empty remote history is refused without disclosure", () => {
  for (const remoteVersions of [
    [],
    [...base.remoteVersions, "20990101000000"],
    [...base.remoteVersions, base.remoteVersions[0]],
    [...base.remoteVersions, "postgresql://secret.invalid"],
    [...base.remoteVersions, ""],
    undefined,
  ])
    assert.throws(
      () => validateDomainMigrationStatus({ ...base, remoteVersions }),
      { message: "DOMAIN_MIGRATION_STATUS_NOT_ACCEPTED" },
    );
});
test("missing owned migrations refuse even with valid Escola proof", () => {
  assert.throws(() =>
    validateDomainMigrationStatus({
      ...base,
      remoteVersions: base.remoteVersions.filter(
        (version) => version !== "20260815184529",
      ),
    }),
  );
});
test("full source catalog cannot omit, add, rename, or change migration bytes", () => {
  for (const localCatalog of [
    base.localCatalog.slice(1),
    [...base.localCatalog, base.localCatalog[0]],
    base.localCatalog.map((entry, index) =>
      index ? entry : { ...entry, sha256: "0".repeat(64) },
    ),
    base.localCatalog.map((entry, index) =>
      index ? entry : { ...entry, name: "20990101000000_unknown.sql" },
    ),
  ])
    assert.throws(() =>
      validateDomainMigrationStatus({ ...base, localCatalog }),
    );
});
test("changed migrations and unlisted lanes cannot use this read-only exemption", () => {
  for (const changedMigrations of [
    ["supabase/migrations/20261006134804_comun_learning_r0.sql"],
    ["supabase/migrations/20990101000000_new.sql"],
    undefined,
  ])
    assert.throws(() =>
      validateDomainMigrationStatus({ ...base, changedMigrations }),
    );
  for (const lane of ["learning-r0", "48-4-a7", undefined])
    assert.throws(() => validateDomainMigrationStatus({ ...base, lane }));
});
test("hardening ledger and deferred manifest retain byte-exact gates", () => {
  for (const overrides of [
    { hardeningRows: [] },
    { hardeningRows: [...hardeningRows, ...hardeningRows] },
    { hardeningRows: [{ ...hardeningRows[0], status: "pending" }] },
    { hardeningManifest: { ...hardeningManifest, migrationSha256: "changed" } },
    { learningManifestBytes: Buffer.from("{}") },
    { learningManifestBytes: undefined },
  ])
    assert.throws(() =>
      validateDomainMigrationStatus({ ...base, ...overrides }),
    );
});
