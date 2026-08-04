import { NextRequest } from "next/server";
import { dormant, getBusClient, invalid, ok, unavailable } from "../_utils";
import { hashBusSessionToken, isValidBusToken } from "@/lib/comun-bus-runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const db = getBusClient();
  if (!db) return dormant();
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return invalid(); }
  const token = body.sessionToken;
  if (!isValidBusToken(token) || typeof body.lineId !== "string" || typeof body.directionId !== "string" || typeof body.stopId !== "string" || typeof body.serviceDate !== "string") return invalid("session_fields_invalid");
  const { data, error } = await db.rpc("comun_bus_start_waiting", {
    p_token_hash: hashBusSessionToken(token),
    p_line_id: body.lineId,
    p_direction_id: body.directionId,
    p_stop_id: body.stopId,
    p_timetable_version_id: typeof body.timetableVersionId === "string" ? body.timetableVersionId : null,
    p_service_date: body.serviceDate,
    p_scheduled_time: typeof body.scheduledTime === "string" ? body.scheduledTime : null,
  });
  if (error) return error.message.includes("INVALID") ? invalid("session_fields_invalid") : unavailable();
  return ok({ session: data }, 201);
}
