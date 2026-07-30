import assert from "node:assert/strict";
import test from "node:test";
import { SOURCE_QUERIES } from "./audit-comun-operations.mjs";

test("all canonical source queries are fixed read-only selects", () => {
  assert.equal(SOURCE_QUERIES.length, 14);
  for (const query of SOURCE_QUERIES) {
    assert.match(query.sql.trim(), /^select\b/i);
    assert.doesNotMatch(
      query.sql,
      /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do)\b/i,
    );
  }
});

test("source query catalog never reads private payload columns", () => {
  for (const query of SOURCE_QUERIES) {
    const projection = query.sql.slice(
      0,
      query.sql.toLowerCase().indexOf(" from "),
    );
    assert.doesNotMatch(
      projection,
      /raw_text|contact_private|private_notes|object_key|public_url|body|generated_text|response_text|coordinates?/i,
    );
  }
});

test("all required operational domains have a source query", () => {
  const sql = SOURCE_QUERIES.map((query) => query.sql).join("\n");
  for (const domain of [
    "communities",
    "pautas",
    "actions",
    "protocols",
    "sidewalks",
    "archive",
    "radio",
    "art",
    "platform",
  ])
    assert.match(sql, new RegExp(`'${domain}' as domain`));
});
