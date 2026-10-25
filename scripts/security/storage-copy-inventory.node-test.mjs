import assert from "node:assert/strict";
import test from "node:test";
import {
  listCompleteStorageScope,
  assertStorageObjectLength,
} from "../../lib/security/storage-copy-inventory.mjs";

const object = (Key = "private-synthetic", Size = 3) => ({ Key, Size });
const end = (Contents) => ({
  IsTruncated: false,
  Contents,
  KeyCount: Contents.length,
});
test("all pages must finish explicitly; opaque cursor passes only to next request", async () => {
  const seen = [];
  const pages = [
    {
      Contents: [object("a", 2)],
      IsTruncated: true,
      NextContinuationToken: "opaque-private-cursor",
      KeyCount: 1,
    },
    end([object("b", 0)]),
  ];
  const rows = await listCompleteStorageScope(async (cursor) => {
    seen.push(cursor);
    return pages[seen.length - 1];
  });
  assert.deepEqual(seen, [undefined, "opaque-private-cursor"]);
  assert.deepEqual(rows, [
    { key: "a", size: 2 },
    { key: "b", size: 0 },
  ]);
});
test("empty terminal inventory is legitimate, including omitted Contents", async () => {
  assert.deepEqual(await listCompleteStorageScope(async () => end([])), []);
  assert.deepEqual(
    await listCompleteStorageScope(async () => ({
      IsTruncated: false,
      KeyCount: 0,
    })),
    [],
  );
});
for (const [name, page] of [
  ["truncated missing token", { IsTruncated: true, Contents: [] }],
  ["missing terminal flag", { Contents: [] }],
  [
    "conflicting terminal token",
    {
      IsTruncated: false,
      Contents: [],
      NextContinuationToken: "private-cursor",
    },
  ],
  [
    "incomplete count",
    { IsTruncated: false, Contents: [object()], KeyCount: 2 },
  ],
  ["null Contents", { IsTruncated: false, Contents: null }],
])
  test(`reject ${name} as incomplete`, async () => {
    await assert.rejects(
      listCompleteStorageScope(async () => page),
      { message: "COMUN_STORAGE_INVENTORY_INCOMPLETE" },
    );
  });
test("cursor repetition aborts without retry or leaking the cursor", async () => {
  let calls = 0;
  await assert.rejects(
    listCompleteStorageScope(async () => ({
      IsTruncated: true,
      Contents: [object(String(calls++))],
      NextContinuationToken: "PRIVATE-CURSOR-CANARY",
    })),
    { message: "COMUN_STORAGE_INVENTORY_CURSOR_REPEATED" },
  );
  assert.equal(calls, 2);
});
test("duplicate objects across pages cannot be counted twice", async () => {
  let calls = 0;
  await assert.rejects(
    listCompleteStorageScope(async () =>
      ++calls === 1
        ? {
            IsTruncated: true,
            NextContinuationToken: "next",
            Contents: [object()],
          }
        : end([object()]),
    ),
    { message: "COMUN_STORAGE_INVENTORY_DUPLICATE_OBJECT" },
  );
});
for (const [name, value] of [
  ["missing size", { Key: "private-key" }],
  ["negative size", object("private-key", -1)],
  ["invalid size", object("private-key", NaN)],
  ["fractional size", object("private-key", 1.5)],
  ["string size", object("private-key", "3")],
  ["missing key", { Size: 1 }],
])
  test(`reject ${name} without object identifiers in errors`, async () => {
    await assert.rejects(
      listCompleteStorageScope(async () => end([value])),
      { message: "COMUN_STORAGE_INVENTORY_OBJECT_INVALID" },
    );
  });
test("safe integer overflow is rejected", async () => {
  await assert.rejects(
    listCompleteStorageScope(async () =>
      end([object("a", Number.MAX_SAFE_INTEGER), object("b", 1)]),
    ),
    { message: "COMUN_STORAGE_INVENTORY_OBJECT_INVALID" },
  );
});
test("page and object budgets stop incomplete inventories without more requests", async () => {
  let calls = 0;
  await assert.rejects(
    listCompleteStorageScope(
      async () => {
        calls++;
        return {
          IsTruncated: true,
          Contents: [],
          NextContinuationToken: String(calls),
        };
      },
      { maxPages: 1 },
    ),
    { message: "COMUN_STORAGE_INVENTORY_BUDGET_EXCEEDED" },
  );
  assert.equal(calls, 1);
  await assert.rejects(
    listCompleteStorageScope(async () => end([object("a"), object("b")]), {
      maxObjects: 1,
    }),
    { message: "COMUN_STORAGE_INVENTORY_BUDGET_EXCEEDED" },
  );
  await assert.rejects(
    listCompleteStorageScope(async () => end([]), { maxPages: 0 }),
    { message: "COMUN_STORAGE_INVENTORY_BUDGET_INVALID" },
  );
});
test("provider failure is not retried or echoed", async () => {
  let calls = 0;
  await assert.rejects(
    listCompleteStorageScope(async () => {
      calls++;
      throw Error("PRIVATE-TOKEN-CANARY");
    }),
    { message: "COMUN_STORAGE_INVENTORY_READ_FAILED" },
  );
  assert.equal(calls, 1);
});
test("download must match listed bytes, including zero-length objects", () => {
  assert.doesNotThrow(() => assertStorageObjectLength(0, 0));
  assert.doesNotThrow(() => assertStorageObjectLength(4, 4));
  for (const [declared, actual] of [
    [4, 3],
    [4, 5],
    [undefined, 0],
    [4, NaN],
    [-1, -1],
  ])
    assert.throws(() => assertStorageObjectLength(declared, actual), {
      message: "COMUN_STORAGE_BACKUP_OBJECT_CHANGED",
    });
});
