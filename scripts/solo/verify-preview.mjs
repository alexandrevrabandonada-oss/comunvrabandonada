import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const required = ["PR", "SHA", "VERCEL_TOKEN", "VERCEL_TEAM_ID", "VERCEL_CANONICAL_PROJECT_ID"];
if (required.some((name) => !process.env[name])) throw new Error("SOLO_PREVIEW_CONTEXT_MISSING");
const api = (args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const checks = JSON.parse(api(["pr", "checks", process.env.PR, "--json", "name,state,link"]));
const requiredChecks = ["FAST / COMUN_CI_GREEN", "FULL / COMUN_CI_GREEN", "Vercel"];
const missingOrFailed = requiredChecks.filter(
  (name) => !checks.some((check) => check.name === name && check.state === "SUCCESS"),
);
if (missingOrFailed.length) {
  throw new Error(`SOLO_PREVIEW_CHECKS_NOT_GREEN:${missingOrFailed.join(",")}`);
}
const repository = process.env.GITHUB_REPOSITORY ?? "alexandrevrabandonada-oss/comunvrabandonada";
const deployments = JSON.parse(
  api(["api", `repos/${repository}/deployments?sha=${process.env.SHA}&per_page=20`]),
);
const deployment = deployments.find(
  (item) => item.sha === process.env.SHA && item.environment === "Preview",
);
if (!deployment?.id) throw new Error("SOLO_VERCEL_PREVIEW_NOT_FOUND");
const deploymentStatuses = JSON.parse(
  api(["api", `repos/${repository}/deployments/${deployment.id}/statuses`]),
);
const successfulStatus = deploymentStatuses.find(
  (status) => status.state === "success" && status.environment_url,
);
if (!successfulStatus) throw new Error("SOLO_VERCEL_PREVIEW_NOT_READY");
const deploymentUrl = new URL(successfulStatus.environment_url).host;
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
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "--yes",
      "vercel@50.28.0",
      "curl",
      route,
      "--deployment",
      deploymentUrl,
      "--token",
      process.env.VERCEL_TOKEN,
      "--scope",
      "alexandrevrabandonada-oss-projects",
      "--",
      ...curlArgs,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        VERCEL_ORG_ID: process.env.VERCEL_TEAM_ID,
        VERCEL_PROJECT_ID: process.env.VERCEL_CANONICAL_PROJECT_ID,
      },
      maxBuffer: 5 * 1024 * 1024,
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    const diagnostic = `${result.error?.message ?? ""} ${result.stderr ?? ""} ${result.stdout ?? ""}`
      .replaceAll(process.env.VERCEL_TOKEN, "[redacted]")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    throw new Error(`SOLO_VERCEL_PREVIEW_CURL_FAILED:${route}:${result.status}:${diagnostic}`);
  }
  const rawHeaders = readFileSync(headers, "utf8");
  const statuses = [...rawHeaders.matchAll(/^HTTP\/\S+\s+(\d{3})/gim)];
  const status = Number(statuses.at(-1)?.[1]);
  return { status, headers: rawHeaders };
};
try {
  for (const route of ["/comun", "/comun/explorar", "/comun/participar", "/comun/calcadas", "/comun/acervo", "/comun/arte", "/comun/radio", "/comun/minha-participacao", "/comun/caixa-de-entrada"]) {
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
console.log(`COMUN_PREVIEW_GREEN:${deployment.id}`);
