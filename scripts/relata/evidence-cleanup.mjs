import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const databaseUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(url) || !key)
  throw new Error("COMUN_RELATA_LOCAL_STORAGE_REQUIRED");
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(databaseUrl))
  throw new Error("COMUN_RELATA_LOCAL_DATABASE_REQUIRED");

const execute = process.argv.includes("--execute-local");
if (execute && !process.argv.includes("--confirm=COMUN_RELATA_LOCAL_CLEANUP"))
  throw new Error("COMUN_RELATA_LOCAL_CLEANUP_CONFIRMATION_REQUIRED");

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const postgres = new pg.Client({ connectionString: databaseUrl });
await postgres.connect();
const inventory = await postgres.query(
  `select id,state,review_after from private.comun_relata_attachments
   where review_after<=now() and state=any($1::text[])
   order by state,review_after`,
  [["quarantine", "validating", "rejected", "orphaned", "withdrawn"]],
);
await postgres.end();

const counts = new Map();
let deletedObjects = 0;
for (const record of inventory.rows) {
  counts.set(record.state, (counts.get(record.state) ?? 0) + 1);
  if (!execute) continue;
  const removed = await db.storage.from("comun-relata-private").remove([
    `quarantine/${record.id}.bin`,
    `sealed/${record.id}.webp`,
  ]);
  if (removed.error) throw new Error("COMUN_RELATA_LOCAL_CLEANUP_STORAGE_FAILED");
  deletedObjects += 2;
}

console.log(
  JSON.stringify({
    result: "COMUN_RELATA_EVIDENCE_CLEANUP_LOCAL_GREEN",
    mode: execute ? "explicit_local_mutation" : "dry_run",
    candidates: [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([state, count]) => ({ state, count })),
    deletedObjects,
    objectNamesEmitted: 0,
    remote: "not_contacted",
  }),
);
