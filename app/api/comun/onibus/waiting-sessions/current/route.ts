import { NextRequest } from "next/server";
import { dormant, getBusClient, invalid, ok, unavailable } from "../../_utils";
import { hashBusSessionToken, isValidBusToken } from "@/lib/comun-bus-runtime";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = getBusClient();
  if (!db) return dormant();
  const token = request.nextUrl.searchParams.get("sessionToken");
  if (!isValidBusToken(token)) return invalid("session_proof_invalid");
  const { data, error } = await db.rpc("comun_bus_current_waiting", { p_token_hash: hashBusSessionToken(token) });
  if (error) return unavailable();
  return ok({ session: data });
}
