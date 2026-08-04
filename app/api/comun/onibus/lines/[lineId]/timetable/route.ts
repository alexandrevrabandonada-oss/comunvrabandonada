import { dormant, getBusClient, invalid, ok, unavailable } from "../../../_utils";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const db = getBusClient();
  if (!db) return dormant();
  const { lineId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(lineId)) return invalid("line_invalid");
  const { data, error } = await db.rpc("comun_bus_get_timetable", { p_line_id: lineId });
  if (error) return unavailable();
  return ok({ timetable: Array.isArray(data) ? data : [] });
}
