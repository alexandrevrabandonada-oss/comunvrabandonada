import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { EssentialPowerInterruptionsObservatory } from "@/components/comun-essential-power-interruption-observatory";
import { isComunObservatoryEssentialPowerInterruptionEnabled } from "@/lib/comun-observatory-feature";
import { getPowerInterruptionRecordsPage, getPowerInterruptionSummaryDto, PowerInterruptionQueryError } from "@/lib/comun-essential-power-interruption-observatory";
export const dynamic = "force-dynamic";
export default async function EssentialPowerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isComunObservatoryEssentialPowerInterruptionEnabled()) notFound();
  const input = await searchParams;
  let recordsPage;
  try { recordsPage = getPowerInterruptionRecordsPage(input); }
  catch (error) { if (error instanceof PowerInterruptionQueryError) notFound(); throw error; }
  return <ComunShell><EssentialPowerInterruptionsObservatory summary={getPowerInterruptionSummaryDto()} recordsPage={recordsPage} /></ComunShell>;
}
