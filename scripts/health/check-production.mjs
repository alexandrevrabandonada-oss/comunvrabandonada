const apex = "https://comunsocial.online";
const routes = ["/comun", "/comun/explorar", "/comun/participar", "/comun/calcadas", "/comun/acervo", "/comun/arte", "/comun/radio"];
const forbidden = ["service_role", "exact_latitude", "exact_longitude", "object_key"];

for (const route of routes) {
  const response = await fetch(`${apex}${route}`, { redirect: "follow" });
  if (!response.ok) throw new Error(`${route} returned ${response.status}`);
  const body = (await response.text()).toLowerCase();
  for (const token of forbidden) {
    if (body.includes(token)) throw new Error(`${route} exposed forbidden marker ${token}`);
  }
}

const www = await fetch("https://www.comunsocial.online/comun", { redirect: "manual" });
if (www.status !== 308) throw new Error(`www redirect returned ${www.status}`);

const map = await fetch(`${apex}/maps/volta-redonda/volta-redonda.pmtiles`, {
  headers: { Range: "bytes=0-127" },
});
if (map.status !== 206 || !/^bytes 0-127\/\d+$/.test(map.headers.get("content-range") || "")) {
  throw new Error("PMTiles did not return a valid HTTP Range response");
}

const token = process.env.VERCEL_TOKEN;
const project = process.env.VERCEL_PROJECT_ID;
const team = process.env.VERCEL_TEAM_ID;
if (!token || !project || !team) throw new Error("Vercel read-only credentials are required");
const deployments = await fetch(
  `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(project)}&teamId=${encodeURIComponent(team)}&target=production&limit=1`,
  { headers: { Authorization: `Bearer ${token}` } },
);
if (!deployments.ok) throw new Error(`Vercel API returned ${deployments.status}`);
const latest = (await deployments.json()).deployments?.[0];
if (!latest || latest.state !== "READY") throw new Error(`Latest production deployment is ${latest?.state || "missing"}`);

console.log("COMUN_PRODUCTION_HEALTHY");
