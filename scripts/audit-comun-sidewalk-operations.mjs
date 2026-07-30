import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { summarizeSidewalkOperations } from "../lib/sidewalk-operations.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SIDEWALK_OPERATIONS_CONFIGURATION_MISSING");

const db = createClient(url, key, { auth: { persistSession: false } });
const [uploads, records, photos] = await Promise.all([
  db
    .from("comun_sidewalk_uploads")
    .select(
      "status,confirmation_state,failure_code,created_at,expires_at,record_id",
    )
    .order("created_at", { ascending: false })
    .limit(1000),
  db
    .from("comun_sidewalk_records")
    .select("status,visibility,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(1000),
  db
    .from("comun_sidewalk_record_photos")
    .select("review_status,is_public,derivative_asset_id")
    .limit(1000),
]);

for (const result of [uploads, records, photos]) {
  if (result.error) throw result.error;
}

const summary = summarizeSidewalkOperations({
  uploads: uploads.data ?? [],
  records: records.data ?? [],
  photos: photos.data ?? [],
});
const failureCount = summary.failures24h.reduce(
  (total, failure) => total + failure.count,
  0,
);
const findings = [
  (summary.queue.oldestAgeHours ?? 0) >= 48
    ? "moderation_queue_older_than_48h"
    : null,
  summary.queue.pendingRecords > 25 ? "moderation_queue_over_25" : null,
  summary.queue.pendingPhotos > 25 ? "photo_review_queue_over_25" : null,
  failureCount >= 5 ? "five_or_more_upload_failures_24h" : null,
].filter(Boolean);
const result = {
  schemaVersion: 1,
  auditType: "sidewalk_operations_read_only",
  generatedAt: new Date().toISOString(),
  result:
    findings.length > 0
      ? "COMUN_SIDEWALK_OPERATIONS_ATTENTION"
      : "COMUN_SIDEWALK_OPERATIONS_GREEN",
  funnel7d: summary.funnel7d,
  queue: summary.queue,
  uploads: summary.uploads,
  failures24h: summary.failures24h,
  publishedTotal: summary.publishedTotal,
  findings,
  containsRecordIds: false,
  containsCoordinates: false,
  databaseWrites: "none",
  storageWrites: "none",
};

const outputDirectory = path.resolve(
  process.env.COMUN_ARTIFACT_DIR ?? ".ci-artifacts/sidewalk-operations",
);
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "result.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(result));
if (findings.length > 0) process.exitCode = 2;
