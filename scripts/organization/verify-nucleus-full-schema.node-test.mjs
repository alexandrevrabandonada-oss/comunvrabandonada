import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertHostedLab,
  assertLocalDatabase,
} from "./verify-nucleus-full-schema.mjs";

test("structural lab refuses local or self-hosted execution and another workspace", () => {
  const env = {
    GITHUB_ACTIONS: "true",
    RUNNER_ENVIRONMENT: "github-hosted",
    GITHUB_WORKSPACE: process.cwd(),
    EXPECTED_SHA: "a".repeat(40),
  };
  assert.doesNotThrow(() => assertHostedLab(env, process.cwd()));
  for (const change of [
    { GITHUB_ACTIONS: "false" },
    { RUNNER_ENVIRONMENT: "self-hosted" },
    { GITHUB_WORKSPACE: process.cwd() + "/other" },
    { GITHUB_WORKSPACE: undefined },
    { EXPECTED_SHA: "main" },
  ])
    assert.throws(() => assertHostedLab({ ...env, ...change }, process.cwd()));
});

test("structural lab accepts only the fixed local PostgreSQL service", () => {
  for (const host of ["127.0.0.1", "localhost"])
    assert.doesNotThrow(() =>
      assertLocalDatabase(
        `postgresql://postgres:synthetic@${host}:55432/postgres`,
      ),
    );
  for (const url of [
    "postgresql://postgres:synthetic@remote.example:55432/postgres",
    "postgresql://postgres:synthetic@127.0.0.1:5432/postgres",
    "postgresql://postgres:synthetic@127.0.0.1:55432/other",
    "postgresql://other:synthetic@127.0.0.1:55432/postgres",
    "postgresql://postgres:synthetic@127.0.0.1:55432/postgres?host=remote.example",
    "postgresql://postgres:synthetic@127.0.0.1:55432/postgres#other",
    "https://127.0.0.1:55432/postgres",
  ])
    assert.throws(() => assertLocalDatabase(url));
});
