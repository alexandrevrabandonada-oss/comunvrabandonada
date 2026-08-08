import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { isComunBusLocalPilotEnabled } from "@/lib/comun-bus-feature";
import { isComunBusRelataEnabled } from "@/lib/comun-bus-feature";
import { createComunBusClient } from "@/lib/comun-bus-runtime";
import { ComunBusLocalPilot } from "@/components/comun-bus-local-pilot";
import { ComunBusRelataIntake } from "@/components/comun-bus-relata-intake";
import { isComunRelataAttachmentsEnabled, isComunRelataLocationEnabled } from "@/lib/comun-relata-evidence-feature";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ComunBusPage() {
  if (isComunBusRelataEnabled()) return <ComunShell showSyntheticNotice={false}><ComunBusRelataIntake attachmentsEnabled={isComunRelataAttachmentsEnabled()} locationEnabled={isComunRelataLocationEnabled()} /></ComunShell>;
  if (!isComunBusLocalPilotEnabled()) notFound();
  const db = createComunBusClient();
  const [linesResult, stopsResult, observatoryResult, channelResult] = await Promise.all([
    db.rpc("comun_bus_list_lines"), db.rpc("comun_bus_list_stops"), db.rpc("comun_bus_get_observatory"), db.rpc("comun_bus_get_channel_candidate"),
  ]);
  const lines = Array.isArray(linesResult.data) ? linesResult.data : [];
  const stops = Array.isArray(stopsResult.data) ? stopsResult.data : [];
  const firstLine = lines[0]?.id;
  const timetable = firstLine ? (await db.rpc("comun_bus_get_timetable", { p_line_id: firstLine })).data : [];
  return <ComunShell><div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"><ComunBusLocalPilot lines={lines} stops={stops} timetable={Array.isArray(timetable) ? timetable : []} observatory={Array.isArray(observatoryResult.data) ? observatoryResult.data : []} channel={channelResult.data && typeof channelResult.data === "object" ? channelResult.data : null} /></div></ComunShell>;
}
