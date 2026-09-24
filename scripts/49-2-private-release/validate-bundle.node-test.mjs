import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { validateBundle } from "./validate-bundle.mjs";

const manifest = JSON.parse(
  readFileSync(
    "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json",
  ),
);
const preBytes = readFileSync(
  "reports/current/comun-49-2-private-release-production-pre.json",
);
const derivedBytes = readFileSync(
  "reports/current/comun-49-2-private-release-disposable-derived.json",
);
const executorPrivilegesBytes = readFileSync(
  "reports/current/comun-49-2-private-release-executor-privileges.json",
);
const pre = {
  ...JSON.parse(preBytes),
  captureMainSha: "aabd5b45e880f703651a0ac361269f67d0f10f2c",
  captureRunId: "123456",
  captureRunAttempt: 1,
  bundleLedgerState: "ABSENT",
  bundleLedgerRowCount: 0,
};
const derived = JSON.parse(derivedBytes);
const executorPrivileges = JSON.parse(executorPrivilegesBytes);
const migrationBytes = manifest.migrations.map(({ path }) =>
  readFileSync(path),
);
const proof = {
  manifest,
  pre,
  derived,
  executorPrivileges,
  preBytes,
  derivedBytes,
  executorPrivilegesBytes,
  migrationBytes,
};

test("bundle binds the read-only Production PRE, disposable POST and both migration bytes", () => {
  assert.equal(validateBundle(proof).state, "PRE");
  for (const altered of [
    { manifest: { ...manifest, expectedPostFingerprint: "0".repeat(64) } },
    { manifest: { ...manifest, migrationSetSha256: "0".repeat(64) } },
    { manifest: { ...manifest, destructiveSql: true } },
    { pre: { ...pre, transactionReadOnly: "off" } },
    { pre: { ...pre, bundleLedgerState: undefined } },
    { pre: { ...pre, bundleLedgerState: "PRESENT_ACCEPTED", bundleLedgerRowCount: 1 } },
    { pre: { ...pre, bundleLedgerState: "PRESENT_MISMATCH", bundleLedgerRowCount: 1 } },
    { pre: { ...pre, bundleLedgerState: "ABSENT", bundleLedgerRowCount: 1 } },
    { derived: { ...derived, post: { ...derived.post, blockingFindings: 1 } } },
    {
      migrationBytes: [
        Buffer.from("begin; select 1; commit;"),
        migrationBytes[1],
      ],
    },
    { derivedBytes: Buffer.from("{}") },
    {
      executorPrivileges: {
        ...executorPrivileges,
        postgres: { ...executorPrivileges.postgres, privateCreate: false },
      },
    },
  ])
    assert.throws(
      () => validateBundle({ ...proof, ...altered }),
      /COMUN_49_2_PRIVATE_RELEASE_/,
    );
});

test("disposable logical ledger uses the bundle identity and exact fingerprints", () => {
  const sql = readFileSync(
    "scripts/49-2-private-release/prove-ledger.sql",
    "utf8",
  );
  for (const value of [
    manifest.release,
    manifest.releaseLedger.migrationPath,
    manifest.migrationSetSha256,
    manifest.expectedPreFingerprint,
    manifest.expectedPostFingerprint,
  ])
    assert.ok(sql.includes(`'${value}'`), value);
});

test("private runtime exposes no entity page or public HTTP endpoint", () => {
  assert.deepEqual(readdirSync("app/comun/entidades"), ["actions.ts"]);
  for (const file of readdirSync("app/api", { recursive: true })) {
    const path = String(file).replace(/\\/g, "/");
    if (!/route\.tsx?$/.test(path)) continue;
    const route = readFileSync(`app/api/${path}`, "utf8");
    assert.doesNotMatch(
      route,
      /comun_relata_collective_entity_server_|comun-collective-entity-runtime/i,
    );
  }
});
