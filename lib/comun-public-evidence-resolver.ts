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
  createDenunciasPublicEvidenceCitationV1,
  type PublicEvidenceCitationV1,
} from "./comun-public-evidence";
import { isComunDenunciasPublicMapEnabled } from "./comun-denuncias-public-map-feature";
import { getComunDenunciasPublicMapProblem } from "./server/comun-denuncias-public-map-runtime";

export async function resolveCurrentPublicEvidenceReference(
  refId: string,
): Promise<PublicEvidenceCitationV1 | null> {
  if (refId.startsWith("denuncias:")) {
    if (!isComunDenunciasPublicMapEnabled()) return null;
    const publicId = refId.slice("denuncias:".length);
    const problem = await getComunDenunciasPublicMapProblem(publicId);
    if (!problem) return null;
    return createDenunciasPublicEvidenceCitationV1({
      publicId: problem.publicId,
      category: problem.category,
      reportCount: problem.reportCount,
      firstObservedDate: problem.firstSeenDate,
      lastActivityDate: problem.lastActivityDate,
      policyVersion: problem.policyVersion,
      location: { uncertaintyRadiusMeters: problem.location.uncertaintyRadiusMeters },
    });
  }
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
