import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { persistLocalReference } from "./capture-sidewalk-local-reference.mjs";

test("persists a local reference under a newly-created artifact directory", async (t) => {
  const workspace = await mkdtemp(
    path.join(tmpdir(), "comun-local-reference-"),
  );
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const output = path.join(
    workspace,
    ".ci-artifacts",
    "nested",
    "local-reference.json",
  );
  const first = { scope: "sidewalk-operational-v1", fingerprint: "first" };

  await persistLocalReference(output, first);

  const written = await readFile(output, "utf8");
  assert.equal(written.endsWith("\n"), true);
  assert.deepEqual(JSON.parse(written), first);
  assert.equal(path.relative(workspace, output).startsWith(".."), false);
  assert.deepEqual(await readdir(workspace), [".ci-artifacts"]);

  const second = { scope: "sidewalk-operational-v1", fingerprint: "second" };
  await persistLocalReference(output, second);
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), second);
});

test("propagates write failures without serializing reference content", async () => {
  const workspace = await mkdtemp(
    path.join(tmpdir(), "comun-local-reference-"),
  );
  const output = path.join(workspace, ".ci-artifacts");
  try {
    await mkdir(output);
    await assert.rejects(
      () => persistLocalReference(output, { private: "not-printed" }),
      (error) => error && !String(error.message).includes("not-printed"),
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
