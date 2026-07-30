import { readFileSync } from "node:fs";

export const OPERATIONS_MIGRATION =
  "20260730230044_comun_operations_unified_projection.sql";

const file = process.argv[2];
if (!file) throw new Error("COMUN_OPERATIONS_PUSH_PLAN_REQUIRED");

const plan = readFileSync(file, "utf8");
const migrations = [
  ...new Set(
    [...plan.matchAll(/(?<!\d)(20\d{12}_[a-z0-9_]+\.sql)(?![a-z0-9_])/gi)].map(
      (match) => match[1],
    ),
  ),
].sort();

if (migrations.length !== 1 || migrations[0] !== OPERATIONS_MIGRATION)
  throw new Error("COMUN_OPERATIONS_UNEXPECTED_MIGRATION_PLAN");
if (/\b(drop table|truncate|drop column|delete from)\b/i.test(plan))
  throw new Error("COMUN_OPERATIONS_DESTRUCTIVE_PLAN_BLOCKED");

process.stdout.write("COMUN_OPERATIONS_MIGRATION_PLAN_EXACT\n");
