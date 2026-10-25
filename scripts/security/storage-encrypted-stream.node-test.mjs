import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import tar from "tar-stream";
import {
  storageTarStream,
  verifyStorageTar,
} from "../../lib/security/storage-encrypted-stream.mjs";
import { createReadonlyStorageSource } from "../../lib/security/storage-readonly-source.mjs";

function source(change = {}) {
  let lists = 0;
  return {
    async list(scope) {
      lists++;
      return {
        IsTruncated: false,
        Contents:
          scope === "private"
            ? [
                {
                  Key: "private-key",
                  Size: 3,
                  ETag: '"v1"',
                  ...(change.object ?? {}),
                },
              ]
            : [],
        ...(change.inventoryAfter && lists > 2 ? change.inventoryAfter : {}),
      };
    },
    async read() {
      return {
        etag: '"v1"',
        length: 3,
        body: Readable.from([Buffer.from([0, 128, 255])]),
        ...change.read,
      };
    },
  };
}
async function roundtrip(input) {
  const archive = await storageTarStream(input);
  const results = await Promise.all([
    verifyStorageTar(archive.stream),
    archive.completed,
  ]);
  assert.equal(results[0].manifestSha256, results[1].manifestSha256);
  return results[0];
}
test("actual binary TAR stream verifies without plaintext files", async () => {
  const result = await roundtrip(source());
  assert.equal(result.objectCount, 1);
  assert.equal(result.bytes, 3);
  assert.equal(result.plaintextPersisted, false);
});
for (const [name, change] of Object.entries({
  "changed etag": { read: { etag: '"v2"' } },
  "changed declared length": { read: { length: 4 } },
  "short body": { read: { body: Readable.from([Buffer.from([1])]) } },
  "long body": { read: { body: Readable.from([Buffer.alloc(4)]) } },
  "unexpected private metadata": {
    read: { attributes: { privateContact: "forbidden" } },
  },
  "inventory changed after download": { inventoryAfter: { Contents: [] } },
}))
  test(name, async () => {
    await assert.rejects(roundtrip(source(change)));
  });
for (const ETag of [undefined, "*", 'W/"weak"', "unquoted"])
  test(`reject invalid etag ${String(ETag)}`, async () =>
    assert.rejects(storageTarStream(source({ object: { ETag } }))));
test("reject incomplete inventory", async () =>
  assert.rejects(storageTarStream({ list: async () => ({ Contents: [] }) })));
test("reject unsafe source configuration without network", () => {
  assert.throws(() => createReadonlyStorageSource({}));
  assert.throws(() =>
    createReadonlyStorageSource({
      R2_ACCOUNT_ID: "a".repeat(32),
      R2_ENDPOINT: "https://attacker.invalid",
      R2_BUCKET_ORIGINALS: "one",
      R2_BUCKET_PUBLIC: "two",
      R2_ACCESS_KEY_ID: "synthetic",
      R2_SECRET_ACCESS_KEY: "synthetic",
    }),
  );
});
test("reject non TAR bytes", async () =>
  assert.rejects(verifyStorageTar(Readable.from([Buffer.from("invalid")]))));
for (const header of [
  { name: "../private", type: "file", size: 0 },
  {
    name: "objects/000001.bin",
    type: "symlink",
    linkname: "/private",
    size: 0,
  },
  { name: "objects/000002.bin", type: "file", size: 0 },
])
  test(`reject archive entry ${header.name} ${header.type}`, async () => {
    const pack = tar.pack();
    pack.on("error", () => {});
    pack.entry(header).on("error", () => {});
    pack.finalize();
    await assert.rejects(verifyStorageTar(pack));
  });
test("reject empty archive without manifest", async () => {
  const pack = tar.pack();
  pack.finalize();
  await assert.rejects(verifyStorageTar(pack));
});
