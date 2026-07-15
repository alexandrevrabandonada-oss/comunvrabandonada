import { createHash } from "node:crypto";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const artworkAlertTypes = [
  "artwork_contribution_pending", "artwork_rights_pending", "artwork_credit_disputed",
  "artwork_creator_claim_pending", "artwork_sensitive_location", "artwork_minor_review_required",
  "artwork_public_asset_without_rights", "artwork_withdrawal_requested", "artwork_processing_failed",
  "artwork_context_missing", "artwork_orphan_private_upload", "artwork_derivative_missing",
  "artwork_storage_validation_failed",
] as const;
type AlertType = typeof artworkAlertTypes[number];
type Candidate = { type: AlertType; id: string; severity: "info"|"attention"|"urgent"|"critical"; message: string };

export async function evaluateArtworkAlerts(now = new Date()) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível");
  const [{data: art},{data: rights},{data: safety},{data: submissions},{data: uploads},{data: jobs}] = await Promise.all([
    db.from("comun_archive_artworks").select("archive_item_id,context_public"),
    db.from("comun_archive_artwork_rights").select("archive_item_id,allow_comun_display,withdrawal_requested_at"),
    db.from("comun_archive_artwork_safety_reviews").select("archive_item_id,creator_minor_private,depicted_minor_private,sensitive_location_private,reinforced_review_status"),
    db.from("comun_archive_artwork_submissions").select("id").eq("status","pending"),
    db.from("comun_archive_storage_uploads").select("id,state,expires_at").neq("state","removed"),
    db.from("comun_archive_processing_jobs").select("id,status").eq("job_type","territorial_artwork_derivatives"),
  ]);
  const candidates: Candidate[] = [];
  for (const x of submissions ?? []) candidates.push({type:"artwork_contribution_pending",id:x.id,severity:"info",message:"Contribuição de arte aguarda triagem."});
  for (const x of art ?? []) {
    const r = (rights ?? []).find(y => y.archive_item_id === x.archive_item_id);
    const s = (safety ?? []).find(y => y.archive_item_id === x.archive_item_id);
    if (!x.context_public) candidates.push({type:"artwork_context_missing",id:x.archive_item_id,severity:"attention",message:"Obra sem contexto público suficiente."});
    if (!r?.allow_comun_display) candidates.push({type:"artwork_rights_pending",id:x.archive_item_id,severity:"urgent",message:"Direito de exibição no COMUN ainda não confirmado."});
    if (r?.withdrawal_requested_at) candidates.push({type:"artwork_withdrawal_requested",id:x.archive_item_id,severity:"critical",message:"Pedido de retirada exige ação editorial."});
    if (s?.sensitive_location_private) candidates.push({type:"artwork_sensitive_location",id:x.archive_item_id,severity:"urgent",message:"Obra possui localização sensível para revisão privada."});
    if ((s?.creator_minor_private || s?.depicted_minor_private) && s.reinforced_review_status !== "approved") candidates.push({type:"artwork_minor_review_required",id:x.archive_item_id,severity:"critical",message:"Revisão reforçada de menor está pendente."});
  }
  for (const x of uploads ?? []) {
    if (x.state === "failed") candidates.push({type:"artwork_storage_validation_failed",id:x.id,severity:"urgent",message:"Validação local do arquivo falhou."});
    else if (new Date(x.expires_at) < now && x.state !== "ready_for_review") candidates.push({type:"artwork_orphan_private_upload",id:x.id,severity:"attention",message:"Upload privado expirado aguarda cleanup."});
  }
  for (const x of jobs ?? []) if (["failed","dead_letter"].includes(x.status)) candidates.push({type:"artwork_processing_failed",id:x.id,severity:"urgent",message:"Processamento de derivadas falhou após tentativa controlada."});
  const active: string[] = [];
  for (const x of candidates) {
    const fingerprint = createHash("sha256").update(`${x.type}:${x.id}`).digest("hex");
    const {data: old} = await db.from("comun_admin_alerts").select("occurrence_count").eq("fingerprint",fingerprint).maybeSingle();
    await db.from("comun_admin_alerts").upsert({alert_type:x.type,severity:x.severity,title:"Arte dos Territórios exige atenção",sanitized_message:x.message,source_type:"territorial_artwork",source_id:x.id,fingerprint,status:"open",last_seen_at:now.toISOString(),occurrence_count:(old?.occurrence_count ?? 0)+1,resolved_at:null},{onConflict:"fingerprint"});
    active.push(fingerprint);
  }
  const {data: open} = await db.from("comun_admin_alerts").select("id,fingerprint").eq("source_type","territorial_artwork").in("status",["open","acknowledged"]);
  const resolved = (open ?? []).filter(x => !active.includes(x.fingerprint));
  for (const x of resolved) await db.from("comun_admin_alerts").update({status:"resolved",resolved_at:now.toISOString(),last_seen_at:now.toISOString()}).eq("id",x.id);
  return {active:candidates.length,resolved:resolved.length};
}
