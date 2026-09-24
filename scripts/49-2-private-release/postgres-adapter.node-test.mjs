import assert from "node:assert/strict";
import test from "node:test";
import {
  createPostgresAdapter,
  requireDisposableConnection,
} from "./postgres-adapter.mjs";

test("database adapter accepts only its named localhost disposable database", () => {
  const local =
    "postgresql://postgres:postgres@127.0.0.1:57532/comun_pr437_prodlike_post_123";
  assert.equal(requireDisposableConnection(local), local);
  for (const url of [
    "postgresql://postgres:postgres@db.example.com:5432/comun_pr437_prodlike_post_123",
    "postgresql://postgres:postgres@127.0.0.1:57532/postgres",
    "postgresql://postgres:postgres@127.0.0.1/comun_pr437_prodlike_post_123",
  ])
    assert.throws(
      () => requireDisposableConnection(url),
      /COMUN_49_2_DISPOSABLE_DESTINATION_REQUIRED/,
    );
  assert.throws(
    () => createPostgresAdapter({ url: local, manifest: {} }),
    /COMUN_49_2_PRODUCTION_WRITE_AUTHORIZATION_REQUIRED/,
  );
});


test("database adapter recognizes only explicit Production write and recovery authorization kinds", () => {
  const oldSha = process.env.GITHUB_SHA;
  const oldRef = process.env.GITHUB_REF;
  process.env.GITHUB_SHA = "a".repeat(40);
  process.env.GITHUB_REF = "refs/heads/main";
  try {
    for (const kind of [
      "COMUN_49_2_PRODUCTION_SCHEMA_WRITE",
      "COMUN_49_2_PRODUCTION_SCHEMA_RECOVERY",
    ]) {
      assert.doesNotThrow(() =>
        createPostgresAdapter({
          url: "postgresql://postgres:secret@db.example.com:5432/postgres",
          manifest: {},
          authorization: { kind, sha: "a".repeat(40) },
        }),
      );
    }
    assert.throws(
      () =>
        createPostgresAdapter({
          url: "postgresql://postgres:secret@db.example.com:5432/postgres",
          manifest: {},
          authorization: {
            kind: "COMUN_49_2_PRODUCTION_SCHEMA_RECOVERY_OTHER",
            sha: "a".repeat(40),
          },
        }),
      /PRODUCTION_WRITE_AUTHORIZATION_REQUIRED/,
    );
  } finally {
    if (oldSha === undefined) delete process.env.GITHUB_SHA;
    else process.env.GITHUB_SHA = oldSha;
    if (oldRef === undefined) delete process.env.GITHUB_REF;
    else process.env.GITHUB_REF = oldRef;
  }
});
