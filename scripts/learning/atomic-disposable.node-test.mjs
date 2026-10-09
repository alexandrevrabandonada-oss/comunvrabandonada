import test from "node:test";
import assert from "node:assert/strict";
import {
  loadAtomicPackage,
  outsideSchool,
  requireAbsent,
  sameSnapshot,
  requireAtomicConnection,
  requireReleaseFingerprint,
} from "./atomic-disposable.mjs";

const pre = () => ({
  compact: {
    fingerprint: "canonical-pre",
    canonical: { migrations: [], relations: [], functions: [] },
    security: { blockingFindings: [] },
  },
  runner: "runner-pre",
  ledger: [],
});

const contract = {
  preCanonical: "a".repeat(64),
  preRunner: "b".repeat(64),
  postCanonical: "c".repeat(64),
  postRunner: "d".repeat(64),
};
for (const phase of ["pre", "post"]) {
  test(`reviewed ${phase} fingerprints accept only the exact pair`, () => {
    const snapshot = {
      compact: { fingerprint: contract[`${phase}Canonical`] },
      runner: contract[`${phase}Runner`],
    };
    requireReleaseFingerprint(snapshot, contract, phase);
    assert.throws(
      () =>
        requireReleaseFingerprint(
          { ...snapshot, compact: { fingerprint: "e".repeat(64) } },
          contract,
          phase,
        ),
      /LEARNING_RELEASE_CANONICAL_DIVERGED/,
    );
    assert.throws(
      () =>
        requireReleaseFingerprint(
          { ...snapshot, runner: "e".repeat(64) },
          contract,
          phase,
        ),
      /LEARNING_RELEASE_RUNNER_DIVERGED/,
    );
  });
  test(`missing or malformed ${phase} contract fails closed`, () => {
    for (const bad of [
      null,
      {},
      { ...contract, [`${phase}Canonical`]: "" },
      { ...contract, [`${phase}Runner`]: "unreviewed" },
    ])
      assert.throws(
        () => requireReleaseFingerprint(pre(), bad, phase),
        /LEARNING_RELEASE_CONTRACT_INVALID/,
      );
  });
}
test("pinned package removes only its outer transaction and remains blocked remotely", async () => {
  const { sql, packet } = await loadAtomicPackage();
  assert.equal(packet.remotePromotionAllowed, false);
  assert.equal(packet.promotionReady, false);
  assert.ok(sql.startsWith("-- Escola R0."));
  assert.ok(sql.includes("begin\n select * into m"));
  assert.ok(!/commit;\s*$/i.test(sql));
});
for (const section of ["history", "relation", "function", "ledger", "findings"])
  test(`partial/replay/findings block installation: ${section}`, () => {
    const snapshot = pre();
    if (section === "history")
      snapshot.compact.canonical.migrations.push("20261006134804");
    if (section === "relation")
      snapshot.compact.canonical.relations.push({
        name: "comun_learning_unknown",
      });
    if (section === "function")
      snapshot.compact.canonical.functions.push({
        name: "comun_learning_unknown",
      });
    if (section === "ledger")
      snapshot.ledger.push({ release: "20261006134804-comun-learning-r0" });
    if (section === "findings")
      snapshot.compact.security.blockingFindings.push({ rule: "RLS_DISABLED" });
    assert.throws(() => requireAbsent(snapshot));
  });
test("outside scope is determined by object ownership, not references or definition text", () => {
  const external = {
    table: "other_domain",
    definition: "references comun_learning_units",
  };
  assert.deepEqual(
    outsideSchool({
      constraints: [external, { table: "comun_learning_units" }],
      migrations: ["older", "20261006134804"],
      schemaGrants: [{ grantee: "anon" }],
    }),
    {
      constraints: [external],
      migrations: ["older"],
      schemaGrants: [{ grantee: "anon" }],
    },
  );
});
for (const section of ["canonical", "runner", "ledger"])
  test(`changed PRE cannot be substituted: ${section}`, () => {
    const actual = pre();
    if (section === "canonical") actual.compact.fingerprint = "changed";
    if (section === "runner") actual.runner = "changed";
    if (section === "ledger") actual.ledger.push({ release: "other" });
    assert.throws(() => sameSnapshot(actual, pre()));
  });

const local = {
  host: "127.0.0.1",
  port: 55432,
  database: "postgres",
  user: "postgres",
};
const confirmation = {
  COMUN_LEARNING_DISPOSABLE_AUTH: "true",
  COMUN_LEARNING_RUN_ID: "123-1",
};
test("atomic writes require confirmed dedicated local identity", () => {
  requireAtomicConnection({ connectionParameters: local }, confirmation);
  assert.throws(() =>
    requireAtomicConnection({ connectionParameters: local }, {}),
  );
});
for (const change of [
  { host: "remote.supabase.co" },
  { port: 5432 },
  { database: "production" },
  { user: "service_role" },
])
  test(`foreign destination is refused: ${Object.keys(change)[0]}`, () => {
    assert.throws(() =>
      requireAtomicConnection(
        { connectionParameters: { ...local, ...change } },
        confirmation,
      ),
    );
  });
test("remote credentials are rejected even with loopback identity", () => {
  assert.throws(() =>
    requireAtomicConnection(
      { connectionParameters: local },
      { ...confirmation, SUPABASE_DB_URL: "remote" },
    ),
  );
});
test("production-like database is bound to this exact disposable run", () => {
  requireAtomicConnection(
    {
      connectionParameters: {
        ...local,
        database: "comun_learning_prodlike_123_1",
      },
    },
    confirmation,
  );
  assert.throws(() =>
    requireAtomicConnection(
      {
        connectionParameters: {
          ...local,
          database: "comun_learning_prodlike_124_1",
        },
      },
      confirmation,
    ),
  );
});
test("fixture administrator is allowed only on the exact run database", () => {
  requireAtomicConnection(
    {
      connectionParameters: {
        ...local,
        user: "supabase_admin",
        database: "comun_learning_prodlike_123_1",
      },
    },
    confirmation,
  );
  assert.throws(() =>
    requireAtomicConnection(
      { connectionParameters: { ...local, user: "supabase_admin" } },
      confirmation,
    ),
  );
});
test("fixture privilege window never changes the session role across COMMIT", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    "scripts/learning/atomic-disposable.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /reset role/i);
  assert.equal(source.match(/set local role supabase_admin/g).length, 2);
});
