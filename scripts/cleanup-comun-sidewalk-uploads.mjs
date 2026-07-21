import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !/^http:\/\/(127\.0\.0\.1|localhost):\d+/.test(url))
  throw new Error("Cleanup permitido somente no Supabase local.");
const db = createClient(url, key, { auth: { persistSession: false } }),
  expired = await db
    .from("comun_sidewalk_uploads")
    .select("id,object_key,status")
    .lt("expires_at", new Date().toISOString())
    .in("status", ["draft", "awaiting_upload", "uploaded", "upload_failed"]);
if (expired.error) throw expired.error;
let removed = 0;
for (const ticket of expired.data ?? []) {
  const removal = await db.storage
    .from("archive-private-originals")
    .remove([ticket.object_key]);
  if (removal.error && !/not found/i.test(removal.error.message))
    throw removal.error;
  const updated = await db
    .from("comun_sidewalk_uploads")
    .update({ status: "abandoned", failure_code: "expired_cleanup" })
    .eq("id", ticket.id);
  if (updated.error) throw updated.error;
  removed += 1;
}
console.log(
  JSON.stringify({
    status: "COMUN_SIDEWALK_UPLOAD_CLEAN",
    expiredAuthorizations: removed,
    remoteAccess: false,
  }),
);
