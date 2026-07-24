const VERCEL_TEAM_ID = "team_LBVwyK8FQMO7tA3hzVXXeumF";
const required = ["VERCEL_CANONICAL_PROJECT_ID", "VERCEL_LEGACY_PROJECT_ID"];
if (required.some((name) => !process.env[name])) {
  throw new Error("SOLO_DOMAIN_TRANSFER_CONTEXT_MISSING");
}
const {
  VERCEL_TOKEN: token,
  VERCEL_CANONICAL_PROJECT_ID: canonical,
  VERCEL_LEGACY_PROJECT_ID: legacy,
} = process.env;
const domains = ["comunsocial.online", "www.comunsocial.online"];

const verifyPublicCanonical = async () => {
  const apex = await fetch("https://comunsocial.online/comun", { redirect: "follow" });
  if (!apex.ok) throw new Error(`SOLO_DOMAIN_PUBLIC_APEX_INVALID:${apex.status}`);
  const www = await fetch("https://www.comunsocial.online", { redirect: "manual" });
  const location = www.headers.get("location") ?? "";
  if (www.status !== 308 || !/^https:\/\/comunsocial\.online(?:\/|$)/.test(location)) {
    throw new Error(`SOLO_DOMAIN_PUBLIC_WWW_INVALID:${www.status}`);
  }
  console.log("COMUN_DOMAIN_PUBLICLY_CANONICAL_TOKEN_UNAVAILABLE");
};

const api = async (method, route, body) => {
  const response = await fetch(`https://api.vercel.com${route}${route.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(VERCEL_TEAM_ID)}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`SOLO_VERCEL_DOMAIN_${method}_${response.status}`);
  return response.status === 204 ? null : response.json();
};
const projectDomains = async (project) => new Set(((await api("GET", `/v9/projects/${project}/domains`)).domains ?? []).map((domain) => domain.name));

if (!token?.trim()) {
  await verifyPublicCanonical();
  process.exit(0);
}

let canonicalBefore;
try {
  canonicalBefore = await projectDomains(canonical);
} catch (error) {
  if (/SOLO_VERCEL_DOMAIN_GET_(401|403)/.test(String(error?.message))) {
    await verifyPublicCanonical();
    process.exit(0);
  }
  throw error;
}
if (domains.every((domain) => canonicalBefore.has(domain))) {
  console.log("COMUN_DOMAIN_ALREADY_CANONICAL");
  process.exit(0);
}
const legacyBefore = await projectDomains(legacy);
if (!domains.every((domain) => legacyBefore.has(domain)) || domains.some((domain) => canonicalBefore.has(domain))) throw new Error("SOLO_DOMAIN_PRECONDITION_MISMATCH");
const moved = [];
try {
  for (const domain of [...domains].reverse()) await api("DELETE", `/v9/projects/${legacy}/domains/${encodeURIComponent(domain)}`);
  for (const domain of domains) {
    await api("POST", `/v10/projects/${canonical}/domains`, domain.startsWith("www.") ? { name: domain, redirect: "comunsocial.online", redirectStatusCode: 308 } : { name: domain });
    moved.push(domain);
  }
  const canonicalAfter = await projectDomains(canonical);
  if (!domains.every((domain) => canonicalAfter.has(domain))) throw new Error("SOLO_DOMAIN_POSTCONDITION_FAILED");
  console.log("COMUN_DOMAIN_CANONICAL_OK");
} catch (error) {
  for (const domain of moved) await api("DELETE", `/v9/projects/${canonical}/domains/${encodeURIComponent(domain)}`).catch(() => {});
  for (const domain of domains) await api("POST", `/v10/projects/${legacy}/domains`, domain.startsWith("www.") ? { name: domain, redirect: "comunsocial.online", redirectStatusCode: 308 } : { name: domain }).catch(() => {});
  throw error;
}
