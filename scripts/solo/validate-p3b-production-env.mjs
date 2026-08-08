const isHttps = (value) => {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const validKey = (value) => {
  if (!value || value.length > 128) return false;
  try {
    return Buffer.from(value, "base64url").byteLength === 32;
  } catch {
    return false;
  }
};

const result = {
  locationFlagExactEnabled:
    process.env.COMUN_RELATA_LOCATION_ENABLED === "enabled",
  locationKeyValid32Bytes: validKey(
    process.env.COMUN_RELATA_LOCATION_ENCRYPTION_KEY,
  ),
  relataPersistenceEnabled:
    process.env.COMUN_RELATA_PERSISTENCE_ENABLED === "enabled",
  supabaseHttps: isHttps(process.env.NEXT_PUBLIC_SUPABASE_URL),
  serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
};

result.combinedLocationGate =
  result.locationFlagExactEnabled &&
  result.locationKeyValid32Bytes &&
  result.relataPersistenceEnabled &&
  result.supabaseHttps &&
  result.serviceRolePresent;

process.stdout.write(`${JSON.stringify(result)}\n`);
