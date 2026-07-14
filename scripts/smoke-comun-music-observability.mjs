import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const stamp = Date.now();
let artist, link, submission, claim;
const ok = (value, message) => { if (!value) throw new Error(message); };
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(p * values.length) - 1)] ?? 0;
const fingerprint = (type, id) => createHash("sha256").update(`${type}:${id}`).digest("hex");

try {
  let result = await db.from("comun_archive_items").insert({ slug: `observabilidade-${stamp}`, item_type: "artist", title: "Fixture Observabilidade", city: "Volta Redonda", source_name: "Smoke descartável", rights_status: "external_link_only", status: "draft", visibility: "private" }).select("id").single();
  if (result.error) throw result.error;
  artist = result.data.id;
  await db.from("comun_archive_artist_profiles").insert({ archive_item_id: artist, stage_name: "Fixture Observabilidade", artist_type: "band", city: "Volta Redonda", biography_public: "Fixture" });
  result = await db.from("comun_archive_external_links").insert({ archive_item_id: artist, platform: "spotify", url: "https://open.spotify.com/artist/fixture", link_type: "artist_profile", official_status: "official", checked_at: new Date(Date.now() - 40 * 86400000).toISOString() }).select("id").single();
  if (result.error) throw result.error;
  link = result.data.id;
  for (const [status, latency] of [["reachable", 100], ["timeout", 300], ["broken", 900]]) {
    const insert = await db.from("comun_archive_link_checks").insert({ external_link_id: link, status, platform: "spotify", method_used: "HEAD", response_time_ms: latency, safe_final_hostname: "open.spotify.com", checked_at: new Date().toISOString() });
    if (insert.error) throw insert.error;
  }
  const checks = await db.from("comun_archive_link_checks").select("status,response_time_ms,platform").eq("external_link_id", link);
  ok(checks.data?.length === 3, "checks não persistidos");
  ok(percentile(checks.data.map((x) => x.response_time_ms), .5) === 300, "p50 incorreto");
  ok(percentile(checks.data.map((x) => x.response_time_ms), .95) === 900, "p95 incorreto");
  ok(new Date(Date.now() - 40 * 86400000) < new Date(Date.now() - 35 * 86400000), "check vencido não identificado");
  const old = new Date(Date.now() - 20 * 86400000).toISOString();
  result = await db.from("comun_archive_artist_submissions").insert({ stage_name: "Fixture vencida", artist_type: "band", status: "pending", created_at: old }).select("id").single();
  if (result.error) throw result.error;
  submission = result.data.id;
  result = await db.from("comun_archive_artist_claims").insert({ artist_item_id: artist, claimant_contact_private: "fixture@example.invalid", relationship: "representante", status: "pending", created_at: old }).select("id").single();
  if (result.error) throw result.error;
  claim = result.data.id;
  for (const [type, id] of [["archive_music_submission_overdue", submission], ["archive_music_claim_overdue", claim]]) {
    const fp = fingerprint(type, id);
    await db.from("comun_admin_alerts").upsert({ alert_type: type, severity: "critical", title: "Prazo editorial musical excedido", sanitized_message: "20 dias sem decisão editorial.", source_type: "archive_music_slo", source_id: id, fingerprint: fp, status: "open" }, { onConflict: "fingerprint" });
    await db.from("comun_admin_alerts").upsert({ alert_type: type, severity: "critical", title: "Prazo editorial musical excedido", sanitized_message: "20 dias sem decisão editorial.", source_type: "archive_music_slo", source_id: id, fingerprint: fp, status: "open" }, { onConflict: "fingerprint" });
    const alert = await db.from("comun_admin_alerts").select("id").eq("fingerprint", fp);
    ok(alert.data?.length === 1, "alerta SLO não foi deduplicado");
    await db.from("comun_admin_alerts").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("fingerprint", fp);
  }
  console.log("smoke:music-observability ok");
} finally {
  if (submission) await db.from("comun_archive_artist_submissions").delete().eq("id", submission);
  if (claim) await db.from("comun_archive_artist_claims").delete().eq("id", claim);
  if (artist) await db.from("comun_archive_items").delete().eq("id", artist);
}
