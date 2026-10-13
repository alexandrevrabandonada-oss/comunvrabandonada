import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  reviewPackage,
  captureMetadata,
  classifyMetadata,
  migrationPath,
  manifestPath,
  metadataSql,
} from "./release-review.mjs";

const input = () => ({
  manifestBytes: readFileSync(manifestPath),
  migrationBytes: readFileSync(migrationPath),
  catalog: JSON.parse(readFileSync("lib/learning/catalog.json")),
});
const absent = () => ({
  read_only: "on",
  history_present: false,
  relations: [],
  functions: [],
});
test("pins package, original SQL and editorial seed without allowing promotion", () => {
  const packet = reviewPackage(input());
  assert.deepEqual(packet.editorialSeed, {
    tracks: 4,
    missions: 24,
    resources: 4,
  });
  assert.equal(packet.remotePromotionAllowed, false);
  assert.equal(packet.promotionReady, false);
  assert.equal(packet.schemaWrites, 0);
});
for (const field of ["manifestBytes", "migrationBytes"])
  test(`changed ${field} is rejected`, () => {
    const args = input();
    args[field] = Buffer.concat([args[field], Buffer.from("\n")]);
    assert.throws(() => reviewPackage(args), /BYTES_CHANGED/);
  });
test("catalog change cannot silently diverge from immutable seed", () => {
  const args = input();
  args.catalog.missions[0].concept += " changed";
  assert.throws(() => reviewPackage(args), /EDITORIAL_SEED_DRIFT/);
});
test("absence is captured, never promotion permission", () => {
  assert.equal(
    classifyMetadata(absent()),
    "ABSENT_REQUIRES_BASELINE_AND_PROMOTION_REVIEW",
  );
});
for (const overrides of [
  { history_present: true },
  { relations: [{ name: "comun_learning_progress" }] },
  { functions: [{ name: "comun_learning_unknown" }] },
])
  test(`present/partial metadata blocks: ${JSON.stringify(overrides)}`, () => {
    assert.match(classifyMetadata({ ...absent(), ...overrides }), /^BLOCKED_/);
  });
for (const overrides of [
  { read_only: "off" },
  { history_present: "false" },
  { relations: null },
  { functions: {} },
])
  test(`malformed metadata cannot be accepted: ${JSON.stringify(overrides)}`, () =>
    assert.throws(() => classifyMetadata({ ...absent(), ...overrides })));
test("metadata capture uses only one metadata SELECT in a read-only rollback", async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: sql === metadataSql ? [absent()] : [] };
    },
  };
  const result = await captureMetadata(client);
  assert.deepEqual(
    queries.map((x) => x.sql),
    ["BEGIN READ ONLY", metadataSql, "ROLLBACK"],
  );
  assert.deepEqual(queries[1].params, ["20261006134804"]);
  assert.equal(result.promotionReady, false);
  assert.equal(result.businessRowsRead, false);
  assert.doesNotMatch(
    metadataSql,
    /\b(?:insert|update|delete|create|alter|drop|pg_notify|set_config)\b/i,
  );
  assert.doesNotMatch(metadataSql, /from public\.comun_learning_/i);
});
test("query failure rolls back and does not expose connection errors", async () => {
  const calls = [];
  await assert.rejects(
    captureMetadata({
      async query(sql) {
        calls.push(sql);
        if (sql === metadataSql) throw new Error("postgres://private-secret");
        return { rows: [] };
      },
    }),
    { message: "COMUN_LEARNING_REVIEW_CAPTURE_BLOCKED_SANITIZED" },
  );
  assert.equal(calls.at(-1), "ROLLBACK");
});
test("rollback failure cannot report a completed capture", async () => {
  await assert.rejects(
    captureMetadata({
      async query(sql) {
        if (sql === "ROLLBACK") throw new Error("secret");
        return { rows: sql === metadataSql ? [absent()] : [] };
      },
    }),
    { message: "COMUN_LEARNING_REVIEW_ROLLBACK_FAILED_SANITIZED" },
  );
});
