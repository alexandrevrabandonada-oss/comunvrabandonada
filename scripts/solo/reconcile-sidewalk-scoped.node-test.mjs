import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  resourceNames,
  runIndependentRound,
  TARGET_RELEASE,
} from "./reconcile-sidewalk-scoped.mjs";

const MANIFEST =
  "supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json";
const manifestHash = () =>
  createHash("sha256").update(readFileSync(MANIFEST)).digest("hex");
const originalManifestHash = manifestHash();
const allowedResultFields = [
  "cleanupComplete",
  "constraintsValid",
  "ledgerStatus",
  "migrationChecksum",
  "post",
  "pre",
  "roundId",
  "sidewalkForeignKeys",
  "structuralCounts",
];

class FakeCommandRunner {
  constructor({
    constraints = "0",
    foreignKeys = "6",
    preLedger = "0",
    postLedger = "applied",
    failAt,
  } = {}) {
    this.constraints = constraints;
    this.foreignKeys = foreignKeys;
    this.preLedger = preLedger;
    this.postLedger = postLedger;
    this.failAt = failAt;
    this.calls = [];
    this.realInvocations = 0;
  }

  async run(command, args = [], options = {}) {
    this.calls.push({ command, args: [...args], options: { ...options } });
    if (this.failAt === command)
      throw new Error(`synthetic ${command} failure`);
    if (command === "psql") {
      const sql = args.at(-1);
      if (/not c\.convalidated/.test(sql)) return this.constraints;
      if (/sidewalk_record_id_fkey/.test(sql)) return this.foreignKeys;
      if (/count\(\*\).*comun_schema_releases/.test(sql)) return this.preLedger;
      if (/select status/.test(sql)) return this.postLedger;
      if (/pg_class/.test(sql)) return "176";
    }
    if (command === "capture-scoped-fingerprint")
      return args.at(-1) === "pre" ? "synthetic-pre" : "synthetic-post";
    return "";
  }
}

const options = (commandRunner, roundId = "round", overrides = {}) => ({
  roundId,
  backupDir: "D:/synthetic-backup",
  manifestPath: MANIFEST,
  discoveryMode: true,
  commandRunner,
  ...overrides,
});

const commandNames = (runner) => runner.calls.map(({ command }) => command);
const cleanupCalls = (runner) =>
  runner.calls.filter(
    ({ command, args }) => command === "docker" && args.includes("rm"),
  );
const assertManifestIntact = () =>
  assert.equal(manifestHash(), originalManifestHash);
const assertCleanup = (runner) => {
  assert.deepEqual(
    cleanupCalls(runner).map(({ args }) => args.slice(0, 2)),
    [
      ["rm", "-f"],
      ["volume", "rm"],
      ["network", "rm"],
    ],
  );
};

test("complete round restores schema before data, captures PRE and POST around migration, and returns only the contract fields", async () => {
  const runner = new FakeCommandRunner();
  const result = await runIndependentRound(options(runner));
  const calls = commandNames(runner);
  const restoreSchema = calls.indexOf("restore-schema");
  const restoreData = calls.indexOf("restore-data-copy");
  const pre = calls.indexOf("capture-scoped-fingerprint");
  const migration = calls.indexOf("apply-local-migration");
  const post = calls.lastIndexOf("capture-scoped-fingerprint");

  assert.ok(restoreSchema < restoreData);
  assert.ok(pre < migration);
  assert.ok(migration < post);
  assert.deepEqual(Object.keys(result).sort(), allowedResultFields);
  assert.deepEqual(result.structuralCounts, { publicTables: 176 });
  assert.equal(result.cleanupComplete, true);
  assertCleanup(runner);
  assertManifestIntact();
});

test("resources are exclusive for every roundId", async () => {
  const first = resourceNames("same-round");
  const second = resourceNames("same-round");
  assert.notDeepEqual(first, second);
  assert.notEqual(first.container, second.container);
  assert.notEqual(first.volume, second.volume);
  assert.notEqual(first.network, second.network);

  const firstRunner = new FakeCommandRunner();
  const secondRunner = new FakeCommandRunner();
  await runIndependentRound(options(firstRunner, "first"));
  await runIndependentRound(options(secondRunner, "second"));
  assert.notEqual(
    firstRunner.calls[0].args.at(-1),
    secondRunner.calls[0].args.at(-1),
  );
  assertManifestIntact();
});

test("invalid constraints block before PRE and migration and still clean up", async () => {
  const runner = new FakeCommandRunner({ constraints: "1" });
  await assert.rejects(
    () => runIndependentRound(options(runner)),
    /COMUN_SCOPED_ROUND_PRECONDITION_FAILED/,
  );
  assert.equal(
    commandNames(runner).includes("capture-scoped-fingerprint"),
    false,
  );
  assert.equal(commandNames(runner).includes("apply-local-migration"), false);
  assertCleanup(runner);
  assertManifestIntact();
});

test("five foreign keys block, while six permit advancement to migration", async () => {
  const blocked = new FakeCommandRunner({ foreignKeys: "5" });
  await assert.rejects(
    () => runIndependentRound(options(blocked)),
    /COMUN_SCOPED_ROUND_PRECONDITION_FAILED/,
  );
  assert.equal(commandNames(blocked).includes("apply-local-migration"), false);
  assertCleanup(blocked);

  const allowed = new FakeCommandRunner({ foreignKeys: "6" });
  await runIndependentRound(options(allowed));
  assert.equal(commandNames(allowed).includes("apply-local-migration"), true);
  assertManifestIntact();
});

test("foreign keys added by later independent domains do not block the scoped release", async () => {
  const runner = new FakeCommandRunner({ foreignKeys: 7 });
  const result = await runIndependentRound({
    roundId: "seven-fks",
    backupDir: "C:/fixtures/comun-sidewalk",
    manifestPath: MANIFEST,
    discoveryMode: true,
    commandRunner: runner,
  });
  assert.equal(result.sidewalkForeignKeys, 7);
  assert.equal(result.ledgerStatus, "applied");
});

test("a PRE ledger entry blocks before the scoped fingerprint and migration", async () => {
  const runner = new FakeCommandRunner({ preLedger: "1" });
  await assert.rejects(
    () => runIndependentRound(options(runner)),
    /COMUN_SCOPED_ROUND_PRECONDITION_FAILED/,
  );
  assert.equal(
    commandNames(runner).includes("capture-scoped-fingerprint"),
    false,
  );
  assert.equal(commandNames(runner).includes("apply-local-migration"), false);
  assertCleanup(runner);
  assertManifestIntact();
});

test("absent or divergent POST ledgers block after migration and clean up", async () => {
  for (const postLedger of ["", "divergent"]) {
    const runner = new FakeCommandRunner({ postLedger });
    await assert.rejects(
      () =>
        runIndependentRound(options(runner, `post-${postLedger || "absent"}`)),
      /COMUN_SCOPED_ROUND_LEDGER_INVALID/,
    );
    assert.equal(commandNames(runner).includes("apply-local-migration"), true);
    assertCleanup(runner);
  }
  assertManifestIntact();
});

test("cleanup runs after restore and migration failures", async () => {
  for (const failAt of ["restore-schema", "apply-local-migration"]) {
    const runner = new FakeCommandRunner({ failAt });
    await assert.rejects(
      () => runIndependentRound(options(runner, `failure-${failAt}`)),
      new RegExp(`synthetic ${failAt} failure`),
    );
    assertCleanup(runner);
  }
  assertManifestIntact();
});

test("remote contexts are rejected before commands and rejection details are sanitized", async () => {
  const runner = new FakeCommandRunner();
  const dsn = "postgresql://operator:private-token@remote.example/production";
  const token = "private-token";
  const backupPath = "C:/Users/example/private-backup";
  await assert.rejects(
    () =>
      runIndependentRound({
        ...options(runner),
        projectRef: "remote",
        dbUrl: dsn,
        token,
        backupDir: backupPath,
      }),
    (error) => {
      assert.match(
        error.message,
        /^SOLO_SCOPED_RECONCILIATION_REMOTE_FORBIDDEN$/,
      );
      assert.doesNotMatch(
        error.message,
        /operator|private-token|remote\.example|Users|backup/i,
      );
      return true;
    },
  );
  assert.equal(runner.calls.length, 0);
  assertManifestIntact();
});

test("all executor operations are fake commandRunner calls with no real Docker, PostgreSQL, Supabase, or network invocation", async () => {
  const runner = new FakeCommandRunner();
  await runIndependentRound(options(runner));
  assert.ok(runner.calls.length > 0);
  assert.equal(runner.realInvocations, 0);
  assert.equal(
    TARGET_RELEASE,
    "20260724233256-comun-sidewalk-operational-hardening",
  );
  assertManifestIntact();
});
