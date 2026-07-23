import { readFileSync } from "node:fs";

const minutes = Number(process.argv.find((arg) => arg.startsWith("--minutes="))?.slice(10) ?? 15);
const requestedDomain = process.argv.find((arg) => arg.startsWith("--domain="))?.slice(9);
const publicMode = process.argv.includes("--public");
if (!Number.isInteger(minutes) || minutes < 1 || minutes > 30) throw new Error("SOLO_MONITOR_INPUT_INVALID");
if (!new Set(["comunvrabandonada.vercel.app", "comunsocial.online"]).has(requestedDomain)) {
  throw new Error("SOLO_MONITOR_DOMAIN_NOT_ALLOWLISTED");
}
if (publicMode !== (requestedDomain === "comunsocial.online")) throw new Error("SOLO_MONITOR_PHASE_INVALID");

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
if (!repository || !token || !process.env.GITHUB_EVENT_PATH) throw new Error("SOLO_GITHUB_DEPLOYMENT_CONTEXT_MISSING");
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const prNumber = event.pull_request?.number;
if (!prNumber) throw new Error("SOLO_PROMOTION_PR_CONTEXT_MISSING");

const github = async (route) => {
  const response = await fetch(`https://api.github.com/repos/${repository}${route}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`SOLO_GITHUB_DEPLOYMENT_READ_FAILED:${response.status}`);
  return response.json();
};

let mergeSha;
for (let attempt = 0; attempt < 20; attempt += 1) {
  const pull = await github(`/pulls/${prNumber}`);
  mergeSha = pull.merge_commit_sha;
  if (pull.merged && mergeSha) break;
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (!mergeSha) throw new Error("SOLO_MERGE_SHA_NOT_FOUND");

let vercelGreen = false;
for (let attempt = 0; attempt < 40; attempt += 1) {
  const [status, checks] = await Promise.all([
    github(`/commits/${mergeSha}/status`),
    github(`/commits/${mergeSha}/check-runs?per_page=100`),
  ]);
  const statusGreen = (status.statuses ?? []).some((item) => /vercel/i.test(item.context ?? "") && item.state === "success");
  const checksGreen = (checks.check_runs ?? []).some((item) => /vercel/i.test(item.name ?? "") && item.conclusion === "success");
  if (statusGreen || checksGreen) {
    vercelGreen = true;
    break;
  }
  const failed = [
    ...(status.statuses ?? []).filter((item) => /vercel/i.test(item.context ?? "") && ["failure", "error"].includes(item.state)),
    ...(checks.check_runs ?? []).filter((item) => /vercel/i.test(item.name ?? "") && ["failure", "cancelled", "timed_out"].includes(item.conclusion)),
  ];
  if (failed.length) throw new Error("SOLO_MAIN_VERCEL_DEPLOYMENT_FAILED");
  await new Promise((resolve) => setTimeout(resolve, 15000));
}
if (!vercelGreen) throw new Error("SOLO_MAIN_DEPLOYMENT_TIMEOUT");

const domain = requestedDomain;
for (let attempt = 0; attempt < minutes; attempt += 1) {
  for (const route of ["/comun", "/comun/calcadas", "/comun/acervo"]) {
    const response = await fetch(`https://${domain}${route}`, { redirect: "follow" });
    if (!response.ok) throw new Error(`SOLO_PRODUCTION_SMOKE_HTTP_${response.status}:${route}`);
  }
  const range = await fetch(`https://${domain}/maps/volta-redonda/volta-redonda.pmtiles`, {
    headers: { range: "bytes=0-127" },
  });
  if (range.status !== 206 || !/^bytes 0-127\/\d+$/.test(range.headers.get("content-range") ?? "")) {
    throw new Error("SOLO_PRODUCTION_PMTILES_RANGE_INVALID");
  }
  if (publicMode) {
    const www = await fetch("https://www.comunsocial.online", { redirect: "manual" });
    if (www.status !== 308 || !/^https:\/\/comunsocial\.online(?:\/|$)/.test(www.headers.get("location") ?? "")) {
      throw new Error("SOLO_PUBLIC_WWW_REDIRECT_INVALID");
    }
  }
  if (attempt + 1 < minutes) await new Promise((resolve) => setTimeout(resolve, 60000));
}
console.log(`SOLO_PRODUCTION_GREEN:${domain}:${publicMode ? "public" : "canonical"}`);
