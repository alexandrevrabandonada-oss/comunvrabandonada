import {
  COMUN_CANONICAL_ORIGIN,
  COMUN_PRIVATE_CRAWL_PATHS,
} from "../lib/comun-indexing-policy.ts";

function contentType(result) {
  return String(result.headers?.["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

export function inspectPilotRobots(result) {
  const reasons = [];
  if (result.status !== 200) reasons.push("http_status");
  if (contentType(result) !== "text/plain") reasons.push("content_type");
  const directives = String(result.html || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);
  // Exact pilot directives prevent a more specific Allow or user-agent group
  // from silently overriding the private-path exclusions.
  const expected = [
    "User-Agent: *",
    "Allow: /",
    ...COMUN_PRIVATE_CRAWL_PATHS.map((path) => `Disallow: ${path}`),
    `Sitemap: ${COMUN_CANONICAL_ORIGIN}/sitemap.xml`,
  ];
  if (
    directives.length !== expected.length ||
    directives[0]?.toLowerCase() !== "user-agent: *" ||
    !expected.every((line) => directives.some((value) => value === line))
  )
    reasons.push("pilot_directives");
  return { valid: reasons.length === 0, reasons };
}

export function inspectPilotSitemap(result) {
  const reasons = [];
  if (result.status !== 200) reasons.push("http_status");
  if (!["application/xml", "text/xml"].includes(contentType(result)))
    reasons.push("content_type");
  // The pilot contract is intentionally an empty, well-formed XML urlset.
  // Reject HTML, URLs (including private/query URLs), DTDs and arbitrary XML.
  const emptyUrlset =
    /^\s*(?:<\?xml version="1\.0" encoding="UTF-8"\?>\s*)?<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\s*<\/urlset>\s*$/;
  if (!emptyUrlset.test(String(result.html || "")))
    reasons.push("pilot_empty_urlset");
  return { valid: reasons.length === 0, reasons, submittedUrls: 0 };
}

export function inspectManifest(result) {
  const reasons = [];
  if (result.status !== 200) reasons.push("http_status");
  if (
    !["application/manifest+json", "application/json"].includes(
      contentType(result),
    )
  )
    reasons.push("content_type");
  try {
    const manifest = JSON.parse(result.html);
    if (
      !manifest ||
      typeof manifest.name !== "string" ||
      !manifest.name.trim() ||
      typeof manifest.start_url !== "string" ||
      manifest.start_url !== "/comun" ||
      !Array.isArray(manifest.icons) ||
      !manifest.icons.length ||
      !manifest.icons.every(
        (icon) =>
          typeof icon?.src === "string" &&
          /^\/icons\/[a-z0-9-]+\.png$/.test(icon.src),
      )
    )
      reasons.push("manifest_contract");
  } catch {
    reasons.push("invalid_json");
  }
  return { valid: reasons.length === 0, reasons };
}

export function hasPilotNoindexHeader(headers) {
  const directives = String(headers?.["x-robots-tag"] || "")
    .toLowerCase()
    .split(",")
    .map((value) => value.trim());
  return directives.includes("noindex") && directives.includes("noarchive");
}
