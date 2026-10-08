import assert from "node:assert/strict";
import pg from "pg";
import { captureMetadata, version } from "./release-review.mjs";

// Separate empty CI database, with no Supabase/Production credential.
const target = new URL(process.env.COMUN_LEARNING_REVIEW_TEST_URL ?? "");
assert.equal(target.protocol, "postgres:");
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.pathname, "/escola_release_review_test");
assert.equal(target.username, "postgres");
assert.equal(target.password, "release-review-disposable-only");
const admin = new pg.Client({ connectionString: target.href });
const reader = new pg.Client({
  connectionString: target.href,
  options: "-c default_transaction_read_only=on",
});
try {
  await admin.connect();
  await reader.connect();
  assert.equal(
    (
      await admin.query(
        "select to_regnamespace('supabase_migrations') is null as fresh",
      )
    ).rows[0].fresh,
    true,
  );
  assert.equal(
    (
      await admin.query(
        "select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'",
      )
    ).rows[0].n,
    0,
  );
  await admin.query(
    "create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key)",
  );
  const absent = await captureMetadata(reader);
  assert.equal(
    absent.classification,
    "ABSENT_REQUIRES_BASELINE_AND_PROMOTION_REVIEW",
  );
  await admin.query(
    "create table public.comun_learning_progress(synthetic integer)",
  );
  const partial = await captureMetadata(reader);
  assert.match(partial.classification, /^BLOCKED_/);
  assert.equal(partial.metadata.relations[0].name, "comun_learning_progress");
  await admin.query(
    "drop table public.comun_learning_progress; create function public.comun_learning_unknown() returns void language sql as 'select'",
  );
  assert.match((await captureMetadata(reader)).classification, /^BLOCKED_/);
  await admin.query("drop function public.comun_learning_unknown()");
  await admin.query(
    "insert into supabase_migrations.schema_migrations values($1)",
    [version],
  );
  assert.match((await captureMetadata(reader)).classification, /^BLOCKED_/);
  await assert.rejects(
    reader.query("delete from supabase_migrations.schema_migrations"),
    { code: "25006" },
  );
  await assert.rejects(
    reader.query("create table public.must_not_exist(id integer)"),
    { code: "25006" },
  );
  assert.equal(
    (
      await admin.query(
        "select count(*)::int as n from supabase_migrations.schema_migrations",
      )
    ).rows[0].n,
    1,
  );
  console.log("COMUN_LEARNING_REVIEW_POSTGRES_DISPOSABLE_GREEN");
} finally {
  await reader.end();
  await admin.end();
}
