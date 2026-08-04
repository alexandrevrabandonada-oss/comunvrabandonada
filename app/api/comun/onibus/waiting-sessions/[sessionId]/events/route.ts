import { NextRequest } from "next/server";
import { dormant, getBusClient, invalid, ok, unavailable } from "../../../_utils";
import { hashBusSessionToken, isValidBusToken } from "@/lib/comun-bus-runtime";
import { WAITING_EVENT_TYPES } from "@/lib/comun-bus-domain";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const db = getBusClient();
  if (!db) return dormant();
  const { sessionId } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return invalid(); }
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !isValidBusToken(body.sessionToken) || !WAITING_EVENT_TYPES.includes(body.eventType as never)) return invalid("event_invalid");
  const observedAt = body.observedAt === undefined || body.observedAt === null ? null : new Date(String(body.observedAt));
  if (observedAt && Number.isNaN(observedAt.getTime())) return invalid("observed_at_invalid");
  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload : {};
  const { data, error } = await db.rpc("comun_bus_record_event", { p_token_hash: hashBusSessionToken(body.sessionToken as string), p_session_id: sessionId, p_event_type: body.eventType, p_observed_at: observedAt?.toISOString() ?? null, p_payload: payload });
  if (error) return error.message.includes("UNAVAILABLE") ? invalid("session_unavailable") : unavailable();
  return ok({ session: data });
}
