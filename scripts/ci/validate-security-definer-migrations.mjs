import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const marker = (code, detail = "") => {
  throw new Error(`${code}${detail ? `:${detail}` : ""}`);
};

export function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let quote = null;
  let dollar = null;
  for (let index = 0; index < sql.length; index += 1) {
    const rest = sql.slice(index);
    if (dollar) {
      if (rest.startsWith(dollar)) {
        index += dollar.length - 1;
        dollar = null;
      }
      continue;
    }
    if (quote) {
      if (sql[index] === quote && sql[index + 1] === quote) index += 1;
      else if (sql[index] === quote) quote = null;
      continue;
    }
    if (sql[index] === "'" || sql[index] === '"') {
      quote = sql[index];
      continue;
    }
    const tag = rest.match(/^\$[A-Za-z0-9_]*\$/)?.[0];
    if (tag) {
      dollar = tag;
      index += tag.length - 1;
      continue;
    }
    if (sql[index] === ";") {
      statements.push(sql.slice(start, index + 1));
      start = index + 1;
    }
  }
  if (quote || dollar) marker("COMUN_SECURITY_DEFINER_SQL_PARSE_FAILED");
  if (sql.slice(start).trim()) statements.push(sql.slice(start));
  return statements;
}

const extensionCalls = [
  "similarity",
  "unaccent",
  "digest",
  "crypt",
  "gen_salt",
  "uuid_generate_v4",
];

export function validateSecurityDefinerStatement(
  statement,
  source = "migration.sql",
) {
  const executable = statement.replace(
    /^\s*(?:(?:--[^\n]*(?:\n|$))|(?:\/\*[\s\S]*?\*\/\s*))*/,
    "",
  );
  if (!/^\s*create\s+(?:or\s+replace\s+)?function\b/i.test(executable))
    return false;
  if (!/\bsecurity\s+definer\b/i.test(executable)) return false;
  const paths = [
    ...executable.matchAll(/\bset\s+search_path\s*(?:=|to)\s*([^\n\r;]+)/gi),
  ];
  if (paths.length !== 1)
    marker("COMUN_SECURITY_DEFINER_SEARCH_PATH_REQUIRED", source);
  const pathValue = paths[0][1].split(
    /\s+(?:as|language|immutable|stable|volatile|security|strict|parallel|cost|rows|support|transform|window|leakproof)\b/i,
  )[0];
  const normalized = pathValue
    .replace(/["']/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
  if (normalized !== "pg_catalog")
    marker("COMUN_SECURITY_DEFINER_SEARCH_PATH_UNSAFE", source);

  const body = executable.match(
    /\$[A-Za-z0-9_]*\$([\s\S]*)\$[A-Za-z0-9_]*\$/,
  )?.[1];
  if (body === undefined)
    marker("COMUN_SECURITY_DEFINER_BODY_PARSE_FAILED", source);
  for (const name of extensionCalls) {
    const unqualified = new RegExp(`(?<![A-Za-z0-9_.])${name}\\s*\\(`, "i");
    if (unqualified.test(body))
      marker(
        "COMUN_SECURITY_DEFINER_EXTENSION_UNQUALIFIED",
        `${source}:${name}`,
      );
  }
  const ctes = new Set(
    [...body.matchAll(/(?:\bwith|,)\s*([a-z_][a-z0-9_]*)\s+as\s*\(/gi)].map(
      (match) => match[1].toLowerCase(),
    ),
  );
  const relations =
    /\b(?:from|join|update|insert\s+into|delete\s+from)\s+([a-z_][a-z0-9_$]*(?:\.[a-z_][a-z0-9_$]*)?)/gi;
  for (const match of body.matchAll(relations)) {
    const object = match[1].toLowerCase();
    if (
      !object.includes(".") &&
      !ctes.has(object) &&
      !["new", "old"].includes(object)
    ) {
      marker(
        "COMUN_SECURITY_DEFINER_RELATION_UNQUALIFIED",
        `${source}:${object}`,
      );
    }
  }
  return true;
}

export function validateMigrationText(sql, source = "migration.sql") {
  const statements = splitSqlStatements(sql);
  const definerMentions = (sql.match(/\bsecurity\s+definer\b/gi) || []).length;
  let validated = 0;
  for (const statement of statements) {
    if (validateSecurityDefinerStatement(statement, source)) validated += 1;
  }
  if (validated !== definerMentions)
    marker("COMUN_SECURITY_DEFINER_PARSE_COVERAGE_FAILED", source);
  return validated;
}

function changedMigrations(base) {
  const output = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "--diff-filter=ACMR",
      `${base}...HEAD`,
      "--",
      "supabase/migrations/*.sql",
    ],
    { encoding: "utf8" },
  );
  return output.split(/\r?\n/).filter(Boolean);
}

export function main(argv = process.argv.slice(2)) {
  const explicit = argv.filter((arg) => !arg.startsWith("--base="));
  const base =
    argv.find((arg) => arg.startsWith("--base="))?.slice(7) ||
    process.env.COMUN_SECURITY_MIGRATION_BASE ||
    "origin/main";
  const files = explicit.length ? explicit : changedMigrations(base);
  let validated = 0;
  for (const file of files) {
    const normalized = file.replaceAll("\\", "/");
    if (!/^supabase\/migrations\/[^/]+\.sql$/.test(normalized))
      marker("COMUN_SECURITY_DEFINER_MIGRATION_PATH_INVALID", file);
    validated += validateMigrationText(
      readFileSync(path.resolve(file), "utf8"),
      normalized,
    );
  }
  console.log(
    `COMUN_SECURITY_DEFINER_MIGRATIONS_OK files=${files.length} functions=${validated}`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
