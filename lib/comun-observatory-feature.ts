import { isComunSidewalkPublicProjectionEnabled } from "./comun-sidewalk-p4-feature";

export const COMUN_OBSERVATORIES_FOUNDATION_FLAG =
  "COMUN_OBSERVATORIES_FOUNDATION_ENABLED" as const;
export const COMUN_OBSERVATORY_SIDEWALK_ADAPTER_FLAG =
  "COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED" as const;
export const COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_FLAG =
  "COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_ENABLED" as const;
export const COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_FLAG =
  "COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_ENABLED" as const;
export const COMUN_OBSERVATORY_TRANSPORT_SYSTEM_METRICS_FLAG =
  "COMUN_OBSERVATORY_TRANSPORT_SYSTEM_METRICS_ENABLED" as const;
export const COMUN_OBSERVATORY_TERRITORIAL_CONTEXT_FLAG =
  "COMUN_OBSERVATORY_TERRITORIAL_CONTEXT_ENABLED" as const;
export const COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_FLAG =
  "COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_ENABLED" as const;
export const COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_FLAG =
  "COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_ENABLED" as const;
export const COMUN_OBSERVATORY_CITY_PANORAMA_FLAG =
  "COMUN_OBSERVATORY_CITY_PANORAMA_ENABLED" as const;

export function isComunObservatoriesFoundationEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_OBSERVATORIES_FOUNDATION_FLAG] === "enabled";
}

export function isComunObservatorySidewalkAdapterEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    isComunObservatoriesFoundationEnabled(env) &&
    env[COMUN_OBSERVATORY_SIDEWALK_ADAPTER_FLAG] === "enabled" &&
    isComunSidewalkPublicProjectionEnabled(env)
  );
}

export function isComunObservatorySidewalkAnalyticsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    isComunObservatorySidewalkAdapterEnabled(env) &&
    env[COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_FLAG] === "enabled"
  );
}

export function isComunObservatoryTransportProgrammedEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    isComunObservatoriesFoundationEnabled(env) &&
    env[COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_FLAG] === "enabled"
  );
}

export function isComunObservatoryTransportSystemMetricsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    isComunObservatoryTransportProgrammedEnabled(env) &&
    env[COMUN_OBSERVATORY_TRANSPORT_SYSTEM_METRICS_FLAG] === "enabled"
  );
}

export function isComunObservatoryTerritorialContextEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    isComunObservatoriesFoundationEnabled(env) &&
    env[COMUN_OBSERVATORY_TERRITORIAL_CONTEXT_FLAG] === "enabled"
  );
}

export function isComunObservatoryEnvironmentSurfaceWaterEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return isComunObservatoriesFoundationEnabled(env) && env[COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_FLAG] === "enabled";
}

export function isComunObservatoryEssentialPowerInterruptionEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    isComunObservatoriesFoundationEnabled(env) &&
    env[COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_FLAG] === "enabled"
  );
}

export function isComunObservatoryCityPanoramaEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    isComunObservatoriesFoundationEnabled(env) &&
    env[COMUN_OBSERVATORY_CITY_PANORAMA_FLAG] === "enabled"
  );
}
