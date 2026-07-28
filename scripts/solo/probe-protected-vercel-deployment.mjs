import { spawn } from "node:child_process";
import {
  chmod,
  mkdtemp,
  open,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const protectedContributionRoute =
  "/comun/mapa/contribuir?origem=calcadas";
export const protectedDeploymentHost =
  /^comunvrabandonada-[a-z0-9-]+-alexandrevrabandonada-oss-projects\.vercel\.app$/;

const pausedMessage =
  "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.";
const activeContributionMarkers = [
  "Foto, localização, condição e envio em uma única tela.",
  "Enviar para moderação",
];
const protectionMarkers = [
  /log in to vercel/i,
  /vercel authentication/i,
  /deployment protection/i,
  /single sign-on/i,
  /\bsso\b/i,
];
const canonicalTeamId = "team_LBVwyK8FQMO7tA3hzVXXeumF";
const canonicalProjectId = "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X";

function optionValue(argv, name) {
  return argv
    .find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function normalizeProtectedDeploymentUrl(value) {
  if (!value) throw new Error("PROTECTED_DEPLOYMENT_URL_REQUIRED");

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PROTECTED_DEPLOYMENT_URL_INVALID");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !protectedDeploymentHost.test(url.hostname)
  ) {
    throw new Error("PROTECTED_DEPLOYMENT_URL_INVALID");
  }

  return url.origin;
}

export function normalizeProtectedContributionRoute(value) {
  if (!value?.startsWith("/"))
    throw new Error("PROTECTED_DEPLOYMENT_ROUTE_INVALID");

  const url = new URL(value, "https://comun.invalid");
  if (
    url.origin !== "https://comun.invalid" ||
    url.pathname !== "/comun/mapa/contribuir" ||
    url.searchParams.get("origem") !== "calcadas"
  ) {
    throw new Error("PROTECTED_DEPLOYMENT_ROUTE_INVALID");
  }

  for (const key of url.searchParams.keys()) {
    if (!new Set(["origem", "comun_probe"]).has(key))
      throw new Error("PROTECTED_DEPLOYMENT_ROUTE_INVALID");
  }
  const nonce = url.searchParams.get("comun_probe");
  if (nonce && !/^[a-z0-9-]{1,120}$/i.test(nonce))
    throw new Error("PROTECTED_DEPLOYMENT_ROUTE_INVALID");

  return `${url.pathname}${url.search}`;
}

export function createProtectedContributionProbeRoute(nonce) {
  if (!/^[a-z0-9-]{1,120}$/i.test(String(nonce ?? "")))
    throw new Error("PROTECTED_DEPLOYMENT_ROUTE_INVALID");
  return `${protectedContributionRoute}&comun_probe=${encodeURIComponent(nonce)}`;
}

export function assertProtectedProbeEnvironment(env = process.env) {
  if (
    !env.VERCEL_TOKEN ||
    env.VERCEL_ORG_ID !== canonicalTeamId ||
    env.VERCEL_PROJECT_ID !== canonicalProjectId
  ) {
    throw new Error("PROTECTED_DEPLOYMENT_CONFIGURATION_INVALID");
  }
}

export function buildProtectedDeploymentCurlArgs({
  deploymentUrl,
  route,
  env = process.env,
}) {
  const normalizedDeploymentUrl =
    normalizeProtectedDeploymentUrl(deploymentUrl);
  const normalizedRoute = normalizeProtectedContributionRoute(route);
  assertProtectedProbeEnvironment(env);

  return [
    "--yes",
    "vercel@50.28.0",
    "curl",
    normalizedRoute,
    "--deployment",
    normalizedDeploymentUrl,
    "--token",
    env.VERCEL_TOKEN,
    "--scope",
    env.VERCEL_ORG_ID,
    "--yes",
    "--",
    "--silent",
    "--show-error",
    "--max-redirs",
    "0",
    "--write-out",
    "\n%{http_code}",
  ];
}

function responseStatus(stdout) {
  const match = String(stdout).match(/(?:^|\n)(\d{3})\s*$/);
  return match ? Number(match[1]) : undefined;
}

function responseBody(stdout) {
  return String(stdout).replace(/(?:^|\n)\d{3}\s*$/, "");
}

function observedState(body) {
  if (protectionMarkers.some((pattern) => pattern.test(body)))
    return "access_failed";
  if (!/<(?:!doctype html|html|main|form)\b/i.test(body))
    return "response_invalid";
  if (body.includes(pausedMessage)) return "paused";
  if (activeContributionMarkers.some((marker) => body.includes(marker)))
    return "active";
  return "response_invalid";
}

export function classifyProtectedDeploymentProbe({ exitCode, stdout }) {
  if (exitCode !== 0)
    return {
      state: "access_failed",
      markers: ["PROTECTED_DEPLOYMENT_ACCESS_FAILED"],
    };

  const status = responseStatus(stdout);
  if (!status)
    return {
      state: "response_invalid",
      markers: ["PROTECTED_DEPLOYMENT_RESPONSE_INVALID"],
    };
  if ([401, 403].includes(status))
    return {
      state: "access_failed",
      markers: ["PROTECTED_DEPLOYMENT_ACCESS_FAILED"],
    };
  if (status !== 200)
    return {
      state: "response_invalid",
      markers: ["PROTECTED_DEPLOYMENT_RESPONSE_INVALID"],
    };

  const state = observedState(responseBody(stdout));
  const markers = ["PROTECTED_DEPLOYMENT_HTTP_OK"];
  if (state === "active") markers.push("PROTECTED_DEPLOYMENT_ACTIVE");
  if (state === "paused") markers.push("PROTECTED_DEPLOYMENT_PAUSED");
  if (state === "access_failed")
    markers.push("PROTECTED_DEPLOYMENT_ACCESS_FAILED");
  if (state === "response_invalid")
    markers.push("PROTECTED_DEPLOYMENT_RESPONSE_INVALID");
  return { state, markers };
}

function waitForChild(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

export async function executeProtectedDeploymentCurl({ args, env }) {
  const originalUmask = process.umask(0o077);
  let directory;
  let stdoutHandle;
  let stderrHandle;

  try {
    directory = await mkdtemp(path.join(tmpdir(), "comun-protected-probe-"));
    await chmod(directory, 0o700);
    const stdoutPath = path.join(directory, "stdout");
    const stderrPath = path.join(directory, "stderr");
    await Promise.all([
      writeFile(stdoutPath, "", { encoding: "utf8", mode: 0o600 }),
      writeFile(stderrPath, "", { encoding: "utf8", mode: 0o600 }),
    ]);
    await Promise.all([chmod(stdoutPath, 0o600), chmod(stderrPath, 0o600)]);
    stdoutHandle = await open(stdoutPath, "w", 0o600);
    stderrHandle = await open(stderrPath, "w", 0o600);
    const child = spawn("npx", args, {
      env,
      stdio: ["ignore", stdoutHandle.fd, stderrHandle.fd],
    });
    const exitCode = await waitForChild(child);
    await Promise.all([stdoutHandle.close(), stderrHandle.close()]);
    stdoutHandle = undefined;
    stderrHandle = undefined;
    const [stdout, stderr] = await Promise.all([
      readFile(stdoutPath, "utf8"),
      readFile(stderrPath, "utf8"),
    ]);
    return { exitCode, stdout, stderr };
  } finally {
    await Promise.allSettled([stdoutHandle?.close(), stderrHandle?.close()]);
    if (directory) await rm(directory, { recursive: true, force: true });
    process.umask(originalUmask);
  }
}

export async function probeProtectedVercelDeployment({
  deploymentUrl,
  route,
  expectedState,
  env = process.env,
  executeCli = executeProtectedDeploymentCurl,
}) {
  if (!new Set(["active", "paused"]).has(expectedState))
    throw new Error("PROTECTED_DEPLOYMENT_EXPECTED_STATE_INVALID");

  let result;
  try {
    result = await executeCli({
      args: buildProtectedDeploymentCurlArgs({ deploymentUrl, route, env }),
      env,
    });
  } catch {
    result = { exitCode: 1, stdout: "", stderr: "" };
  }

  const classified = classifyProtectedDeploymentProbe(result);
  return {
    state: classified.state,
    expectedState,
    matchesExpectedState: classified.state === expectedState,
    markers: classified.markers,
  };
}

export function parseProtectedProbeOptions(argv) {
  const deploymentUrl = optionValue(argv, "--deployment-url");
  const route = optionValue(argv, "--route") ?? protectedContributionRoute;
  const expectedState = optionValue(argv, "--expected-state");
  return { deploymentUrl, route, expectedState };
}

async function main() {
  const options = parseProtectedProbeOptions(process.argv.slice(2));
  const result = await probeProtectedVercelDeployment(options);
  for (const marker of result.markers) console.log(marker);
  if (!result.matchesExpectedState) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("probe-protected-vercel-deployment.mjs")) {
  await main();
}
