import { spawnSync } from "node:child_process";
import { buildTransactionalPackage } from "./sql-contract.mjs";

const url = process.env.PR23_DATABASE_URL;
const ref = process.env.SUPABASE_PROJECT_REF;
const allowed = (process.env.PR23_ALLOWED_PROJECT_REFS ?? "").split(",").filter(Boolean);
if (!url || !ref || !allowed.includes(ref) || !url.includes(ref)) {
  throw new Error("SOLO_REMOTE_DATABASE_NOT_ALLOWLISTED");
}

const sql = buildTransactionalPackage();
const result = spawnSync(
  "docker",
  ["run", "--rm", "-i", "postgres:17", "psql", url, "-X", "-v", "ON_ERROR_STOP=1"],
  {
    input: sql,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  },
);
if (result.status !== 0) {
  const message = (result.stderr.match(/ERROR:\s+([^\r\n]+)/)?.[1] ?? "transaction failed").slice(0, 240);
  throw new Error(`SOLO_FORWARD_ONLY_ROLLBACK:${message}`);
}
console.log("COMUN_FORWARD_ONLY_TRANSACTION_COMMITTED");
