import { dormant, getBusClient, ok, unavailable } from "../_utils";

export const runtime = "nodejs";

export async function GET() {
  const db = getBusClient();
  if (!db) return dormant();
  const { data, error } = await db.rpc("comun_bus_get_observatory");
  if (error) return unavailable();
  return ok({ visibility: "local_only", snapshots: Array.isArray(data) ? data : [] });
}
