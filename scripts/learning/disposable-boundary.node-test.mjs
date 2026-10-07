import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";
import { NextRequest } from "next/server.js";
import {
  disposableContext,
  assertOwnedContainers,
} from "./disposable-boundary.mjs";

const env = {
  COMUN_LEARNING_DISPOSABLE_AUTH: "true",
  COMUN_LEARNING_RUN_ID: "123-2",
  COMUN_LEARNING_LOCAL_API_URL: "http://127.0.0.1:55431",
  COMUN_LEARNING_LOCAL_DATABASE_URL:
    "postgresql://postgres:synthetic@127.0.0.1:55432/postgres",
  COMUN_LEARNING_LOCAL_ANON_KEY: "local-only",
  COMUN_LEARNING_LOCAL_SERVICE_KEY: "local-only-service",
};
test("application requests use Next's canonical localhost origin without relaxing origin validation", () => {
  assert.equal(
    new NextRequest("http://127.0.0.1:3017/api/comun/escola").nextUrl.origin,
    "http://localhost:3017",
  );
  assert.equal(
    new NextRequest("http://localhost:3017/api/comun/escola").nextUrl.origin,
    "http://localhost:3017",
  );
});
test("execution context accepts only explicit loopback ports and isolated run ID", () => {
  assert.equal(disposableContext(env).project, "escola-proof-123-2");
  for (const change of [
    { COMUN_LEARNING_DISPOSABLE_AUTH: "false" },
    { COMUN_LEARNING_RUN_ID: "other" },
    { COMUN_LEARNING_LOCAL_API_URL: "https://remote.supabase.co" },
    { COMUN_LEARNING_LOCAL_API_URL: "http://127.0.0.1:55431/path" },
    {
      COMUN_LEARNING_LOCAL_DATABASE_URL:
        "postgresql://postgres:x@localhost:55432/postgres",
    },
    {
      COMUN_LEARNING_LOCAL_DATABASE_URL:
        "postgresql://postgres:x@127.0.0.1:5432/postgres",
    },
    {
      COMUN_LEARNING_LOCAL_DATABASE_URL:
        "postgresql://postgres:x@127.0.0.1:55432/another",
    },
    {
      COMUN_LEARNING_LOCAL_DATABASE_URL:
        "postgresql://postgres:x@127.0.0.1:55432/postgres?host=remote",
    },
    ...[
      "SUPABASE_DB_URL",
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
    ].map((key) => ({ [key]: "unexpected" })),
  ])
    assert.throws(() => disposableContext({ ...env, ...change }));
});
function container(name) {
  return {
    Name: `/${name}`,
    State: { Running: true },
    Config: { Image: "public.ecr.aws/supabase/fixture:pinned" },
    NetworkSettings: {
      Ports: {
        "5432/tcp": [{ HostPort: "55432" }],
        "8000/tcp": [{ HostPort: "55431" }],
      },
    },
  };
}
test("a loopback URL alone never authorizes writes to an unrelated Docker stack", () => {
  const context = disposableContext(env);
  assert.doesNotThrow(() => assertOwnedContainers(context, container));
  for (const mutate of [
    (c) => {
      c.Name = "/supabase_db_foreign";
    },
    (c) => {
      c.State.Running = false;
    },
    (c) => {
      c.NetworkSettings.Ports = {};
    },
    (c) => {
      c.Config.Image = "unknown:latest";
    },
  ])
    assert.throws(() =>
      assertOwnedContainers(context, (name) => {
        const c = container(name);
        mutate(c);
        return c;
      }),
    );
});
test("canonical job never receives Production credentials or dispatches promotion", () => {
  const workflow = load(
    readFileSync(
      new URL("../../.github/workflows/comun-learning.yml", import.meta.url),
      "utf8",
    ),
  );
  const job = workflow.jobs["canonical-auth"];
  assert.deepEqual(job.permissions, { contents: "read" });
  const contract = JSON.stringify(job);
  assert.doesNotMatch(
    contract,
    /secrets\.|SUPABASE_DB_URL|SUPABASE_ACCESS_TOKEN|comun:promover|workflow_dispatch|db push|--linked/,
  );
  assert.equal(
    job.steps.find((s) => s.uses === "supabase/setup-cli@v1").with.version,
    "2.117.0",
  );
  assert.ok(job.steps.some((s) => s.run === "supabase db reset --local --yes"));
  assert.equal(
    job.steps.find((s) => s.uses === "actions/checkout@v4").with[
      "persist-credentials"
    ],
    false,
  );
  assert.equal(job.steps.at(-1).if, "always()");
});
