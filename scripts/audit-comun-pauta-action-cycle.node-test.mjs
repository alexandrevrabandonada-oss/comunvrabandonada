import assert from "node:assert/strict";
import test from "node:test";
import {
  assertReadOnlyAuditSql,
  fixedAuditSql,
  renderAggregateMarkdown,
  sanitizeAggregateMetrics,
} from "./audit-comun-pauta-action-cycle.mjs";

test("daily audit uses one fixed read-only aggregate query", () => {
  assert.equal(assertReadOnlyAuditSql(), true);
  assert.match(fixedAuditSql, /^\s*select/i);
  assert.doesNotMatch(
    fixedAuditSql,
    /\b(insert|update|delete|create|alter|drop|truncate|grant|revoke)\b/i,
  );
});

test("write statements are blocked before a connection is needed", () => {
  assert.throws(
    () => assertReadOnlyAuditSql("update public.example set value = true"),
    /WRITE_BLOCKED/,
  );
});

test("aggregate output drops unknown keys and contains no identifiers or text", () => {
  const result = sanitizeAggregateMetrics({
    processesByStage: { contribution: 2, "unsafe id": 4 },
    overdueTasks: 1,
    private_notes: "do not persist",
    user_id: "private",
  });
  assert.deepEqual(result.processesByStage, { contribution: 2 });
  assert.equal(result.overdueTasks, 1);
  assert.equal("private_notes" in result, false);
  assert.equal("user_id" in result, false);
  assert.equal(result.databaseWrites, "none");
  assert.equal(result.containsPrivateData, false);
});

test("markdown contains only the sanitized aggregate contract", () => {
  const result = sanitizeAggregateMetrics({
    processesByStage: { result: 1 },
    resultsAwaitingMemory: 1,
  });
  const markdown = renderAggregateMarkdown(result);
  assert.match(markdown, /Resultados aguardando memória: 1/);
  assert.doesNotMatch(
    markdown,
    /raw_text|contact_private|user_id|object_key|postgresql:\/\//i,
  );
});
