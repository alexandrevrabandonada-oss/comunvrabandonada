import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { EssentialPowerInterruptionsObservatory } from "@/components/comun-essential-power-interruption-observatory";
import {
  getPowerInterruptionRecordsPage,
  PowerInterruptionQueryError,
} from "@/lib/comun-essential-power-interruption-observatory";
import { readPublicPowerInterruptions } from "@/lib/comun-specialized-observatory-public";
import { specializedObservatoryMetadata } from "@/lib/comun-specialized-observatory-projection";
export const dynamic = "force-dynamic";
export function generateMetadata() {
  return specializedObservatoryMetadata(
    "/comun/observatorios/servicos-essenciais/energia",
    readPublicPowerInterruptions()?.projection ?? null,
  );
}
export default async function EssentialPowerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = readPublicPowerInterruptions();
  if (!result) notFound();
  const input = await searchParams;
  let recordsPage;
  try {
    recordsPage = getPowerInterruptionRecordsPage(input);
  } catch (error) {
    if (error instanceof PowerInterruptionQueryError) notFound();
    throw error;
  }
  return (
    <ComunShell>
      <EssentialPowerInterruptionsObservatory
        summary={result.dto}
        projection={result.projection}
        recordsPage={recordsPage}
      />
    </ComunShell>
  );
}
