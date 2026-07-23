import { readFileSync } from "node:fs";
import path from "node:path";

export const reconciliationFiles = [
  "preflight_assertions.sql",
  "modules/02-foundations.sql",
  "modules/03-pautas-circles.sql",
  "modules/04-member-profiles-inbox.sql",
  "modules/05-art-radio.sql",
  "modules/06-communities.sql",
  "modules/07-editorial-operation.sql",
  "modules/08-sidewalks.sql",
  "modules/09-security-hardening.sql",
  "postflight_assertions.sql",
];

export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\r\n]*/g, " ");
}

export function validateForwardOnlySql(sql, name = "SQL") {
  const clean = stripSqlComments(sql);
  const forbidden = [
    [/\bDROP\s+(TABLE|SCHEMA)\b/i, "DROP_TABLE_OR_SCHEMA"],
    [/(?:^|;)\s*TRUNCATE\b/i, "TRUNCATE"],
    [/\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+COLUMN\b/i, "DROP_COLUMN"],
    [/\bCREATE\s+TABLE\b[\s\S]*?\bAS\s+(SELECT|TABLE)\b/i, "TABLE_RECREATION_WITH_DATA"],
    [/\bmigration\s+repair\b/i, "MIGRATION_REPAIR"],
    [/\b(ALTER|CREATE|DROP)\s+(ROLE|DATABASE|TABLESPACE|SYSTEM)\b/i, "ADMIN_COMMAND"],
  ];
  for (const [pattern, code] of forbidden) if (pattern.test(clean)) throw new Error(`SOLO_DESTRUCTIVE_SQL:${code}:${name}`);
  for (const statement of clean.split(";")) {
    if (/^\s*DELETE\s+FROM\b/i.test(statement) && !/\bWHERE\b/i.test(statement)) throw new Error(`SOLO_DESTRUCTIVE_SQL:DELETE_WITHOUT_WHERE:${name}`);
  }
  return true;
}

export function buildTransactionalPackage(root = path.resolve("supabase/reconciliation/pr23")) {
  const bodies = reconciliationFiles.map((relative) => {
    const sql = readFileSync(path.join(root, relative), "utf8");
    validateForwardOnlySql(sql, relative);
    return `\n-- BEGIN ${relative}\n${sql}\n-- END ${relative}`;
  });
  return `\\set ON_ERROR_STOP on\nBEGIN;${bodies.join("\n")}\nCOMMIT;\n`;
}
