import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ),
  cutoff = new Date(Date.now() - 90 * 86400000).toISOString(),
  { count } = await db
    .from("comun_archive_worker_heartbeats")
    .select("id", { count: "exact", head: true })
    .lt("created_at", cutoff)
    .eq("status", "passed");
console.log(
  JSON.stringify({
    dry_run: process.env.ARCHIVE_WORKER_HISTORY_PRUNE_CONFIRM !== "true",
    eligible: count ?? 0,
  }),
);
if (process.env.ARCHIVE_WORKER_HISTORY_PRUNE_CONFIRM === "true")
  await db
    .from("comun_archive_worker_heartbeats")
    .delete()
    .lt("created_at", cutoff)
    .eq("status", "passed");
