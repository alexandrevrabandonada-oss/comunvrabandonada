import { NextRequest } from "next/server";
import { dormant, getBusClient, invalid, ok, unavailable } from "../../../_utils";
import { hashBusSessionToken, isValidBusToken } from "@/lib/comun-bus-runtime";
import { sanitizePreview, BUS_PROBLEM_KINDS, type BusProblemKind } from "@/lib/comun-bus-domain";
import { createComunRelataPersistenceClient } from "@/lib/comun-relata-persistence";
import { isComunRelataPersistenceEnabled } from "@/lib/comun-relata-persistence";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const busDb = getBusClient();
  if (!busDb) return dormant();
  if (!isComunRelataPersistenceEnabled()) return unavailable();
  const { sessionId } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return invalid(); }
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !isValidBusToken(body.sessionToken) || typeof body.receiptSecret !== "string" || !/^[A-Za-z0-9_-]{32,160}$/.test(body.receiptSecret) || typeof body.idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{32,160}$/.test(body.idempotencyKey)) return invalid("relata_fields_invalid");
  const kind = BUS_PROBLEM_KINDS.includes(body.problemKind as BusProblemKind) ? body.problemKind as BusProblemKind : "route_or_timetable_information";
  const preview = sanitizePreview(body);
  const relata = createComunRelataPersistenceClient();
  const text = typeof body.text === "string" && body.text.trim().length >= 8 ? body.text.trim().slice(0, 600) : "Observação privada de transporte coletivo.";
  const created = await relata.rpc("comun_relata_create", { p_idempotency_key: body.idempotencyKey, p_receipt_secret: body.receiptSecret, p_original_text: text, p_answers: {}, p_category: "other", p_urgency: "attention", p_rule_version: "relata-routing-v1", p_decision: { category: "public_transport", problemKind: kind, source: "comun-bus-local-48-0e" }, p_privacy_class: "restricted", p_consent_version: "relata-consent-v1" });
  if (created.error || !Array.isArray(created.data) || !created.data[0]) return unavailable();
  const receipt = created.data[0] as { protocol: string };
  const linked = await busDb.rpc("comun_bus_link_relata", { p_token_hash: hashBusSessionToken(body.sessionToken as string), p_session_id: sessionId, p_protocol: receipt.protocol, p_preview: preview, p_problem_kind: kind, p_description: typeof body.description === "string" ? body.description : text });
  if (linked.error) return unavailable();
  return ok({ protocol: receipt.protocol, noOfficialSend: true, sentToStmu: false, preview: { ...preview, protocol: receipt.protocol } }, 201);
}
