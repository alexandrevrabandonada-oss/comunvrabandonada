import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { ComunSurfaceWaterObservatory } from "@/components/comun-surface-water-observatory";
import { readPublicSurfaceWater } from "@/lib/comun-specialized-observatory-public";
import { specializedObservatoryMetadata } from "@/lib/comun-specialized-observatory-projection";
export const dynamic = "force-dynamic";
export function generateMetadata() {
  return specializedObservatoryMetadata(
    "/comun/observatorios/ambiente/qualidade-dos-rios",
    readPublicSurfaceWater()?.projection ?? null,
  );
}
export default function SurfaceWaterPage() {
  const result = readPublicSurfaceWater();
  if (!result) notFound();
  return (
    <ComunShell>
      <ComunSurfaceWaterObservatory
        dto={result.dto}
        projection={result.projection}
      />
    </ComunShell>
  );
}
