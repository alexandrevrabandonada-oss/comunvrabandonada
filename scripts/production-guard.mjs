const PRODUCTION_HOSTS = new Set(["comunvrabandonada.vercel.app"]);
export const PRODUCTION_CHECKS_DISABLED_MESSAGE =
  "Production checks are disabled by default. Set ALLOW_PRODUCTION_CHECKS=1 only for release validation.";

export function assertProductionChecksAllowed(siteUrl) {
  if (!siteUrl) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(siteUrl);
  } catch {
    return;
  }

  const isProductionHost = PRODUCTION_HOSTS.has(parsedUrl.hostname.toLowerCase());
  if (isProductionHost && process.env.ALLOW_PRODUCTION_CHECKS !== "1") {
    console.error(`[fail] ${PRODUCTION_CHECKS_DISABLED_MESSAGE}`);
    process.exit(1);
  }
}
