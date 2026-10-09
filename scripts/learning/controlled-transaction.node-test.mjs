import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  expectedCapabilities,
  requireExecutorScope,
  installControlledRehearsal,
  requireControlledConnection,
} from "./controlled-transaction.mjs";
import { digest } from "./production-pre.mjs";

const scope = {
  currentUser: "postgres",
  sessionUser: "postgres",
  databaseOwner: "postgres",
  publicSchemaOwner: "pg_database_owner",
  serverVersion: "17.6",
  searchPath: "public",
  executorCapabilities: expectedCapabilities,
};
test("dedicated local port/run accepts only its own lab, no Production secrets", () => {
  const env = {
    COMUN_LEARNING_CONTROLLED_REHEARSAL: "true",
    COMUN_LEARNING_DISPOSABLE_AUTH: "true",
    COMUN_LEARNING_RUN_ID: "123-1",
  };
  const connectionParameters = {
    host: "127.0.0.1",
    port: 55443,
    database: "comun_learning_prodlike_123_1",
    user: "postgres",
  };
  requireControlledConnection({ connectionParameters }, env);
  for (const change of [
    { port: 55432 },
    { host: "remote.supabase.co" },
    { database: "comun_learning_prodlike_124_1" },
    { user: "service_role" },
  ])
    assert.throws(() =>
      requireControlledConnection(
        { connectionParameters: { ...connectionParameters, ...change } },
        env,
      ),
    );
  assert.throws(() =>
    requireControlledConnection(
      { connectionParameters },
      { ...env, SUPABASE_DB_URL: "remote" },
    ),
  );
});
test("exact session and existing executor capabilities accepted", () =>
  requireExecutorScope(scope, scope));
for (const key of Object.keys(expectedCapabilities))
  test(`privilege drift rejected: ${key}`, () => {
    const capabilities = {
      ...expectedCapabilities,
      [key]:
        typeof expectedCapabilities[key] === "boolean"
          ? !expectedCapabilities[key]
          : "other",
    };
    assert.throws(
      () =>
        requireExecutorScope(
          { ...scope, executorCapabilities: capabilities },
          scope,
        ),
      /LEARNING_CONTROLLED_EXECUTOR_PRIVILEGES_REQUIRED/,
    );
  });
for (const key of [
  "currentUser",
  "sessionUser",
  "databaseOwner",
  "publicSchemaOwner",
  "serverVersion",
  "searchPath",
])
  test(`scope drift rejected: ${key}`, () =>
    assert.throws(() =>
      requireExecutorScope({ ...scope, [key]: "other" }, scope),
    ));

const contract = {
  preCanonical: "a".repeat(64),
  preRunner: "b".repeat(64),
  postCanonical: "c".repeat(64),
  postRunner: "d".repeat(64),
};
const capture = {
  privateCatalog: {},
  privateCatalogSha256: digest({}),
  transactionReadOnly: true,
  schemaWrites: 0,
  ledgerWrites: 0,
  snapshot: {
    compact: { fingerprint: contract.preCanonical },
    runner: contract.preRunner,
  },
  scope,
};
test("remote destination refused before any query even with a valid-looking capture", async () => {
  let calls = 0;
  const db = {
    connectionParameters: { host: "remote.supabase.co" },
    query: () => {
      calls++;
    },
  };
  await assert.rejects(() => installControlledRehearsal(db, capture, contract));
  assert.equal(calls, 0);
});
test("rehearsal preserves the manifest and never lends privileges", async () => {
  const source = await readFile(
    "scripts/learning/controlled-transaction.mjs",
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\bgrant\s|\brevoke\s|set local role|SUPABASE_DB_URL|process\.argv|remotePromotionAllowed\s*=/i,
  );
  assert.ok(
    source.indexOf("LEARNING_CONTROLLED_PRIVATE_POST_DRIFT") <
      source.indexOf("commitStarted = true"),
  );
  assert.match(
    source,
    /COMMIT_OUTCOME_UNKNOWN_REQUIRE_READ_ONLY_RECONCILIATION/,
  );
  assert.match(source, /ROLLBACK_UNCONFIRMED/);
});
