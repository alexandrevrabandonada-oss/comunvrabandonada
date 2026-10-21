import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MAX_ATTEMPTS,
  MAX_BACKOFF_MS,
  classifyTransientStatusFailure,
  hasRequiredLocalEnv,
  isMainModule,
  readSupabaseLocalEnv,
} from "./read-supabase-local-env.mjs";

const sensitiveEnv = [
  'API_URL="http://127.0.0.1:54321"',
  'ANON_KEY="anon-secret"',
  'SERVICE_ROLE_KEY="service-role-secret"',
  'DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"',
].join("\n");

function sequence(results) {
  let calls = 0;
  return {
    invoke: () => results[calls++] ?? results.at(-1),
    calls: () => calls,
  };
}

function run(results) {
  const source = sequence(results);
  const diagnostics = [];
  const delays = [];
  const value = readSupabaseLocalEnv({
    invoke: source.invoke,
    sleep: (milliseconds) => delays.push(milliseconds),
    diagnostics: (line) => diagnostics.push(line),
  });
  return { ...value, calls: source.calls(), diagnostics, delays };
}

const upstream502 = {
  status: 1,
  stdout: "",
  stderr:
    'Error status 502: {"message":"An invalid response was received from the upstream server"}',
};

test("returns local env on the first successful status call", () => {
  const result = run([{ status: 0, stdout: sensitiveEnv, stderr: "" }]);
  assert.equal(result.ok, true);
  assert.equal(result.calls, 1);
  assert.equal(result.diagnostics.length, 0);
});

test("retries an allowlisted 502 once and succeeds", () => {
  const result = run([
    upstream502,
    { status: 0, stdout: sensitiveEnv, stderr: "" },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.calls, 2);
  assert.deepEqual(result.delays, [2000]);
  assert.deepEqual(result.diagnostics, [
    "COMUN_SUPABASE_LOCAL_STATUS_TRANSIENT_RETRY",
    "attempt=1",
    "class=UPSTREAM_502",
  ]);
});

test("exhausts only the bounded allowlisted transient status attempts", () => {
  const result = run(Array.from({ length: MAX_ATTEMPTS }, () => upstream502));
  assert.equal(result.ok, false);
  assert.equal(result.calls, MAX_ATTEMPTS);
  assert.equal(result.reason, "UPSTREAM_502");
  assert.ok(
    result.diagnostics.includes(
      "COMUN_SUPABASE_LOCAL_STATUS_TRANSIENT_EXHAUSTED",
    ),
  );
});

test("accepts a local status that recovers late within the bounded warm-up window", () => {
  const result = run([
    upstream502,
    upstream502,
    upstream502,
    upstream502,
    upstream502,
    upstream502,
    { status: 0, stdout: sensitiveEnv, stderr: "" },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.calls, 7);
  assert.deepEqual(result.delays, [
    2000,
    4000,
    6000,
    MAX_BACKOFF_MS,
    MAX_BACKOFF_MS,
    MAX_BACKOFF_MS,
  ]);
});

test("continues retrying allowlisted 503 and 504 failures", () => {
  for (const failure of [
    {
      status: 1,
      stdout: "",
      stderr: "Error status 503: service unavailable upstream",
    },
    {
      status: 1,
      stdout: "",
      stderr: "Error status 504: upstream gateway timeout",
    },
  ]) {
    const result = run([
      failure,
      { status: 0, stdout: sensitiveEnv, stderr: "" },
    ]);
    assert.equal(result.ok, true, failure.stderr);
    assert.equal(result.calls, 2, failure.stderr);
    assert.deepEqual(result.delays, [2000], failure.stderr);
  }
});

test("does not retry 401, SQL, malformed, or unknown failures", () => {
  for (const failure of [
    { status: 1, stdout: "", stderr: "Error status 401: unauthorized" },
    { status: 1, stdout: "", stderr: "ERROR: relation does not exist" },
    { status: 1, stdout: "", stderr: "unclassified local failure" },
  ]) {
    const result = run([failure]);
    assert.equal(result.ok, false, failure.stderr);
    assert.equal(result.calls, 1, failure.stderr);
    assert.equal(result.reason, "NON_TRANSIENT", failure.stderr);
  }
  const malformed = run([
    { status: 0, stdout: 'API_URL="http://127.0.0.1:54321"', stderr: "" },
  ]);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.reason, "INVALID_OUTPUT");
});

test("only exact recognized upstream classes receive retry", () => {
  assert.equal(
    classifyTransientStatusFailure(upstream502.stderr),
    "UPSTREAM_502",
  );
  assert.equal(
    classifyTransientStatusFailure(
      "Error status 503: service unavailable upstream",
    ),
    "UPSTREAM_503",
  );
  assert.equal(
    classifyTransientStatusFailure(
      "Error status 504: upstream gateway timeout",
    ),
    "UPSTREAM_504",
  );
  assert.equal(classifyTransientStatusFailure("network error"), null);
  assert.equal(hasRequiredLocalEnv(sensitiveEnv), true);
});

test("diagnostic markers never contain successful sensitive environment values", () => {
  const result = run([
    upstream502,
    { status: 0, stdout: sensitiveEnv, stderr: "" },
  ]);
  assert.equal(result.diagnostics.join("\n").includes("anon-secret"), false);
  assert.equal(
    result.diagnostics.join("\n").includes("service-role-secret"),
    false,
  );
  assert.equal(result.diagnostics.join("\n").includes("postgresql://"), false);
});

test("workflow uses the helper in every local status path and stays fail-closed", () => {
  const workflow = readFileSync(
    ".github/workflows/comun-quality-performance.yml",
    "utf8",
  );
  const isolatedA11y = workflow.match(
    /  isolated-a11y:[\s\S]*?(?=\n  pr-lane:)/,
  )?.[0];
  assert.ok(isolatedA11y);
  assert.match(isolatedA11y, /version: 2\.117\.0/);
  assert.match(
    isolatedA11y,
    /Supabase descartável — start\n        run: supabase start/,
  );
  assert.match(
    isolatedA11y,
    /Supabase descartável — reset local\n        run: supabase db reset --local --yes/,
  );
  assert.doesNotMatch(isolatedA11y, /continue-on-error: true/);
  assert.equal(
    (workflow.match(/node scripts\/ci\/read-supabase-local-env\.mjs/g) ?? [])
      .length,
    5,
  );
  assert.equal(workflow.includes("supabase status -o env"), false);
  assert.equal(workflow.includes("continue-on-error: true"), false);
  assert.match(workflow, /supabase db reset --local --yes/);
  assert.match(
    workflow,
    /Supabase descartável — start[\s\S]*?Supabase descartável — reset local[\s\S]*?Supabase descartável — health local[\s\S]*?Migration forward-only — ledger local[\s\S]*?Auditoria RLS — local/,
  );
  assert.match(workflow, /p1t-territory-local-contract\.mjs/);
  assert.match(
    readFileSync("scripts/comun-local-env.mjs", "utf8"),
    /GITHUB_ACTIONS === "true"/,
  );
});

test("helper has valid Node syntax", () => {
  const syntax = spawnSync(
    process.execPath,
    ["--check", "scripts/ci/read-supabase-local-env.mjs"],
    {
      encoding: "utf8",
    },
  );
  assert.equal(syntax.status, 0, syntax.stderr);
});

test("direct execution resolves the workflow's relative helper path", () => {
  assert.equal(
    isMainModule(
      new URL("./read-supabase-local-env.mjs", import.meta.url).href,
      "scripts/ci/read-supabase-local-env.mjs",
    ),
    true,
  );
});

test("fixture status uses the installed CI CLI without npx and sanitizes failures", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX executable fixture; Windows parsing contract is covered separately");
    return;
  }
  const { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } =
    await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { dirname, join } = await import("node:path");
  const root = mkdtempSync(join(tmpdir(), "comun-fixture-cli-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of [
    "tests/fixtures/comun/local-fixtures.mjs",
    "scripts/local-environment.mjs",
    "scripts/comun-local-env.mjs",
    "scripts/ci/read-supabase-local-env.mjs",
  ]) {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(file, "utf8"));
  }
  const packageDir = join(root, "node_modules/@supabase/supabase-js");
  mkdirSync(packageDir, { recursive: true });
  writeFileSync(
    join(packageDir, "package.json"),
    JSON.stringify({ type: "module", exports: "./index.js" }),
  );
  writeFileSync(
    join(packageDir, "index.js"),
    'export function createClient() { throw new Error("Client must not be created in status test"); }',
  );
  const bin = join(root, "bin");
  mkdirSync(bin);
  const cli = join(bin, "supabase");
  writeFileSync(
    cli,
    "#!/bin/sh\n" +
      '[ "$*" = "status -o env" ] || exit 70\n' +
      "printf '%s\\n' " +
      [
        'API_URL="http://127.0.0.1:54321"',
        'ANON_KEY="synthetic-anon"',
        'SERVICE_ROLE_KEY="synthetic-service"',
        'DB_URL="postgresql://local:synthetic@127.0.0.1:54322/postgres"',
      ].map((line) => "'" + line + "'").join(" ") +
      "\n",
  );
  chmodSync(cli, 0o755);
  const npx = join(bin, "npx");
  writeFileSync(npx, "#!/bin/sh\necho NPX_MUST_NOT_RUN >&2\nexit 73\n");
  chmodSync(npx, 0o755);
  const probe = join(root, "fixture-probe.mjs");
  writeFileSync(
    probe,
    'import assert from "node:assert/strict"; ' +
      'import { localPublicConfig } from "./tests/fixtures/comun/local-fixtures.mjs"; ' +
      'assert.deepEqual(localPublicConfig(), { url: "http://127.0.0.1:54321", anonKey: "synthetic-anon" });',
  );
  const run = () =>
    spawnSync(process.execPath, [probe], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: bin + ":" + process.env.PATH,
        GITHUB_ACTIONS: "true",
        ALLOW_LOCAL_TESTS: "true",
        COMUN_BASE_URL: "http://localhost:3000",
      },
    });
  const success = run();
  assert.equal(success.status, 0, success.stderr);
  assert.doesNotMatch(success.stdout + success.stderr, /NPX_MUST_NOT_RUN|synthetic-service/);
  writeFileSync(cli, "#!/bin/sh\necho private-credential-must-not-leak >&2\nexit 1\n");
  const failure = run();
  assert.notEqual(failure.status, 0);
  assert.match(failure.stderr, /COMUN_LOCAL_STATUS_RETRY_FAILED/);
  assert.doesNotMatch(failure.stdout + failure.stderr, /NPX_MUST_NOT_RUN|private-credential-must-not-leak/);
});
