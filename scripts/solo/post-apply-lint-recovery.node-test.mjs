import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  classifyLint,
  parseLintOutput,
} from "./run-production-db-lint-gate.mjs";
import {
  API_UNAVAILABLE,
  selectPragmaApi,
} from "./verify-search-sync-temp-table-lint.mjs";

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
});
