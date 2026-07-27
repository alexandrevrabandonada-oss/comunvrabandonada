import { readFileSync } from "node:fs";

const pausedMessage =
  "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.";
const canonicalDomain = "comunvrabandonada.vercel.app";
const publicDomain = "comunsocial.online";

export function parseMonitorOptions(argv) {
  const minutes = Number(
    argv.find((arg) => arg.startsWith("--minutes="))?.slice(10) ?? 15,
  );
  const domain = argv.find((arg) => arg.startsWith("--domain="))?.slice(9);
  const publicMode = argv.includes("--public");
  const activationMode = argv.includes("--activation");

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 30)
    throw new Error("SOLO_MONITOR_INPUT_INVALID");
  if (!new Set([canonicalDomain, publicDomain]).has(domain))
    throw new Error("SOLO_MONITOR_DOMAIN_NOT_ALLOWLISTED");
  if (publicMode !== (domain === publicDomain))
    throw new Error("SOLO_MONITOR_PHASE_INVALID");
  if (activationMode && (publicMode || domain !== canonicalDomain))
    throw new Error("SOLO_ACTIVATION_SMOKE_INPUT_INVALID");

  return { minutes, domain, publicMode, activationMode };
}

export function smokeRoutes({ activationMode }) {
  return activationMode
    ? [
        "/comun",
        "/comun/calcadas",
        "/comun/acervo",
        "/comun/mapa/contribuir?origem=calcadas",
      ]
    : ["/comun", "/comun/calcadas", "/comun/acervo"];
}

export function assertActivationContributionAvailable(body) {
  if (String(body).includes(pausedMessage))
    throw new Error("SOLO_ACTIVATION_SMOKE_CONTRIBUTION_STILL_PAUSED");
}

async function waitForMergedVercelDeployment({ env, fetchImpl, sleep }) {
  const repository = env.GITHUB_REPOSITORY;
  const token = env.GH_TOKEN;
  if (!repository || !token || !env.GITHUB_EVENT_PATH)
    throw new Error("SOLO_GITHUB_DEPLOYMENT_CONTEXT_MISSING");
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  const prNumber = event.pull_request?.number;
  if (!prNumber) throw new Error("SOLO_PROMOTION_PR_CONTEXT_MISSING");

  const github = async (route) => {
    const response = await fetchImpl(
      `https://api.github.com/repos/${repository}${route}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
        },
      },
    );
    if (!response.ok)
      throw new Error(`SOLO_GITHUB_DEPLOYMENT_READ_FAILED:${response.status}`);
    return response.json();
  };

  let mergeSha;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pull = await github(`/pulls/${prNumber}`);
    mergeSha = pull.merge_commit_sha;
    if (pull.merged && mergeSha) break;
    await sleep(5000);
  }
  if (!mergeSha) throw new Error("SOLO_MERGE_SHA_NOT_FOUND");

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const [status, checks] = await Promise.all([
      github(`/commits/${mergeSha}/status`),
      github(`/commits/${mergeSha}/check-runs?per_page=100`),
    ]);
    const statusGreen = (status.statuses ?? []).some(
      (item) => /vercel/i.test(item.context ?? "") && item.state === "success",
    );
    const checksGreen = (checks.check_runs ?? []).some(
      (item) =>
        /vercel/i.test(item.name ?? "") && item.conclusion === "success",
    );
    if (statusGreen || checksGreen) return;
    const failed = [
      ...(status.statuses ?? []).filter(
        (item) =>
          /vercel/i.test(item.context ?? "") &&
          ["failure", "error"].includes(item.state),
      ),
      ...(checks.check_runs ?? []).filter(
        (item) =>
          /vercel/i.test(item.name ?? "") &&
          ["failure", "cancelled", "timed_out"].includes(item.conclusion),
      ),
    ];
    if (failed.length) throw new Error("SOLO_MAIN_VERCEL_DEPLOYMENT_FAILED");
    await sleep(15000);
  }
  throw new Error("SOLO_MAIN_DEPLOYMENT_TIMEOUT");
}

export async function monitorProduction({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  const options = parseMonitorOptions(argv);
  if (!options.activationMode)
    await waitForMergedVercelDeployment({ env, fetchImpl, sleep });

  for (let attempt = 0; attempt < options.minutes; attempt += 1) {
    for (const route of smokeRoutes(options)) {
      const response = await fetchImpl(`https://${options.domain}${route}`, {
        redirect: "follow",
      });
      if (!response.ok)
        throw new Error(
          `SOLO_PRODUCTION_SMOKE_HTTP_${response.status}:${route}`,
        );
      if (
        options.activationMode &&
        route.startsWith("/comun/mapa/contribuir")
      ) {
        assertActivationContributionAvailable(await response.text());
      }
    }
    const range = await fetchImpl(
      `https://${options.domain}/maps/volta-redonda/volta-redonda.pmtiles`,
      {
        headers: { range: "bytes=0-127" },
      },
    );
    if (
      range.status !== 206 ||
      !/^bytes 0-127\/\d+$/.test(range.headers.get("content-range") ?? "")
    ) {
      throw new Error("SOLO_PRODUCTION_PMTILES_RANGE_INVALID");
    }
    if (options.publicMode) {
      const www = await fetchImpl("https://www.comunsocial.online", {
        redirect: "manual",
      });
      if (
        www.status !== 308 ||
        !/^https:\/\/comunsocial\.online(?:\/|$)/.test(
          www.headers.get("location") ?? "",
        )
      ) {
        throw new Error("SOLO_PUBLIC_WWW_REDIRECT_INVALID");
      }
    }
    if (attempt + 1 < options.minutes) await sleep(60000);
  }
  console.log(
    options.activationMode
      ? "SOLO_ACTIVATION_SMOKE_GREEN"
      : `SOLO_PRODUCTION_GREEN:${options.domain}:${options.publicMode ? "public" : "canonical"}`,
  );
}

if (process.argv[1]?.endsWith("monitor-production.mjs")) {
  await monitorProduction();
}
