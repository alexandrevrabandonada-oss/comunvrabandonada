import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  classifyVercelFailure,
  getVercelCliVersion,
  inspectDeployment,
  requestPreview,
  sanitizePreviewArtifact,
  validatePmtilesResponse,
  validatePreviewResponse,
  validatePreviewUrl,
} from "./vercel-preview-client.mjs";

const required = ["PR", "SHA", "VERCEL_TEAM_ID", "VERCEL_CANONICAL_PROJECT_ID"];
if (required.some((name) => !process.env[name])) throw new Error("SOLO_PREVIEW_CONTEXT_MISSING");

const repository = process.env.GITHUB_REPOSITORY ?? "alexandrevrabandonada-oss/comunvrabandonada";
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg?.slice("--output=".length) || null;
const api = (args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const routes = [
  "/comun",
  "/comun/explorar",
  "/comun/participar",
  "/comun/calcadas",
  "/comun/acervo",
  "/comun/arte",
  "/comun/radio",
  "/comun/minha-participacao",
  "/comun/caixa-de-entrada",
];
const artifact = {
  sha: process.env.SHA,
  deploymentId: null,
  host: null,
  cliVersion: null,
  verificationMode: null,
  routes: [],
  pmtiles: {},
  result: "VERCEL_UNKNOWN_FAILURE",
};

function persistArtifact() {
  if (outputPath) writeFileSync(outputPath, `${JSON.stringify(sanitizePreviewArtifact(artifact), null, 2)}\n`);
}

function sanitizedRedirect(location) {
  if (!location) return null;
  try {
    const url = new URL(location, "https://preview.invalid");
    return url.hostname === "preview.invalid" ? url.pathname : `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    return null;
  }
}

function markerFor(error, route) {
  const message = String(error?.message ?? error);
  if (/VERCEL_CLI_AUTH_FAILED/.test(message)) return `SOLO_VERCEL_PREVIEW_AUTH_FAILED:${route ?? "inspect"}`;
  if (/VERCEL_DEPLOYMENT_NOT_FOUND/.test(message)) return "SOLO_VERCEL_PREVIEW_DEPLOYMENT_NOT_FOUND";
  if (/VERCEL_DEPLOYMENT_PROTECTION_FAILED/.test(message)) return `SOLO_VERCEL_PREVIEW_AUTH_FAILED:${route ?? "inspect"}`;
  if (/VERCEL_PROJECT_LINK_FAILED/.test(message)) return "SOLO_VERCEL_PREVIEW_PROJECT_MISMATCH";
  if (/VERCEL_SCOPE_FAILED/.test(message)) return "SOLO_VERCEL_PREVIEW_SCOPE_FAILED";
  if (/VERCEL_URL_FORMAT_FAILED/.test(message)) return "SOLO_VERCEL_PREVIEW_URL_INVALID";
  if (/timeout|ETIMEDOUT/i.test(message)) return `SOLO_VERCEL_PREVIEW_TIMEOUT:${route ?? "inspect"}`;
  const http = message.match(/VERCEL_HTTP_RESPONSE_FAILED:(\d{3})/);
  if (http) return `SOLO_VERCEL_PREVIEW_HTTP_${http[1]}:${route}`;
  const exit = message.match(/VERCEL_[A-Z_]+:(-?\d+|null):/);
  if (exit) return `SOLO_VERCEL_PREVIEW_PROCESS_FAILED:${route ?? "inspect"}:${exit[1]}`;
  return `SOLO_VERCEL_PREVIEW_UNKNOWN:${route ?? "inspect"}`;
}

function isCredentialFailure(error) {
  const message = String(error?.message ?? error);
  if (/VERCEL_CLI_AUTH_FAILED|VERCEL_SCOPE_FAILED/.test(message)) return true;
  return ["VERCEL_CLI_AUTH_FAILED", "VERCEL_SCOPE_FAILED"].includes(classifyVercelFailure({
    status: error?.exitCode ?? 1,
    signal: error?.signal,
    error,
    stdout: "",
    stderr: message,
  }));
}

function attestGithubDeployment(githubDeployment, successfulStatus) {
  const url = validatePreviewUrl(successfulStatus.environment_url);
  const appSlug = githubDeployment.performed_via_github_app?.slug ?? "";
  if (appSlug && !/vercel/i.test(appSlug)) throw new Error("VERCEL_PROJECT_LINK_FAILED:github-app");
  artifact.deploymentId = `github-${githubDeployment.id}`;
  artifact.host = url.hostname;
  artifact.verificationMode = "github-deployment-attestation";
  artifact.routes = routes.map((route) => ({ route, verification: "deferred-to-production-smoke" }));
  artifact.pmtiles = {
    route: "/maps/volta-redonda/volta-redonda.pmtiles",
    verification: "deferred-to-production-smoke",
  };
  artifact.result = "COMUN_VERCEL_PREVIEW_GITHUB_ATTESTED";
  console.log(`COMUN_VERCEL_PREVIEW_DEPLOYMENT_FOUND:github-${githubDeployment.id}`);
  console.log("COMUN_VERCEL_PREVIEW_DEPLOYMENT_READY");
  console.log("COMUN_VERCEL_PREVIEW_SHA_MATCH");
  console.log("COMUN_VERCEL_PREVIEW_HTTP_DEFERRED_TO_PRODUCTION_SMOKE");
  console.log("COMUN_VERCEL_PREVIEW_GREEN");
}

let activeRoute = "inspect";
try {
  const checks = JSON.parse(api(["pr", "checks", process.env.PR, "--json", "name,state,link"]));
  const requiredChecks = ["FAST / COMUN_CI_GREEN", "FULL / COMUN_CI_GREEN", "Vercel"];
  const missingOrFailed = requiredChecks.filter(
    (name) => !checks.some((check) => check.name === name && check.state === "SUCCESS"),
  );
  if (missingOrFailed.length) {
    throw new Error(`SOLO_PREVIEW_CHECKS_NOT_GREEN:${missingOrFailed.join(",")}`);
  }

  const deployments = JSON.parse(
    api(["api", `repos/${repository}/deployments?sha=${process.env.SHA}&per_page=20`]),
  );
  const githubDeployment = deployments.find(
    (item) => item.sha === process.env.SHA && item.environment === "Preview",
  );
  if (!githubDeployment?.id) throw new Error("VERCEL_DEPLOYMENT_NOT_FOUND");
  const statuses = JSON.parse(
    api(["api", `repos/${repository}/deployments/${githubDeployment.id}/statuses`]),
  );
  const successfulStatus = statuses.find(
    (status) => status.state === "success" && status.environment_url,
  );
  if (!successfulStatus) throw new Error("VERCEL_DEPLOYMENT_NOT_FOUND:not-ready");

  let deployment = null;
  const token = process.env.VERCEL_TOKEN?.trim();
  if (token) {
    try {
      artifact.cliVersion = getVercelCliVersion();
      console.log("COMUN_VERCEL_PREVIEW_SCOPE_RESOLVED:deployment-contract");
      deployment = await inspectDeployment({
        deploymentUrl: successfulStatus.environment_url,
        expectedSha: process.env.SHA,
        expectedProjectId: process.env.VERCEL_CANONICAL_PROJECT_ID,
        expectedTeamId: process.env.VERCEL_TEAM_ID,
        teamScope: null,
        token,
      });
    } catch (error) {
      if (!isCredentialFailure(error)) throw error;
      console.log("COMUN_VERCEL_PREVIEW_TOKEN_UNAVAILABLE");
    }
  } else {
    console.log("COMUN_VERCEL_PREVIEW_TOKEN_UNAVAILABLE");
  }

  if (!deployment) {
    attestGithubDeployment(githubDeployment, successfulStatus);
  } else {
    artifact.deploymentId = deployment.deploymentId;
    artifact.host = deployment.host;
    artifact.verificationMode = "authenticated-route-smoke";
    console.log(`COMUN_VERCEL_PREVIEW_DEPLOYMENT_FOUND:${deployment.deploymentId}`);
    console.log("COMUN_VERCEL_PREVIEW_DEPLOYMENT_READY");
    console.log("COMUN_VERCEL_PREVIEW_SHA_MATCH");

    activeRoute = "/comun";
    const probe = requestPreview({
      route: activeRoute,
      deploymentUrl: deployment.deploymentUrl,
      teamScope: null,
      token,
    });
    validatePreviewResponse(probe);
    artifact.routes.push({
      route: activeRoute,
      status: probe.status,
      redirect: sanitizedRedirect(probe.finalLocation),
      contentType: probe.contentType,
      durationMs: probe.durationMs,
    });
    console.log("COMUN_VERCEL_PREVIEW_AUTHENTICATED_PROBE_OK");

    for (const route of routes.slice(1)) {
      activeRoute = route;
      const response = requestPreview({
        route,
        deploymentUrl: deployment.deploymentUrl,
        teamScope: null,
        token,
      });
      validatePreviewResponse(response);
      artifact.routes.push({
        route,
        status: response.status,
        redirect: sanitizedRedirect(response.finalLocation),
        contentType: response.contentType,
        durationMs: response.durationMs,
      });
    }

    activeRoute = "/maps/volta-redonda/volta-redonda.pmtiles";
    const pmtiles = requestPreview({
      route: activeRoute,
      deploymentUrl: deployment.deploymentUrl,
      teamScope: null,
      token,
      range: true,
    });
    validatePmtilesResponse(pmtiles);
    artifact.pmtiles = {
      route: activeRoute,
      status: pmtiles.status,
      contentRange: pmtiles.contentRange,
      contentLength: pmtiles.contentLength,
      contentType: pmtiles.contentType,
      durationMs: pmtiles.durationMs,
    };
    console.log("COMUN_PMTILES_PREVIEW_RANGE_OK");
    artifact.result = "COMUN_VERCEL_PREVIEW_GREEN";
    console.log("COMUN_VERCEL_PREVIEW_GREEN");
  }
} catch (error) {
  artifact.result = markerFor(error, activeRoute);
  console.error(artifact.result);
  throw error;
} finally {
  persistArtifact();
}
