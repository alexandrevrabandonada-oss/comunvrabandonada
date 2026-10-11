import "server-only";
import { cache } from "react";
import { getSurfaceWaterObservatoryPublicDto } from "./comun-observatory-surface-water";
import { getPowerInterruptionSummaryDto } from "./comun-essential-power-interruption-observatory";
import {
  isComunObservatoryEnvironmentSurfaceWaterEnabled,
  isComunObservatoryEssentialPowerInterruptionEnabled,
} from "./comun-observatory-feature";
import {
  surfaceWaterProjection,
  powerInterruptionProjection,
} from "./comun-specialized-observatory-projection";

export const readPublicSurfaceWater = cache(() => {
  if (!isComunObservatoryEnvironmentSurfaceWaterEnabled()) return null;
  const dto = getSurfaceWaterObservatoryPublicDto();
  return { dto, projection: surfaceWaterProjection(dto) };
});
export const readPublicPowerInterruptions = cache(() => {
  if (!isComunObservatoryEssentialPowerInterruptionEnabled()) return null;
  const dto = getPowerInterruptionSummaryDto();
  return { dto, projection: powerInterruptionProjection(dto) };
});
