import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MAX_ATTEMPTS,
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
  stderr: 'Error status 502: {"message":"An invalid response was received from the upstream server"}',
};

test("returns local env on the first successful status call", () => {
  const result = run([{ status: 0, stdout: sensitiveEnv, stderr: "" }]);
  assert.equal(result.ok, true);
  assert.equal(result.calls, 1);
  assert.equal(result.diagnostics.length, 0);
});

test("retries an allowlisted 502 once and succeeds", () => {
  const result = run([upstream502, { status: 0, stdout: sensitiveEnv, stderr: "" }]);
  assert.equal(result.ok, true);
  assert.equal(result.calls, 2);
  assert.deepEqual(result.delays, [500]);
  assert.deepEqual(result.diagnostics, [
    "COMUN_SUPABASE_LOCAL_STATUS_TRANSIENT_RETRY",
    "attempt=1",
    "class=UPSTREAM_502",
  ]);
});

test("exhausts only three allowlisted transient status attempts", () => {
  const result = run([upstream502, upstream502, upstream502]);
  assert.equal(result.ok, false);
  assert.equal(result.calls, MAX_ATTEMPTS);
  assert.equal(result.reason, "UPSTREAM_502");
  assert.ok(result.diagnostics.includes("COMUN_SUPABASE_LOCAL_STATUS_TRANSIENT_EXHAUSTED"));
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
  const malformed = run([{ status: 0, stdout: 'API_URL="http://127.0.0.1:54321"', stderr: "" }]);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.reason, "INVALID_OUTPUT");
});

test("only exact recognized upstream classes receive retry", () => {
  assert.equal(classifyTransientStatusFailure(upstream502.stderr), "UPSTREAM_502");
  assert.equal(
    classifyTransientStatusFailure("Error status 503: service unavailable upstream"),
    "UPSTREAM_503",
  );
  assert.equal(
    classifyTransientStatusFailure("Error status 504: upstream gateway timeout"),
    "UPSTREAM_504",
  );
  assert.equal(classifyTransientStatusFailure("network error"), null);
  assert.equal(hasRequiredLocalEnv(sensitiveEnv), true);
});

test("diagnostic markers never contain successful sensitive environment values", () => {
  const result = run([upstream502, { status: 0, stdout: sensitiveEnv, stderr: "" }]);
  assert.equal(result.diagnostics.join("\n").includes("anon-secret"), false);
  assert.equal(result.diagnostics.join("\n").includes("service-role-secret"), false);
  assert.equal(result.diagnostics.join("\n").includes("postgresql://"), false);
});

test("workflow uses the helper in every local status path and stays fail-closed", () => {
  const workflow = readFileSync(".github/workflows/comun-quality-performance.yml", "utf8");
  assert.equal((workflow.match(/node scripts\/ci\/read-supabase-local-env\.mjs/g) ?? []).length, 4);
  assert.equal(workflow.includes("supabase status -o env"), false);
  assert.equal(workflow.includes("continue-on-error: true"), false);
  assert.match(workflow, /supabase db reset --local --yes/);
  assert.match(workflow, /p1t-territory-local-contract\.mjs/);
  assert.match(
    readFileSync("scripts/comun-local-env.mjs", "utf8"),
    /GITHUB_ACTIONS === "true"/,
  );
});

test("helper has valid Node syntax", () => {
  const syntax = spawnSync(process.execPath, ["--check", "scripts/ci/read-supabase-local-env.mjs"], {
    encoding: "utf8",
  });
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
