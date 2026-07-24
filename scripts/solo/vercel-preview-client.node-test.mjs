import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyVercelFailure,
  inspectDeployment,
  parseResponseHeaders,
  sanitizePreviewArtifact,
  sanitizeVercelDiagnostic,
  validatePmtilesResponse,
  validatePreviewResponse,
  validatePreviewUrl,
} from "./vercel-preview-client.mjs";

const sha = "a".repeat(40);
const projectId = "prj_canonical";
const teamId = "team_canonical";
const deploymentId = "dpl_Canonical123";
const deploymentUrl = "https://comunvrabandonada-example-team.vercel.app";
const cli = {
  id: deploymentId,
  name: "comunvrabandonada",
  url: new URL(deploymentUrl).hostname,
  readyState: "READY",
  target: "preview",
};
const remote = {
  projectId,
  teamId,
  readyState: "READY",
  target: "preview",
  meta: { githubCommitSha: sha },
};

const inspect = (overrides = {}) => inspectDeployment({
  deploymentUrl,
  expectedSha: sha,
  expectedProjectId: projectId,
  expectedTeamId: teamId,
  teamScope: null,
  token: "vercel-test-token",
  runCli: () => ({ status: 0, stdout: JSON.stringify({ ...cli, ...(overrides.cli ?? {}) }), stderr: "" }),
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ...remote, ...(overrides.remote ?? {}) }),
  }),
});

test("full preview URL preserves https", () => {
  assert.equal(validatePreviewUrl(deploymentUrl).href, `${deploymentUrl}/`);
});

test("invalid hostname is rejected", () => {
  assert.throws(() => validatePreviewUrl("https://example.com"), /VERCEL_URL_FORMAT_FAILED/);
});

test("deployment from another project is rejected", async () => {
  await assert.rejects(inspect({ remote: { projectId: "prj_legacy" } }), /VERCEL_PROJECT_LINK_FAILED:project-id/);
});

test("deployment from another team is rejected without relying on a scope slug", async () => {
  await assert.rejects(inspect({ remote: { teamId: "team_legacy" } }), /VERCEL_SCOPE_FAILED:team-id/);
});

test("deployment with divergent SHA is rejected", async () => {
  await assert.rejects(
    inspect({ remote: { meta: { githubCommitSha: "b".repeat(40) } } }),
    /VERCEL_PROJECT_LINK_FAILED:sha/,
  );
});

test("READY is required", async () => {
  await assert.rejects(inspect({ cli: { readyState: "BUILDING" } }), /not-ready/);
});

test("preview target is required", async () => {
  await assert.rejects(inspect({ cli: { target: "production" } }), /not-preview/);
});

test("token is always removed from diagnostics", () => {
  assert.doesNotMatch(sanitizeVercelDiagnostic("failed token=abc123 abc123", ["abc123"]), /abc123/);
});

test("cookie is removed from diagnostics", () => {
  assert.equal(sanitizeVercelDiagnostic("Cookie: session=private"), "Cookie: [redacted]");
});

test("Authorization is removed from diagnostics", () => {
  assert.equal(sanitizeVercelDiagnostic("Authorization: Bearer-private"), "Authorization: [redacted]");
});

test("exit code 1 receives a specific process class", () => {
  assert.equal(
    classifyVercelFailure({ status: 1, stdout: "", stderr: "unexpected CLI failure" }),
    "VERCEL_UNKNOWN_FAILURE",
  );
});

test("the real Vercel invalid-token wording is classified as authentication failure", () => {
  assert.equal(
    classifyVercelFailure({
      status: 1,
      stdout: "",
      stderr: "Error: The token provided via `--token` argument is not valid.",
    }),
    "VERCEL_CLI_AUTH_FAILED",
  );
});

test("HTTP 401 is rejected", () => {
  assert.throws(
    () => validatePreviewResponse({ parsed: { status: 401, redirects: [] }, bodyBytes: 10 }),
    /VERCEL_HTTP_RESPONSE_FAILED:401/,
  );
});

test("HTTP 403 is rejected", () => {
  assert.throws(
    () => validatePreviewResponse({ parsed: { status: 403, redirects: [] }, bodyBytes: 10 }),
    /VERCEL_HTTP_RESPONSE_FAILED:403/,
  );
});

test("HTTP 500 is rejected", () => {
  assert.throws(
    () => validatePreviewResponse({ parsed: { status: 500, redirects: [] }, bodyBytes: 10 }),
    /VERCEL_HTTP_RESPONSE_FAILED:500/,
  );
});

test("authentication redirect is rejected", () => {
  assert.throws(
    () => validatePreviewResponse({
      parsed: { status: 200, redirects: [{ status: 302, location: "https://vercel.com/login" }] },
      bodyBytes: 10,
    }),
    /VERCEL_DEPLOYMENT_PROTECTION_FAILED/,
  );
});

test("HTTP 200 is accepted", () => {
  assert.equal(validatePreviewResponse({ parsed: { status: 200, redirects: [] }, bodyBytes: 10 }), true);
});

test("HTTP 308 internal redirect is accepted", () => {
  assert.equal(validatePreviewResponse({
    parsed: { status: 308, redirects: [{ status: 308, location: "/comun/acervo/arte" }] },
    bodyBytes: 10,
  }), true);
});

test("PMTiles HTTP 206 is accepted", () => {
  assert.equal(validatePmtilesResponse({
    status: 206,
    contentRange: "bytes 0-127/10147678",
    contentLength: 128,
    contentType: "application/octet-stream",
  }), true);
});

test("PMTiles HTTP 200 is rejected", () => {
  assert.throws(
    () => validatePmtilesResponse({ status: 200, contentRange: null }),
    /VERCEL_HTTP_RESPONSE_FAILED:200/,
  );
});

test("invalid PMTiles Content-Range is rejected", () => {
  assert.throws(
    () => validatePmtilesResponse({ status: 206, contentRange: "bytes 0-127/999", contentLength: 128 }),
    /content-range/,
  );
});

test("sanitized artifact excludes body, secrets and private headers", () => {
  const artifact = sanitizePreviewArtifact({
    result: "ok",
    body: "private",
    token: "private",
    responseHeaders: { cookie: "private" },
    routes: [{ route: "/comun", status: 200 }],
  });
  const serialized = JSON.stringify(artifact);
  assert.equal(artifact.result, "ok");
  assert.doesNotMatch(serialized, /private|body|token|headers|cookie/i);
});

test("header parser returns final status and redirect chain", () => {
  const parsed = parseResponseHeaders(
    "HTTP/1.1 308 Permanent Redirect\r\nLocation: /comun/acervo/arte\r\n\r\n"
    + "HTTP/2 200 OK\r\nContent-Type: text/html\r\nContent-Length: 42\r\n",
  );
  assert.equal(parsed.status, 200);
  assert.equal(parsed.redirects[0].status, 308);
  assert.equal(parsed.contentType, "text/html");
  assert.equal(parsed.contentLength, 42);
});
