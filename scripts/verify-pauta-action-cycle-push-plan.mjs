import { readFileSync } from "node:fs";
import { PAUTA_ACTION_CYCLE_MIGRATIONS } from "./preflight-pauta-action-cycle.mjs";

const file = process.argv[2];
if (!file) throw new Error("COMUN_PAUTA_ACTION_CYCLE_PUSH_PLAN_REQUIRED");
const plan = readFileSync(file, "utf8");
const versions = [
  ...new Set([...plan.matchAll(/\b(20\d{12})\b/g)].map((match) => match[1])),
].sort();
const expected = [...PAUTA_ACTION_CYCLE_MIGRATIONS].sort();
if (JSON.stringify(versions) !== JSON.stringify(expected))
  throw new Error("COMUN_PAUTA_ACTION_CYCLE_UNEXPECTED_MIGRATION_PLAN");
if (/drop table|truncate|drop column/i.test(plan))
  throw new Error("COMUN_PAUTA_ACTION_CYCLE_DESTRUCTIVE_PLAN_BLOCKED");
process.stdout.write("COMUN_PAUTA_ACTION_CYCLE_PUSH_PLAN_EXACT\n");
