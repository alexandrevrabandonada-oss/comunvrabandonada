export type P3bRuntimeEnvDiagnostic = {
  locationFlagExactEnabled: boolean;
  locationKeyValid32Bytes: boolean;
  relataPersistenceEnabled: boolean;
  supabaseHttps: boolean;
  serviceRolePresent: boolean;
  locationCapabilityEnabled: boolean;
};

function validLocationKey(value: string | undefined) {
  if (!value || value.length > 128) return false;
  try {
    return Buffer.from(value, "base64url").byteLength === 32;
  } catch {
    return false;
  }
}

function isHttpsSupabase(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function createP3bRuntimeEnvDiagnostic(
  env: Record<string, string | undefined>,
): P3bRuntimeEnvDiagnostic {
  const locationFlagExactEnabled =
    env.COMUN_RELATA_LOCATION_ENABLED === "enabled";
  const locationKeyValid32Bytes = validLocationKey(
    env.COMUN_RELATA_LOCATION_ENCRYPTION_KEY,
  );
  const relataPersistenceEnabled =
    env.COMUN_RELATA_PERSISTENCE_ENABLED === "enabled";
  const supabaseHttps = isHttpsSupabase(env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRolePresent = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

  return {
    locationFlagExactEnabled,
    locationKeyValid32Bytes,
    relataPersistenceEnabled,
    supabaseHttps,
    serviceRolePresent,
    locationCapabilityEnabled:
      locationFlagExactEnabled &&
      locationKeyValid32Bytes &&
      relataPersistenceEnabled &&
      supabaseHttps &&
      serviceRolePresent,
  };
}

export function isP3bStagedProductionHost(
  host: string,
  env: Record<string, string | undefined>,
) {
  const deploymentHost = env.VERCEL_URL ?? "";
  return (
    env.VERCEL_ENV === "production" &&
    Boolean(deploymentHost) &&
    host === deploymentHost &&
    host !== "comunsocial.online" &&
    host !== "www.comunsocial.online"
  );
}
