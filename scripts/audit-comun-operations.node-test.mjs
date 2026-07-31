import assert from "node:assert/strict";
import test from "node:test";
import { SOURCE_QUERIES } from "./audit-comun-operations.mjs";
import { readFile } from "node:fs/promises";

const auditSource = await readFile(
  new URL("./audit-comun-operations.mjs", import.meta.url),
  "utf8",
);

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

test("read-only preflight distinguishes legacy projection from missing evidence", () => {
  assert.match(auditSource, /information_schema\.columns/);
  assert.match(auditSource, /projectionSchema === "legacy"/);
  assert.match(
    auditSource,
    /migrationRequired: projectionSchema !== "operations-v1"/,
  );
});

test("archive accessibility queue includes only effectively public images", () => {
  const query = SOURCE_QUERIES.find(
    (candidate) => candidate.name === "archive-accessibility",
  );
  assert.ok(query);
  assert.match(query.sql, /join public\.comun_archive_items item/);
  assert.match(query.sql, /asset\.bucket_scope = 'public_safe'/);
  assert.match(query.sql, /item\.status = 'published'/);
  assert.match(query.sql, /item\.visibility = 'public'/);
  assert.match(query.sql, /item\.published_at is not null/);
});

test("remote audit fails closed on RLS or public write grants", () => {
  assert.match(auditSource, /not relation\.relrowsecurity/);
  assert.match(
    auditSource,
    /grant_entry\.grantee in \('anon', 'authenticated'\)/,
  );
  assert.match(auditSource, /COMUN_OPERATIONS_SECURITY_BOUNDARY_BLOCKED/);
});
