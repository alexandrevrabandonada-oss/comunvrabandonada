import assert from "node:assert/strict";
import test from "node:test";
import { hashCanonicalSections } from "./capture-canonical-section-hashes.mjs";

test("section hashes are stable and section-scoped", () => {
  const first = hashCanonicalSections({
    migrations: ["a"],
    functions: [{ name: "f" }],
  });
  const second = hashCanonicalSections({
    functions: [{ name: "f" }],
    migrations: ["a"],
  });
  assert.deepEqual(first, second);
  assert.equal(first.migrations.count, 1);
  assert.notEqual(first.migrations.sha256, first.functions.sha256);
});
