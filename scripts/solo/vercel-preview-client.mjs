import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const VERCEL_CLI_VERSION = "50.28.0";
export const CANONICAL_PROJECT_NAME = "comunvrabandonada";

export function validatePreviewUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("VERCEL_URL_FORMAT_FAILED");
  if (!/^[a-z0-9-]+\.vercel\.app$/i.test(url.hostname)) {
    throw new Error("VERCEL_URL_FORMAT_FAILED");
  }
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url;
}

export function sanitizeVercelDiagnostic(value, secrets = []) {
  let output = String(value ?? "");
  for (const secret of secrets.filter(Boolean)) output = output.replaceAll(secret, "[redacted]");
  return output
    .replace(/(authorization\s*[:=]\s*)([^\s,;]+)/gi, "$1[redacted]")
    .replace(/(cookie\s*[:=]\s*)([^\r\n]+)/gi, "$1[redacted]")
    .replace(/(set-cookie\s*[:=]\s*)([^\r\n]+)/gi, "$1[redacted]")
    .replace(/((?:token|secret|protection-bypass)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\b/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

export function classifyVercelFailure({ status, signal, error, stdout, stderr }) {
  const text = `${error?.message ?? ""} ${stderr ?? ""} ${stdout ?? ""}`.toLowerCase();
  if (signal || /timed?\s*out|timeout/.test(text)) return "VERCEL_CURL_BINARY_FAILED";
  if (/enoent|not recognized|command not found/.test(text)) return "VERCEL_CURL_BINARY_FAILED";
  if (/invalid token|token.+not valid|not authorized|unauthorized|authentication failed|log in/.test(text)) {
    return "VERCEL_CLI_AUTH_FAILED";
  }
  if (/deployment.+not found|could not find.+deployment|deployment_not_found/.test(text)) {
    return "VERCEL_DEPLOYMENT_NOT_FOUND";
  }
  if (/deployment protection|protection bypass|sso protection|authentication required/.test(text)) {
    return "VERCEL_DEPLOYMENT_PROTECTION_FAILED";
  }
  if (/scope|team.+not found|team.+unauthorized/.test(text)) return "VERCEL_SCOPE_FAILED";
  if (/link.+project|project.+link|project settings not found/.test(text)) {
    return "VERCEL_PROJECT_LINK_FAILED";
  }
  if (/invalid url|invalid hostname|only https/.test(text)) return "VERCEL_URL_FORMAT_FAILED";
  if (status !== 0) return "VERCEL_UNKNOWN_FAILURE";
  return null;
}

export function parseResponseHeaders(rawHeaders) {
  const responses = [];
  let current;
  for (const rawLine of String(rawHeaders ?? "").split(/\r?\n/)) {
    const statusMatch = rawLine.match(/^HTTP\/\S+\s+(\d{3})(?:\s+(.*))?$/i);
    if (statusMatch) {
      current = { status: Number(statusMatch[1]), statusText: statusMatch[2] ?? "", headers: {} };
      responses.push(current);
      continue;
    }
    const headerMatch = rawLine.match(/^([^:]+):\s*(.*)$/);
    if (current && headerMatch) current.headers[headerMatch[1].toLowerCase()] = headerMatch[2];
  }
  const final = responses.at(-1);
  return {
    responses,
    status: final?.status,
    contentType: final?.headers["content-type"] ?? null,
    contentLength: final?.headers["content-length"]
      ? Number(final.headers["content-length"])
      : null,
    contentRange: final?.headers["content-range"] ?? null,
    finalLocation: [...responses].reverse().find((item) => item.headers.location)?.headers.location ?? null,
    redirects: responses
      .filter((item) => item.status >= 300 && item.status < 400)
      .map((item) => ({ status: item.status, location: item.headers.location ?? null })),
  };
}

export function validatePreviewResponse({ parsed, bodyBytes, bodyLooksProtected = false }) {
  if (!parsed?.status || parsed.status < 200 || parsed.status >= 400) {
    throw new Error(`VERCEL_HTTP_RESPONSE_FAILED:${parsed?.status ?? "unknown"}`);
  }
  if ([401, 403].includes(parsed.status) || bodyLooksProtected) {
    throw new Error(`VERCEL_DEPLOYMENT_PROTECTION_FAILED:${parsed.status}`);
  }
  if (parsed.redirects.some(({ location }) => /vercel\.com\/(?:login|sso)|_vercel_sso/i.test(location ?? ""))) {
    throw new Error("VERCEL_DEPLOYMENT_PROTECTION_FAILED:redirect");
  }
  if (!bodyBytes) throw new Error("VERCEL_HTTP_RESPONSE_FAILED:empty");
  return true;
}

export function validatePmtilesResponse(parsed, expectedTotal = 10147678) {
  if (parsed?.status !== 206) throw new Error(`VERCEL_HTTP_RESPONSE_FAILED:${parsed?.status ?? "unknown"}`);
  if (parsed.contentRange !== `bytes 0-127/${expectedTotal}`) {
    throw new Error("VERCEL_HTTP_RESPONSE_FAILED:content-range");
  }
  if (parsed.contentLength !== null && parsed.contentLength !== 128) {
    throw new Error("VERCEL_HTTP_RESPONSE_FAILED:content-length");
  }
  if (/text\/html/i.test(parsed.contentType ?? "")) {
    throw new Error("VERCEL_HTTP_RESPONSE_FAILED:pmtiles-html");
  }
  return true;
}

function defaultRunCli(args, options = {}) {
  return spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", [
    "--yes",
    `vercel@${VERCEL_CLI_VERSION}`,
    ...args,
  ], {
    encoding: "utf8",
    maxBuffer: 5 * 1024 * 1024,
    shell: process.platform === "win32",
    ...options,
  });
}

function requireSuccessfulProcess(result, secrets = []) {
  if (result.status === 0 && !result.signal && !result.error) return result;
  const failureClass = classifyVercelFailure(result);
  const diagnostic = sanitizeVercelDiagnostic(
    `${result.error?.message ?? ""}\n${result.stderr ?? ""}\n${result.stdout ?? ""}`,
    secrets,
  );
  const error = new Error(`${failureClass}:${result.status ?? "null"}:${diagnostic}`);
  error.failureClass = failureClass;
  error.exitCode = result.status;
  error.signal = result.signal;
  throw error;
}

export function getVercelCliVersion({ runCli = defaultRunCli } = {}) {
  const result = requireSuccessfulProcess(runCli(["--version"]));
  const version = `${result.stdout ?? ""} ${result.stderr ?? ""}`.match(/\d+\.\d+\.\d+/)?.[0];
  if (version !== VERCEL_CLI_VERSION) throw new Error("VERCEL_CURL_BINARY_FAILED:version");
  return version;
}

export async function inspectDeployment({
  deploymentUrl,
  expectedDeploymentId,
  expectedSha,
  expectedProjectId,
  expectedTeamId,
  teamScope,
  token,
  runCli = defaultRunCli,
  fetchImpl = fetch,
}) {
  const url = validatePreviewUrl(deploymentUrl);
  const scopeArgs = teamScope ? ["--scope", teamScope] : [];
  const cliResult = requireSuccessfulProcess(runCli([
    "inspect",
    url.href,
    "--format=json",
    "--token",
    token,
    ...scopeArgs,
  ]), [token]);
  let cli;
  try {
    cli = JSON.parse(cliResult.stdout);
  } catch {
    throw new Error("VERCEL_UNKNOWN_FAILURE:inspect-json");
  }
  if (!/^dpl_[a-zA-Z0-9]+$/.test(cli.id ?? "")) throw new Error("VERCEL_DEPLOYMENT_NOT_FOUND");
  if (expectedDeploymentId && cli.id !== expectedDeploymentId) {
    throw new Error("VERCEL_DEPLOYMENT_NOT_FOUND:id-mismatch");
  }
  if (cli.name !== CANONICAL_PROJECT_NAME) throw new Error("VERCEL_PROJECT_LINK_FAILED");
  if (cli.readyState !== "READY") throw new Error("VERCEL_DEPLOYMENT_NOT_FOUND:not-ready");
  if (cli.target !== "preview") throw new Error("VERCEL_PROJECT_LINK_FAILED:not-preview");
  if (validatePreviewUrl(`https://${cli.url}`).hostname !== url.hostname) {
    throw new Error("VERCEL_URL_FORMAT_FAILED:inspect-mismatch");
  }

  const response = await fetchImpl(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(cli.id)}?teamId=${encodeURIComponent(expectedTeamId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    const failureClass = response.status === 401
      ? "VERCEL_CLI_AUTH_FAILED"
      : response.status === 403
        ? "VERCEL_SCOPE_FAILED"
        : response.status === 404
          ? "VERCEL_DEPLOYMENT_NOT_FOUND"
          : "VERCEL_UNKNOWN_FAILURE";
    throw new Error(`${failureClass}:inspect-api-${response.status}`);
  }
  const remote = await response.json();
  if (remote.projectId !== expectedProjectId) throw new Error("VERCEL_PROJECT_LINK_FAILED:project-id");
  if ((remote.teamId ?? remote.ownerId) !== expectedTeamId) throw new Error("VERCEL_SCOPE_FAILED:team-id");
  if (remote.meta?.githubCommitSha !== expectedSha) throw new Error("VERCEL_PROJECT_LINK_FAILED:sha");
  if (remote.readyState !== "READY") throw new Error("VERCEL_DEPLOYMENT_NOT_FOUND:not-ready");
  if (remote.target !== "preview") throw new Error("VERCEL_PROJECT_LINK_FAILED:not-preview");
  return {
    deploymentId: cli.id,
    deploymentUrl: url.href.replace(/\/$/, ""),
    host: url.hostname,
    project: cli.name,
    projectId: remote.projectId,
    teamId: remote.teamId ?? remote.ownerId,
    sha: remote.meta.githubCommitSha,
    readyState: remote.readyState,
    target: remote.target,
  };
}

export function requestPreview({
  route,
  deploymentUrl,
  teamScope,
  token,
  range = false,
  runCli = defaultRunCli,
}) {
  const url = validatePreviewUrl(deploymentUrl);
  const temp = mkdtempSync(path.join(tmpdir(), "comun-vercel-preview-"));
  const bodyPath = path.join(temp, "body");
  const headerPath = path.join(temp, "headers");
  const started = performance.now();
  try {
    const curlArgs = [
      "--silent",
      "--show-error",
      "--location",
      "--output",
      bodyPath,
      "--dump-header",
      headerPath,
      ...(range ? ["--range", "0-127"] : []),
    ];
    const scopeArgs = teamScope ? ["--scope", teamScope] : [];
    const result = runCli([
      "curl",
      route,
      "--deployment",
      url.href,
      "--token",
      token,
      ...scopeArgs,
      "--",
      ...curlArgs,
    ]);
    requireSuccessfulProcess(result, [token]);
    const rawHeaders = readFileSync(headerPath, "utf8");
    const body = readFileSync(bodyPath);
    const parsed = parseResponseHeaders(rawHeaders);
    const bodyText = body.subarray(0, Math.min(body.length, 8192)).toString("utf8");
    return {
      route,
      ...parsed,
      bodyBytes: statSync(bodyPath).size,
      bodyLooksProtected: /authentication required|_vercel_sso|vercel login/i.test(bodyText),
      durationMs: Math.round(performance.now() - started),
    };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

export function sanitizePreviewArtifact(value) {
  return JSON.parse(JSON.stringify(value, (key, entry) => {
    if (/token|secret|cookie|authorization|body|headers|stdout|stderr/i.test(key)) return undefined;
    return entry;
  }));
}
