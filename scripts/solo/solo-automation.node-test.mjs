import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePromotion } from "./authorize-promotion.mjs";
import { buildTransactionalPackage, validateForwardOnlySql } from "./sql-contract.mjs";

const sha = "a".repeat(40);
const valid = { eventName: "pull_request", label: "comun:promover", permission: "admin", pr: "23", expectedSha: sha, actualSha: sha, mergeable: "MERGEABLE" };

test("push and unknown labels cannot promote", () => {
  assert.equal(evaluatePromotion({ ...valid, eventName: "push" }).ok, false);
  assert.equal(evaluatePromotion({ ...valid, label: "pr23:run-backup" }).reason, "SOLO_LABEL_NOT_ALLOWED");
});

test("only maintain/admin and immutable mergeable SHA promote", () => {
  assert.equal(evaluatePromotion(valid).ok, true);
  assert.equal(evaluatePromotion({ ...valid, permission: "write" }).reason, "SOLO_OPERATOR_PERMISSION_DENIED");
  assert.equal(evaluatePromotion({ ...valid, actualSha: "b".repeat(40) }).reason, "SOLO_SHA_CHANGED");
  assert.equal(evaluatePromotion({ ...valid, mergeable: "CONFLICTING" }).reason, "SOLO_PR_NOT_MERGEABLE");
});

test("destructive SQL is rejected", () => {
  for (const sql of ["DROP TABLE x", "DROP SCHEMA x", "TRUNCATE x", "DELETE FROM x;", "ALTER TABLE x DROP COLUMN y", "CREATE TABLE x AS SELECT * FROM y", "supabase migration repair"]) {
    assert.throws(() => validateForwardOnlySql(sql), /SOLO_DESTRUCTIVE_SQL/);
  }
  assert.equal(validateForwardOnlySql("DELETE FROM x WHERE expired_at < now();"), true);
});

test("reconciliation package has one fail-fast transaction", () => {
  const sql = buildTransactionalPackage();
  assert.match(sql, /^\\set ON_ERROR_STOP on\nBEGIN;/);
  assert.match(sql, /postflight_assertions\.sql/);
  assert.match(sql, /COMMIT;\n$/);
});
