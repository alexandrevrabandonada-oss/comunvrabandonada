import { requiredEnv } from "./lib.mjs";

requiredEnv(["VERCEL_TOKEN", "VERCEL_TEAM_ID", "VERCEL_CANONICAL_PROJECT_ID", "VERCEL_LEGACY_PROJECT_ID"]);
const { VERCEL_TOKEN: token, VERCEL_TEAM_ID: team, VERCEL_CANONICAL_PROJECT_ID: canonical, VERCEL_LEGACY_PROJECT_ID: legacy } = process.env;
const domains = ["comunsocial.online", "www.comunsocial.online"];

async function api(method, path, body) {
  const response = await fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`VERCEL_API_${method}_${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function projectDomains(project) {
  const data = await api("GET", `/v9/projects/${project}/domains`);
  return new Set((data.domains ?? []).map((domain) => domain.name));
}

const legacyBefore = await projectDomains(legacy);
const canonicalBefore = await projectDomains(canonical);
if (!domains.every((domain) => legacyBefore.has(domain)) || domains.some((domain) => canonicalBefore.has(domain))) throw new Error("PR23_DOMAIN_PRECONDITION_MISMATCH");

const moved = [];
try {
  for (const domain of domains) await api("DELETE", `/v9/projects/${legacy}/domains/${encodeURIComponent(domain)}`);
  for (const domain of domains) {
    await api("POST", `/v10/projects/${canonical}/domains`, domain.startsWith("www.") ? { name: domain, redirect: "comunsocial.online", redirectStatusCode: 308 } : { name: domain });
    moved.push(domain);
  }
  const canonicalAfter = await projectDomains(canonical);
  if (!domains.every((domain) => canonicalAfter.has(domain))) throw new Error("PR23_DOMAIN_POSTCONDITION_FAILED");
  console.log("PR23_DOMAIN_TRANSFER_OK");
} catch (error) {
  for (const domain of moved) await api("DELETE", `/v9/projects/${canonical}/domains/${encodeURIComponent(domain)}`).catch(() => {});
  for (const domain of domains) await api("POST", `/v10/projects/${legacy}/domains`, domain.startsWith("www.") ? { name: domain, redirect: "comunsocial.online", redirectStatusCode: 308 } : { name: domain }).catch(() => {});
  throw error;
}
