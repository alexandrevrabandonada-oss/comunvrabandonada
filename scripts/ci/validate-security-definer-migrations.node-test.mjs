import assert from "node:assert/strict";
import test from "node:test";
import {
  splitSqlStatements,
  validateMigrationText,
} from "./validate-security-definer-migrations.mjs";

const functionSql = (body, path = "pg_catalog") => `
create or replace function public.example() returns integer
language sql security definer set search_path = ${path}
as $body$ ${body} $body$;
`;

test("SQL splitter preserves semicolons inside dollar bodies", () => {
  assert.equal(
    splitSqlStatements(`${functionSql("select 1; select 2;")} select 3;`)
      .length,
    2,
  );
});

test("accepts fixed path with qualified relations and extension calls", () => {
  assert.equal(
    validateMigrationText(
      functionSql(
        "select extensions.similarity(t.name, 'x') from public.things t",
      ),
    ),
    1,
  );
});

test("requires an explicit pg_catalog-only path", () => {
  assert.throws(
    () => validateMigrationText(functionSql("select 1", "pg_catalog, public")),
    /SEARCH_PATH_UNSAFE/,
  );
  assert.throws(
    () =>
      validateMigrationText(
        functionSql("select 1").replace(/set search_path[^\n]+/, ""),
      ),
    /SEARCH_PATH_REQUIRED/,
  );
});

test("fails closed on unqualified relations and extension functions", () => {
  assert.throws(
    () => validateMigrationText(functionSql("select * from things")),
    /RELATION_UNQUALIFIED/,
  );
  assert.throws(
    () => validateMigrationText(functionSql("select similarity('a', 'b')")),
    /EXTENSION_UNQUALIFIED/,
  );
});

test("allows CTE names while requiring their source relation to be qualified", () => {
  assert.equal(
    validateMigrationText(
      functionSql(
        "with rows as (select * from public.things) select * from rows",
      ),
    ),
    1,
  );
});

test("an unparsed SECURITY DEFINER mention fails closed", () => {
  assert.throws(
    () =>
      validateMigrationText(
        "do $$ begin raise notice 'SECURITY DEFINER'; end $$;",
      ),
    /PARSE_COVERAGE_FAILED/,
  );
});
