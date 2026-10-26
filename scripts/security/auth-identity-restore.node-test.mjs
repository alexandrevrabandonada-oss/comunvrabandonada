import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  classifyAuthRestoreDockerFailure,
  parseAuthRestoreArguments,
  removeAuthRestoreResource,
} from "./rehearse-auth-identity-restore.mjs";

test("disposable Auth restore rejects remote targets, missing and extra arguments", () => {
  for (const args of [
    [],
    ["--output", path.resolve("evidence")],
    ["--run-disposable", "--output", "relative"],
    [
      "--run-disposable",
      "--output",
      path.resolve("evidence"),
      "--url",
      "https://external.invalid",
    ],
  ])
    assert.throws(() => parseAuthRestoreArguments(args));
  assert.deepEqual(
    parseAuthRestoreArguments([
      "--run-disposable",
      "--output",
      path.resolve("evidence"),
    ]),
    { output: path.resolve("evidence") },
  );
});
test("cleanup never removes a container owned by another session", async () => {
  const owner = "comun-ar-11111111-1111-4111-8111-111111111111";
  const calls = [];
  const docker = async (args) => {
    calls.push(args);
    return Buffer.from(
      JSON.stringify([
        { Config: { Labels: { "comun.owner": "someone-else" } } },
      ]),
    );
  };
  await assert.rejects(
    removeAuthRestoreResource(docker, owner, {
      type: "container",
      id: "exact-id",
    }),
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "inspect");
});
test("cleanup rejects a network without internal isolation", async () => {
  const owner = "comun-ar-11111111-1111-4111-8111-111111111111";
  const calls = [];
  const docker = async (args) => {
    calls.push(args);
    return Buffer.from(
      JSON.stringify([{ Labels: { "comun.owner": owner }, Internal: false }]),
    );
  };
  await assert.rejects(
    removeAuthRestoreResource(docker, owner, {
      type: "network",
      id: "exact-id",
    }),
  );
  assert.equal(calls.length, 1);
});

test("bootstrap diagnostics publish bounded categories and never raw stderr", () => {
  assert.equal(
    classifyAuthRestoreDockerFailure(
      "Error response from daemon: address already in use: SECRET_EXAMPLE",
    ),
    "LAB_PORT_COLLISION",
  );
  assert.equal(
    classifyAuthRestoreDockerFailure(
      "psql: ERROR: relation synthetic_private does not exist",
    ),
    "MISSING_DATABASE_OBJECT",
  );
  assert.equal(
    classifyAuthRestoreDockerFailure(
      "Error: password=SECRET_EXAMPLE unknown Docker problem",
    ),
    "DOCKER_COMMAND_FAILED",
  );
  assert.equal(
    classifyAuthRestoreDockerFailure("out of memory while starting database"),
    "LAB_MEMORY_EXHAUSTED",
  );
  assert.equal(
    classifyAuthRestoreDockerFailure(null),
    "DOCKER_COMMAND_FAILED",
  );
});
