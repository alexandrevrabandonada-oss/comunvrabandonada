import { dormant, getBusClient, ok, unavailable } from "../../_utils";

export const runtime = "nodejs";

export async function GET() {
  const db = getBusClient();
  if (!db) return dormant();
  const { data, error } = await db.rpc("comun_bus_get_channel_candidate");
  if (error) return unavailable();
  return ok({ channel: data, sendingEnabled: false, deepLinkEnabled: false });
}
