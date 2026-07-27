import { readFileSync } from "node:fs";

const pausedMessage =
  "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.";
const canonicalDomain = "comunvrabandonada.vercel.app";
const publicDomain = "comunsocial.online";
const contributionRoute = "/comun/mapa/contribuir?origem=calcadas";
const expectedDeploymentHost =
  /^comunvrabandonada-[a-z0-9-]+-alexandrevrabandonada-oss-projects\.vercel\.app$/;

function optionValue(argv, name) {
  return argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
}

function parseInteger(value, fallback) {
  return Number(value ?? fallback);
}

function normalizeDeploymentUrl(value) {
  if (!value) throw new Error("SOLO_ACTIVATION_DEPLOYMENT_URL_REQUIRED");

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("SOLO_ACTIVATION_DEPLOYMENT_URL_INVALID");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !expectedDeploymentHost.test(url.hostname)
  ) {
    throw new Error("SOLO_ACTIVATION_DEPLOYMENT_URL_INVALID");
  }

  return url.origin;
}

export function parseMonitorOptions(argv) {
  const minutes = parseInteger(optionValue(argv, "--minutes"), 15);
  const domain = optionValue(argv, "--domain");
  const readinessMinutes = parseInteger(
    optionValue(argv, "--readiness-minutes"),
    5,
  );
  const pollSeconds = parseInteger(optionValue(argv, "--poll-seconds"), 10);
  const requireConsecutive = parseInteger(
    optionValue(argv, "--require-consecutive"),
    2,
  );
  const publicMode = argv.includes("--public");
  const activationMode = argv.includes("--activation");
  const rollbackReadiness = argv.includes("--rollback-readiness");
  const deploymentOption = optionValue(argv, "--deployment-url");

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 30)
    throw new Error("SOLO_MONITOR_INPUT_INVALID");
  if (!new Set([canonicalDomain, publicDomain]).has(domain))
    throw new Error("SOLO_MONITOR_DOMAIN_NOT_ALLOWLISTED");
  if (publicMode !== (domain === publicDomain))
    throw new Error("SOLO_MONITOR_PHASE_INVALID");
  if (
    !Number.isInteger(readinessMinutes) ||
    readinessMinutes < 1 ||
    readinessMinutes > 5
  )
    throw new Error("SOLO_ACTIVATION_READINESS_INPUT_INVALID");
  if (!Number.isInteger(pollSeconds) || pollSeconds < 5 || pollSeconds > 60)
    throw new Error("SOLO_ACTIVATION_READINESS_INPUT_INVALID");
  if (
    !Number.isInteger(requireConsecutive) ||
    requireConsecutive < 2 ||
    requireConsecutive > 3
  ) {
    throw new Error("SOLO_ACTIVATION_READINESS_INPUT_INVALID");
  }
  if (activationMode && rollbackReadiness)
    throw new Error("SOLO_ACTIVATION_SMOKE_INPUT_INVALID");
  if (
    (activationMode || rollbackReadiness) &&
    (publicMode || domain !== canonicalDomain)
  )
    throw new Error("SOLO_ACTIVATION_SMOKE_INPUT_INVALID");
  if (deploymentOption && !activationMode && !rollbackReadiness)
    throw new Error("SOLO_ACTIVATION_SMOKE_INPUT_INVALID");

  const deploymentUrl =
    activationMode || rollbackReadiness
      ? normalizeDeploymentUrl(deploymentOption)
      : undefined;

  return {
    minutes,
    domain,
    publicMode,
    activationMode,
    rollbackReadiness,
    deploymentUrl,
    readinessMinutes,
    pollSeconds,
    requireConsecutive,
  };
}

export function smokeRoutes({ activationMode }) {
  return activationMode
    ? [
        "/comun",
        "/comun/calcadas",
        "/comun/acervo",
        "/comun/pautas",
        contributionRoute,
      ]
    : ["/comun", "/comun/calcadas", "/comun/acervo"];
}

export function hasPausedContribution(body) {
  return String(body).includes(pausedMessage);
}

export function assertActivationContributionAvailable(body) {
  if (hasPausedContribution(body))
    throw new Error("SOLO_ACTIVATION_SMOKE_CONTRIBUTION_STILL_PAUSED");
}

function assertNoPublicSensitiveMarkers(body) {
  const text = String(body);
  const prohibited = [
    /postgres(?:ql)?:\/\//i,
    /service[_ -]?role/i,
    /authorization\s*:/i,
    /\beyJ[a-zA-Z0-9_-]{10,}/,
    /exact_(?:latitude|longitude)/i,
    /private_notes/i,
    /object_key/i,
    /(?:original|upload)_storage_(?:path|key)/i,
  ];
  if (prohibited.some((pattern) => pattern.test(text)))
    throw new Error("SOLO_ACTIVATION_PUBLIC_PRIVACY_MARKER");
}

function cacheBustedUrl(baseUrl, attempt, phase) {
  const url = new URL(contributionRoute, baseUrl);
  url.searchParams.set("comun_activation_readiness", `${phase}-${attempt}`);
  return url;
}

async function queryContributionReadiness({
  baseUrl,
  attempt,
  phase,
  fetchImpl,
}) {
  const url = cacheBustedUrl(baseUrl, attempt, phase);
  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
    });
    const body = response.ok ? await response.text() : "";
    return {
      active: response.status === 200 && !hasPausedContribution(body),
      url,
    };
  } catch {
    return { active: false, url };
  }
}

async function waitForContributionReadiness({
  baseUrl,
  phase,
  expectedActive,
  readyMarker,
  timeoutMarker,
  options,
  fetchImpl,
  sleep,
}) {
  const maximumAttempts = Math.ceil(
    (options.readinessMinutes * 60) / options.pollSeconds,
  );
  let consecutive = 0;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const { active } = await queryContributionReadiness({
      baseUrl,
      attempt,
      phase,
      fetchImpl,
    });
    if (active === expectedActive) consecutive += 1;
    else consecutive = 0;

    if (consecutive >= options.requireConsecutive) {
      console.log(readyMarker);
      return;
    }
    if (attempt < maximumAttempts) await sleep(options.pollSeconds * 1000);
  }

  console.log(timeoutMarker);
  throw new Error(timeoutMarker);
}

export async function waitForActivationDeploymentReadiness({
  options,
  fetchImpl = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  await waitForContributionReadiness({
    baseUrl: options.deploymentUrl,
    phase: "deployment",
    expectedActive: true,
    readyMarker: "SOLO_ACTIVATION_DEPLOYMENT_FLAG_VISIBLE",
    timeoutMarker: "SOLO_ACTIVATION_DEPLOYMENT_FLAG_NOT_READY",
    options,
    fetchImpl,
    sleep,
  });
}

export async function waitForActivationAliasReadiness({
  options,
  fetchImpl = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  await waitForContributionReadiness({
    baseUrl: `https://${canonicalDomain}`,
    phase: "alias",
    expectedActive: true,
    readyMarker: "SOLO_ACTIVATION_CANONICAL_ALIAS_READY",
    timeoutMarker: "SOLO_ACTIVATION_ALIAS_PROPAGATION_TIMEOUT",
    options,
    fetchImpl,
    sleep,
  });
}

export async function runActivationFunctionalSmoke({
  options,
  fetchImpl = fetch,
  emitMarker = true,
} = {}) {
  for (const route of smokeRoutes({ activationMode: true })) {
    const response = await fetchImpl(`https://${options.domain}${route}`, {
      redirect: "follow",
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
    });
    if (response.status !== 200)
      throw new Error(`SOLO_PRODUCTION_SMOKE_HTTP_${response.status}:${route}`);

    const body = await response.text();
    assertNoPublicSensitiveMarkers(body);
    if (route.startsWith("/comun/mapa/contribuir"))
      assertActivationContributionAvailable(body);
  }

  const range = await fetchImpl(
    `https://${options.domain}/maps/volta-redonda/volta-redonda.pmtiles`,
    {
      headers: {
        range: "bytes=0-127",
        "cache-control": "no-cache",
        pragma: "no-cache",
      },
    },
  );
  if (
    range.status !== 206 ||
    !/^bytes 0-127\/\d+$/.test(range.headers.get("content-range") ?? "")
  ) {
    throw new Error("SOLO_PRODUCTION_PMTILES_RANGE_INVALID");
  }

  if (emitMarker) console.log("SOLO_ACTIVATION_FUNCTIONAL_SMOKE_GREEN");
}

export async function monitorActivationStability({
  options,
  fetchImpl = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  for (let attempt = 1; attempt <= options.minutes; attempt += 1) {
    await runActivationFunctionalSmoke({
      options,
      fetchImpl,
      emitMarker: false,
    });
    if (attempt < options.minutes) await sleep(60000);
  }
  console.log("SOLO_ACTIVATION_MONITOR_GREEN");
}

export async function waitForRollbackReadiness({
  options,
  fetchImpl = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  await waitForContributionReadiness({
    baseUrl: options.deploymentUrl,
    phase: "rollback-deployment",
    expectedActive: false,
    readyMarker: "SOLO_ACTIVATION_ROLLBACK_DEPLOYMENT_READY",
    timeoutMarker: "SOLO_ACTIVATION_ROLLBACK_DEPLOYMENT_NOT_READY",
    options,
    fetchImpl,
    sleep,
  });
  await waitForContributionReadiness({
    baseUrl: `https://${canonicalDomain}`,
    phase: "rollback-alias",
    expectedActive: false,
    readyMarker: "SOLO_ACTIVATION_ROLLBACK_ALIAS_READY",
    timeoutMarker: "SOLO_ACTIVATION_ROLLBACK_ALIAS_NOT_READY",
    options,
    fetchImpl,
    sleep,
  });
  console.log("SOLO_ACTIVATION_ROLLBACK_GREEN");
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

async function runStandardProductionSmoke({ options, fetchImpl, sleep }) {
  for (let attempt = 0; attempt < options.minutes; attempt += 1) {
    for (const route of smokeRoutes({ activationMode: false })) {
      const response = await fetchImpl(`https://${options.domain}${route}`, {
        redirect: "follow",
      });
      if (!response.ok)
        throw new Error(
          `SOLO_PRODUCTION_SMOKE_HTTP_${response.status}:${route}`,
        );
    }
    const range = await fetchImpl(
      `https://${options.domain}/maps/volta-redonda/volta-redonda.pmtiles`,
      { headers: { range: "bytes=0-127" } },
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
    `SOLO_PRODUCTION_GREEN:${options.domain}:${options.publicMode ? "public" : "canonical"}`,
  );
}

export async function monitorProduction({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  const options = parseMonitorOptions(argv);

  if (options.activationMode) {
    await waitForActivationDeploymentReadiness({ options, fetchImpl, sleep });
    await waitForActivationAliasReadiness({ options, fetchImpl, sleep });
    await runActivationFunctionalSmoke({ options, fetchImpl });
    await monitorActivationStability({ options, fetchImpl, sleep });
    console.log("COMUN_CALCADAS_OPERATIONAL_ACTIVATION_GREEN");
    return;
  }

  if (options.rollbackReadiness) {
    await waitForRollbackReadiness({ options, fetchImpl, sleep });
    return;
  }

  await waitForMergedVercelDeployment({ env, fetchImpl, sleep });
  await runStandardProductionSmoke({ options, fetchImpl, sleep });
}

if (process.argv[1]?.endsWith("monitor-production.mjs")) {
  await monitorProduction();
}
