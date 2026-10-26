import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
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
