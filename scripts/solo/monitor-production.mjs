const minutes = Number(process.argv.find((arg) => arg.startsWith("--minutes="))?.slice(10) ?? 15);
const domain = process.argv.find((arg) => arg.startsWith("--domain="))?.slice(9);
if (!domain || !Number.isInteger(minutes) || minutes < 1 || minutes > 30) throw new Error("SOLO_MONITOR_INPUT_INVALID");
const params = new URLSearchParams({ projectId: process.env.VERCEL_CANONICAL_PROJECT_ID, limit: "20", target: "production" });
if (process.env.VERCEL_TEAM_ID) params.set("teamId", process.env.VERCEL_TEAM_ID);
const headers = { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` };
let deployment;
for (let attempt = 0; attempt < 40; attempt += 1) {
  const response = await fetch(`https://api.vercel.com/v6/deployments?${params}`, { headers });
  if (!response.ok) throw new Error("SOLO_VERCEL_DEPLOYMENT_READ_FAILED");
  const body = await response.json();
  deployment = body.deployments?.find((item) => item.readyState === "READY" && item.meta?.githubCommitSha === process.env.APP_SHA);
  if (deployment) break;
  await new Promise((resolve) => setTimeout(resolve, 15000));
}
if (!deployment) throw new Error("SOLO_MAIN_DEPLOYMENT_TIMEOUT");
for (let attempt = 0; attempt < minutes; attempt += 1) {
  for (const route of ["/comun", "/comun/calcadas", "/comun/acervo"]) {
    const response = await fetch(`https://${domain}${route}`, { redirect: "follow" });
    if (!response.ok) throw new Error(`SOLO_PRODUCTION_SMOKE_HTTP_${response.status}:${route}`);
  }
  if (attempt + 1 < minutes) await new Promise((resolve) => setTimeout(resolve, 60000));
}
console.log("SOLO_PRODUCTION_GREEN");
