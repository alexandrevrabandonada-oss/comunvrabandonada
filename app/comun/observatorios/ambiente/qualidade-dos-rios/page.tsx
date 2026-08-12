import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { ComunSurfaceWaterObservatory } from "@/components/comun-surface-water-observatory";
import { isComunObservatoryEnvironmentSurfaceWaterEnabled } from "@/lib/comun-observatory-feature";
import { getSurfaceWaterObservatoryPublicDto } from "@/lib/comun-observatory-surface-water";
export const dynamic = "force-dynamic";
export default function SurfaceWaterPage() { if (!isComunObservatoryEnvironmentSurfaceWaterEnabled()) notFound(); return <ComunShell><ComunSurfaceWaterObservatory dto={getSurfaceWaterObservatoryPublicDto()} /></ComunShell>; }
