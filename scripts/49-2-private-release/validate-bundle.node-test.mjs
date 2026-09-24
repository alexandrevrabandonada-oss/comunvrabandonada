import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const pre = JSON.parse(preBytes);
const derived = JSON.parse(derivedBytes);
const migrationBytes = manifest.migrations.map(({ path }) =>
  readFileSync(path),
);
const proof = {
  manifest,
  pre,
  derived,
  preBytes,
  derivedBytes,
  migrationBytes,
};

test("bundle binds the read-only Production PRE, disposable POST and both migration bytes", () => {
  assert.equal(validateBundle(proof).state, "PRE");
  for (const altered of [
    { manifest: { ...manifest, expectedPostFingerprint: "0".repeat(64) } },
    { manifest: { ...manifest, migrationSetSha256: "0".repeat(64) } },
    { manifest: { ...manifest, destructiveSql: true } },
    { pre: { ...pre, transactionReadOnly: "off" } },
    { derived: { ...derived, post: { ...derived.post, blockingFindings: 1 } } },
    {
      migrationBytes: [
        Buffer.from("begin; select 1; commit;"),
        migrationBytes[1],
      ],
    },
    { derivedBytes: Buffer.from("{}") },
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
