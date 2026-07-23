import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const required = ["PR", "SHA", "VERCEL_TOKEN", "VERCEL_TEAM_ID", "VERCEL_CANONICAL_PROJECT_ID"];
if (required.some((name) => !process.env[name])) throw new Error("SOLO_PREVIEW_CONTEXT_MISSING");
const api = (args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const checks = JSON.parse(api(["pr", "checks", process.env.PR, "--json", "name,state,link"]));
const failed = checks.filter((check) => !new Set(["SUCCESS", "SKIPPED", "NEUTRAL"]).has(check.state));
if (failed.length) throw new Error(`SOLO_PREVIEW_CHECKS_NOT_GREEN:${failed.map((check) => check.name).join(",")}`);
const query = new URLSearchParams({
  projectId: process.env.VERCEL_CANONICAL_PROJECT_ID,
  teamId: process.env.VERCEL_TEAM_ID,
  limit: "20",
});
const deploymentsResponse = await fetch(`https://api.vercel.com/v6/deployments?${query}`, {
  headers: { authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
});
if (!deploymentsResponse.ok) throw new Error(`SOLO_VERCEL_PREVIEW_API_${deploymentsResponse.status}`);
const deployments = (await deploymentsResponse.json()).deployments ?? [];
const deployment = deployments.find(
  (item) =>
    item.meta?.githubCommitSha === process.env.SHA &&
    item.target !== "production" &&
    item.state === "READY",
);
if (!deployment?.url) throw new Error("SOLO_VERCEL_PREVIEW_NOT_FOUND");
const temp = mkdtempSync(path.join(tmpdir(), "comun-preview-"));
const vercelCurl = (route, { range = false } = {}) => {
  const body = path.join(temp, "body");
  const headers = path.join(temp, "headers");
  const curlArgs = [
    "--silent",
    "--show-error",
    "--output",
    body,
    "--dump-header",
    headers,
    ...(range ? ["--range", "0-127"] : []),
  ];
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "vercel@50.28.0",
      "curl",
      route,
      "--deployment",
      deployment.url,
      "--token",
      process.env.VERCEL_TOKEN,
      "--scope",
      "alexandrevrabandonada-oss-projects",
      "--",
      ...curlArgs,
    ],
    { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(`SOLO_VERCEL_PREVIEW_CURL_FAILED:${route}`);
  const rawHeaders = readFileSync(headers, "utf8");
  const statuses = [...rawHeaders.matchAll(/^HTTP\/\S+\s+(\d{3})/gim)];
  const status = Number(statuses.at(-1)?.[1]);
  return { status, headers: rawHeaders };
};
try {
  for (const route of ["/comun", "/comun/explorar", "/comun/participar", "/comun/calcadas", "/comun/acervo", "/comun/arte", "/comun/radio", "/comun/minha-area", "/comun/caixa"]) {
    const response = vercelCurl(route);
    if (response.status < 200 || response.status >= 400) {
      throw new Error(`SOLO_VERCEL_PREVIEW_HTTP_${response.status}:${route}`);
    }
  }
  const range = vercelCurl("/maps/volta-redonda/volta-redonda.pmtiles", { range: true });
  if (range.status !== 206 || !/^content-range:\s*bytes 0-127\/\d+/im.test(range.headers)) {
    throw new Error("SOLO_PMTILES_PREVIEW_RANGE_INVALID");
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
console.log(`COMUN_PREVIEW_GREEN:${deployment.uid}`);
