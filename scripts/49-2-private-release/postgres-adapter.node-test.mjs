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
