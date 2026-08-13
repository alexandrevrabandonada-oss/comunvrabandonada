import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { ComunCityPanorama } from "@/components/comun-city-panorama";
import {
  isComunObservatoryCityPanoramaEnabled,
  isComunObservatoryEnvironmentSurfaceWaterEnabled,
  isComunObservatoryEssentialPowerInterruptionEnabled,
  isComunObservatorySidewalkAnalyticsEnabled,
  isComunObservatoryTerritorialContextEnabled,
  isComunObservatoryTransportProgrammedEnabled,
  isComunObservatoryTransportSystemMetricsEnabled,
} from "@/lib/comun-observatory-feature";
import { getCityPanoramaPublicDto } from "@/lib/comun-city-panorama";

export const dynamic = "force-dynamic";

export default async function CityPanoramaPage() {
  if (!isComunObservatoryCityPanoramaEnabled()) notFound();
  const dto = await getCityPanoramaPublicDto({
    territorialContextEnabled: isComunObservatoryTerritorialContextEnabled(),
    sidewalkAnalyticsEnabled: isComunObservatorySidewalkAnalyticsEnabled(),
    transportProgrammedEnabled: isComunObservatoryTransportProgrammedEnabled(),
    transportSystemMetricsEnabled: isComunObservatoryTransportSystemMetricsEnabled(),
    surfaceWaterEnabled: isComunObservatoryEnvironmentSurfaceWaterEnabled(),
    essentialPowerInterruptionEnabled: isComunObservatoryEssentialPowerInterruptionEnabled(),
  });
  return <ComunShell><ComunCityPanorama dto={dto} /></ComunShell>;
}
