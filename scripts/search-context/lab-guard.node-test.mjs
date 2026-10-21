import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertOwnedRunner, assertLabDestination } from "./lab-guard.mjs";
const env = {
  GITHUB_ACTIONS: "true",
  RUNNER_ENVIRONMENT: "github-hosted",
  COMUN_SEARCH_CONTEXT_LAB: "OWNED_EPHEMERAL_RUNNER",
};
const status = {
  API_URL: "http://127.0.0.1:55431",
  DB_URL: "postgresql://postgres:lab@127.0.0.1:55432/postgres",
  ANON_KEY: "ephemeral",
  SERVICE_ROLE_KEY: "ephemeral",
};
const container = {
  Name: "/supabase_db_COMUM_VR_ABANDONADA",
  Config: { Image: "public.ecr.aws/supabase/postgres:17" },
  NetworkSettings: {
    Ports: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "55432" }] },
  },
};
test("only empty local Docker on an owned disposable hosted runner", () => {
  assertOwnedRunner(env, "unix:///var/run/docker.sock", "");
  for (const patch of [
    { RUNNER_ENVIRONMENT: "self-hosted" },
    { SUPABASE_DB_URL: "forbidden" },
    { COMUN_SEARCH_CONTEXT_LAB: "" },
  ])
    assert.throws(() =>
      assertOwnedRunner(
        { ...env, ...patch },
        "unix:///var/run/docker.sock",
        "",
      ),
    );
  assert.throws(() => assertOwnedRunner(env, "tcp://remote", ""));
  assert.throws(() =>
    assertOwnedRunner(env, "unix:///var/run/docker.sock", "other-container"),
  );
});
test("loopback alone is insufficient; expected newly-created container is required", () => {
  assertLabDestination(status, container);
  for (const patch of [
    { API_URL: "https://real.supabase.co" },
    { DB_URL: "postgresql://remote/postgres" },
  ])
    assert.throws(() =>
      assertLabDestination({ ...status, ...patch }, container),
    );
  assert.throws(() =>
    assertLabDestination(status, { ...container, Name: "/unknown" }),
  );
});
test("proof workflow has no Production secret, deploy or promotion capability", () => {
  const workflow = readFileSync(
    new URL(
      "../../.github/workflows/comun-search-context.yml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(
    workflow,
    /secrets\.|workflow_dispatch|comun:promover|environment: production|write-all/,
  );
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /OWNED_EPHEMERAL_RUNNER/);
});
