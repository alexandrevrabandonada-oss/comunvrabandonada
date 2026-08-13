import "server-only";
import {
  isComunObservatoryEnvironmentSurfaceWaterEnabled,
  isComunObservatoryCityPanoramaEnabled,
  isComunObservatoryEssentialPowerInterruptionEnabled,
  isComunObservatorySidewalkAnalyticsEnabled,
  isComunObservatoryTerritorialContextEnabled,
  isComunObservatoryTransportProgrammedEnabled,
  isComunObservatoryTransportSystemMetricsEnabled,
} from "./comun-observatory-feature";
import { getCityPanoramaPublicDto } from "./comun-city-panorama";
import {
  createPublicEvidenceCitationV1,
  type PublicEvidenceCitationV1,
} from "./comun-public-evidence";

export async function resolveCurrentPublicEvidenceReference(
  refId: string,
): Promise<PublicEvidenceCitationV1 | null> {
  if (!isComunObservatoryCityPanoramaEnabled()) return null;
  if (!refId.startsWith("panorama:")) return null;
  const panorama = await getCityPanoramaPublicDto({
    territorialContextEnabled: isComunObservatoryTerritorialContextEnabled(),
    sidewalkAnalyticsEnabled: isComunObservatorySidewalkAnalyticsEnabled(),
    transportProgrammedEnabled: isComunObservatoryTransportProgrammedEnabled(),
    transportSystemMetricsEnabled: isComunObservatoryTransportSystemMetricsEnabled(),
    surfaceWaterEnabled: isComunObservatoryEnvironmentSurfaceWaterEnabled(),
    essentialPowerInterruptionEnabled:
      isComunObservatoryEssentialPowerInterruptionEnabled(),
  });
  const reference = panorama.evidenceReferences.find((item) => item.refId === refId);
  if (!reference) return null;
  return createPublicEvidenceCitationV1(reference);
}
