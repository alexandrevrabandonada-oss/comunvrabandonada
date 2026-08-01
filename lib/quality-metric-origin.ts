const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseOrigin(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isAllowedQualityMetricOrigin({
  origin,
  requestUrl,
  environment = process.env.NODE_ENV,
}: {
  origin: string | null;
  requestUrl: string;
  environment?: string;
}) {
  if (!origin) return true;

  const request = parseOrigin(requestUrl);
  const candidate = parseOrigin(origin);
  if (!request || !candidate) return false;
  if (candidate.origin === request.origin) return true;

  // Next dev can canonicalize 127.0.0.1 to localhost internally. Treat the
  // aliases as equivalent only outside production and only on the same port.
  return (
    environment !== "production" &&
    LOOPBACK_HOSTS.has(request.hostname) &&
    LOOPBACK_HOSTS.has(candidate.hostname) &&
    request.protocol === candidate.protocol &&
    request.port === candidate.port
  );
}
