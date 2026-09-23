import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  classifyLint,
  parseLintOutput,
} from "./run-production-db-lint-gate.mjs";
import {
  API_UNAVAILABLE,
  inspectPragmaCatalog,
  requireInstalledExtension,
  selectPragmaApi,
} from "./verify-search-sync-temp-table-lint.mjs";
import {
  requireDisposableUrl,
  validateLocalProof,
} from "./prove-search-sync-local-temp-table.mjs";

const known = [
  {
    function: "public.comun_sync_public_search_projection",
    issues: [
      {
        level: "error",
        sqlState: "42P01",
        message: 'relation "comun_search_candidates" does not exist',
        query: {
          text: "update comun_search_candidates set content_checksum = md5('x')",
        },
      },
    ],
  },
];

test("raw db lint parser accepts the CLI JSON array", () => {
  assert.deepEqual(
    parseLintOutput(
      `Connecting to remote database...\n${JSON.stringify(known)}`,
    ),
    known,
  );
  assert.throws(() => parseLintOutput("failed connection"), /OUTPUT_INVALID/);
});
test("only the exact temp-table finding can be classified as known", () => {
  assert.equal(classifyLint([]), "GREEN");
  assert.equal(classifyLint(known), "TEMP_TABLE_KNOWN");
  for (const changed of [
    [{ ...known[0], function: "public.other" }],
    [{ ...known[0], issues: [{ ...known[0].issues[0], sqlState: "42703" }] }],
    [
      {
        ...known[0],
        issues: [
          { ...known[0].issues[0], message: 'relation "other" does not exist' },
        ],
      },
    ],
    [
      {
        ...known[0],
        issues: [
          {
            ...known[0].issues[0],
            query: { text: "update missing_table set x=1" },
          },
        ],
      },
    ],
    [known[0], known[0]],
    [{ ...known[0], issues: [...known[0].issues, known[0].issues[0]] }],
  ])
    assert.equal(classifyLint(changed), "BLOCKED");
});
test("pragma API discovery fails closed when generator or checker option is absent", () => {
  assert.throws(
    () => requireInstalledExtension(null),
    new RegExp(API_UNAVAILABLE),
  );
  assert.deepEqual(requireInstalledExtension({ schema: "extensions" }), {
    schema: "extensions",
  });
  assert.throws(
    () => requireInstalledExtension({ schema: "extensions;drop" }),
    new RegExp(API_UNAVAILABLE),
  );
  assert.throws(() => selectPragmaApi([]), new RegExp(API_UNAVAILABLE));
  assert.throws(
    () =>
      selectPragmaApi([
        {
          name: "plpgsql_check_function_tb",
          firstArgument: "regprocedure",
          arguments: [],
        },
      ]),
    new RegExp(API_UNAVAILABLE),
  );
  assert.deepEqual(
    selectPragmaApi([
      {
        name: "plpgsql_make_pragma",
        firstArgument: "regprocedure",
        arguments: [],
      },
      {
        name: "plpgsql_check_function_tb",
        firstArgument: "regprocedure",
        arguments: ["pragmas"],
      },
    ]),
    { makeType: "regprocedure", checkType: "regprocedure" },
  );
  assert.throws(
    () =>
      selectPragmaApi([
        {
          name: "plpgsql_make_pragma",
          firstArgument: "regprocedure",
          arguments: [],
        },
        { name: "plpgsql_make_pragma", firstArgument: "text", arguments: [] },
        {
          name: "plpgsql_check_function_tb",
          firstArgument: "regprocedure",
          arguments: ["pragmas"],
        },
      ]),
    new RegExp(API_UNAVAILABLE),
  );
  assert.deepEqual(
    selectPragmaApi([
      {
        name: "plpgsql_make_pragma",
        firstArgument: "regprocedure",
        arguments: [],
      },
      { name: "plpgsql_make_pragma", firstArgument: "integer", arguments: [] },
      {
        name: "plpgsql_check_function_tb",
        firstArgument: "regprocedure",
        arguments: ["pragmas"],
      },
    ]),
    { makeType: "regprocedure", checkType: "regprocedure" },
  );
});

test("catalog inspection exposes only read-only capability and fails on malformed responses", async () => {
  const expected = {
    read_only: "on",
    postgres_version: "17.6",
    installed_extension: null,
    available_extension: { defaultVersion: "2.7", installedVersion: null },
    functions: [],
  };
  assert.deepEqual(
    await inspectPragmaCatalog({ query: async () => ({ rows: [expected] }) }),
    {
      readOnly: true,
      postgresVersion: "17.6",
      installedExtension: null,
      availableExtension: expected.available_extension,
      functions: [],
    },
  );
  await assert.rejects(
    inspectPragmaCatalog({
      query: async () => {
        throw new Error("catalog unavailable");
      },
    }),
    /catalog unavailable/,
  );
  await assert.rejects(
    inspectPragmaCatalog({
      query: async () => ({ rows: [{ ...expected, read_only: "off" }] }),
    }),
    /NOT_READ_ONLY/,
  );
});

test("disposable proof rejects remote targets, changed function, missing temp table, and real checker errors", () => {
  requireDisposableUrl(
    "postgresql://postgres@127.0.0.1:56532/comun_pr437_prodlike_post_35855343049",
  );
  assert.throws(
    () => requireDisposableUrl("postgresql://postgres@db.example.com/postgres"),
    /DISPOSABLE_TARGET_REQUIRED/,
  );
  const green = {
    status: "GREEN",
    definitionMatchesProduction: true,
    postgresVersion: "17.6",
    plpgsqlCheckVersion: "2.8",
    rawFindingExact: true,
    rawFindingCount: 3,
    tempTablePresent: true,
    runtimeSqlState: null,
    checkerErrors: 0,
    negativeFixtureDetected: true,
    countsRestored: true,
    tempTableRemoved: true,
    negativeFixtureRemoved: true,
  };
  assert.deepEqual(validateLocalProof(green), green);
  for (const change of [
    { status: "BLOCKED" },
    { definitionMatchesProduction: false },
    { postgresVersion: "16.0" },
    { plpgsqlCheckVersion: "unknown" },
    { rawFindingExact: false },
    { rawFindingCount: 0 },
    { tempTablePresent: false },
    { runtimeSqlState: "42P01" },
    { checkerErrors: 1 },
    { negativeFixtureDetected: false },
    { countsRestored: false },
    { tempTableRemoved: false },
    { negativeFixtureRemoved: false },
  ])
    assert.throws(
      () => validateLocalProof({ ...green, ...change }),
      /LOCAL_PROOF_INCOMPLETE/,
    );
});
test("recovery code keeps Production checkers read-only and preserves migration bytes", () => {
  const source = readFileSync(
    "scripts/solo/verify-search-sync-temp-table-lint.mjs",
    "utf8",
  );
  assert.match(source, /BEGIN READ ONLY/);
  assert.match(source, /transaction_read_only/);
  assert.doesNotMatch(
    source,
    /select public\.comun_sync_public_search_projection\(/i,
  );
  const workflow = readFileSync(
    ".github/workflows/comun-pr437-promotion-fingerprint.yml",
    "utf8",
  );
  assert.doesNotMatch(workflow, /workflow_dispatch|comun:promover/);
  assert.doesNotMatch(
    workflow,
    /supabase\/setup-cli|run-production-db-lint-gate|supabase db lint|CREATE EXTENSION/i,
  );
  assert.match(workflow, /COMUN_DB_LINT_REQUIRES_TRANSACTIONAL_EXTENSION/);
});
