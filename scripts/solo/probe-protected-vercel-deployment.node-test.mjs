import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProtectedDeploymentCurlArgs,
  classifyProtectedOperationalDiagnosticProbe,
  classifyProtectedDeploymentProbe,
  createProtectedContributionProbeRoute,
  normalizeProtectedDeploymentUrl,
  normalizeProtectedOperationalDiagnosticRoute,
  probeProtectedOperationalDiagnosticDeployment,
  protectedOperationalDiagnosticRoute,
  probeProtectedVercelDeployment,
} from "./probe-protected-vercel-deployment.mjs";

const deploymentUrl =
  "https://comunvrabandonada-readiness-alexandrevrabandonada-oss-projects.vercel.app";
const pausedMessage =
  "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.";
const env = {
  VERCEL_TOKEN: "sensitive-protected-token",
  VERCEL_ORG_ID: "team_LBVwyK8FQMO7tA3hzVXXeumF",
  VERCEL_PROJECT_ID: "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X",
};

function application(body, status = 200) {
  return {
    exitCode: 0,
    stdout: `<!doctype html><html><main>${body}</main></html>\n${status}`,
    stderr: "",
  };
}

function probe(execution, expectedState = "active") {
  return probeProtectedVercelDeployment({
    deploymentUrl,
    route: createProtectedContributionProbeRoute("unit-1"),
    expectedState,
    env,
    executeCli: async () => execution,
  });
}

test("protected probe recognizes a paused application without publishing its body", async () => {
  const result = await probe(application(pausedMessage), "paused");
  assert.equal(result.state, "paused");
  assert.equal(result.matchesExpectedState, true);
  assert.deepEqual(result.markers, [
    "PROTECTED_DEPLOYMENT_HTTP_OK",
    "PROTECTED_DEPLOYMENT_PAUSED",
  ]);
  assert.doesNotMatch(JSON.stringify(result), /temporariamente pausado/i);
});

test("protected probe recognizes an active contribution application", async () => {
  const result = await probe(
    application("Foto, localização, condição e envio em uma única tela."),
  );
  assert.equal(result.state, "active");
  assert.equal(result.matchesExpectedState, true);
  assert.deepEqual(result.markers, [
    "PROTECTED_DEPLOYMENT_HTTP_OK",
    "PROTECTED_DEPLOYMENT_ACTIVE",
  ]);
});

test("protected probe rejects Vercel login and SSO responses despite HTTP 200", async () => {
  for (const body of ["Log in to Vercel", "Single Sign-On required"]) {
    const result = await probe(application(body));
    assert.equal(result.state, "access_failed");
    assert.equal(result.matchesExpectedState, false);
    assert.deepEqual(result.markers, [
      "PROTECTED_DEPLOYMENT_HTTP_OK",
      "PROTECTED_DEPLOYMENT_ACCESS_FAILED",
    ]);
  }
});

test("protected probe rejects redirects and access status codes", async () => {
  for (const status of [302, 401, 403, 404]) {
    const result = await probe({
      exitCode: 0,
      stdout: `response\n${status}`,
      stderr: "",
    });
    assert.equal(result.matchesExpectedState, false);
    assert.ok(["access_failed", "response_invalid"].includes(result.state));
  }
});

test("protected probe fails closed when the CLI transport fails", async () => {
  const result = await probe({
    exitCode: 1,
    stdout: "",
    stderr: "transport failure with sensitive-protected-token",
  });
  assert.deepEqual(result, {
    state: "access_failed",
    expectedState: "active",
    matchesExpectedState: false,
    markers: ["PROTECTED_DEPLOYMENT_ACCESS_FAILED"],
  });
  assert.doesNotMatch(JSON.stringify(result), /sensitive-protected-token/);
});

test("probe invocation is fixed to the Vercel CLI and never exposes protected values in markers", async () => {
  let invocation;
  const result = await probeProtectedVercelDeployment({
    deploymentUrl,
    route: createProtectedContributionProbeRoute("unit-2"),
    expectedState: "paused",
    env,
    executeCli: async (value) => {
      invocation = value;
      return application(pausedMessage);
    },
  });
  assert.equal(invocation.args[0], "--yes");
  assert.equal(invocation.args[1], "vercel@50.28.0");
  assert.equal(invocation.args[2], "curl");
  assert.ok(invocation.args.includes("--deployment"));
  assert.ok(invocation.args.includes("--token"));
  assert.ok(invocation.args.includes("--scope"));
  assert.ok(invocation.args.includes("--max-redirs"));
  assert.doesNotMatch(JSON.stringify(result.markers), /token|sensitive/i);
});

test("arbitrary, unencrypted, and other-project deployment URLs are rejected before the CLI", () => {
  for (const value of [
    "https://example.test",
    "http://comunvrabandonada-readiness-alexandrevrabandonada-oss-projects.vercel.app",
    "https://other-project-alexandrevrabandonada-oss-projects.vercel.app",
    "https://comunvrabandonada-readiness-other-projects.vercel.app",
  ]) {
    assert.throws(() => normalizeProtectedDeploymentUrl(value), /URL_INVALID/);
  }
});

test("an invalid deployment URL fails before the authenticated CLI can run", async () => {
  let invoked = false;
  const result = await probeProtectedVercelDeployment({
    deploymentUrl: "https://example.test",
    route: createProtectedContributionProbeRoute("unit-3"),
    expectedState: "active",
    env,
    executeCli: async () => {
      invoked = true;
      return application("unexpected");
    },
  });
  assert.equal(invoked, false);
  assert.deepEqual(result.markers, ["PROTECTED_DEPLOYMENT_ACCESS_FAILED"]);
});

test("response parsing is deterministic and rejects a body without a final HTTP status", () => {
  assert.deepEqual(
    classifyProtectedDeploymentProbe({ exitCode: 0, stdout: "", stderr: "" }),
    {
      state: "response_invalid",
      markers: ["PROTECTED_DEPLOYMENT_RESPONSE_INVALID"],
    },
  );
});

test("operational diagnostic probe permits only the fixed route and exact sanitized payload", async () => {
  assert.equal(
    normalizeProtectedOperationalDiagnosticRoute(
      protectedOperationalDiagnosticRoute,
    ),
    protectedOperationalDiagnosticRoute,
  );
  for (const route of [
    "/api/comun/sidewalk-operational-diagnostic?next=alias",
    "/api/comun/sidewalk-operational-diagnostic/extra",
    "/api/comun/other",
  ]) {
    assert.throws(
      () => normalizeProtectedOperationalDiagnosticRoute(route),
      /ROUTE_INVALID/,
    );
  }

  let invocation;
  const result = await probeProtectedOperationalDiagnosticDeployment({
    deploymentUrl,
    env,
    executeCli: async (value) => {
      invocation = value;
      return {
        exitCode: 0,
        stdout: `${JSON.stringify({
          formatVersion: 1,
          flag: "disabled",
          databaseUrl: "present",
          database: "reachable",
          ledger: "exact",
          operationalState: "FLAG_DISABLED",
        })}\n200`,
        stderr: "",
      };
    },
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.markers, ["PROTECTED_OPERATIONAL_DIAGNOSTIC_GREEN"]);
  assert.equal(invocation.args[3], protectedOperationalDiagnosticRoute);
  assert.doesNotMatch(JSON.stringify(result), /https?:\/\/|token|password/i);
});

test("operational diagnostic probe rejects extra fields, URLs, and secret-shaped values", () => {
  for (const payload of [
    {
      formatVersion: 1,
      flag: "disabled",
      databaseUrl: "present",
      database: "reachable",
      ledger: "exact",
      operationalState: "FLAG_DISABLED",
      extra: true,
    },
    {
      formatVersion: 1,
      flag: "disabled",
      databaseUrl: "present",
      database: "reachable",
      ledger: "exact",
      operationalState: "FLAG_DISABLED",
      note: "postgresql://never-allowed",
    },
  ]) {
    const result = classifyProtectedOperationalDiagnosticProbe({
      exitCode: 0,
      stdout: `${JSON.stringify(payload)}\n200`,
      stderr: "",
    });
    assert.deepEqual(result, {
      valid: false,
      markers: ["PROTECTED_OPERATIONAL_DIAGNOSTIC_RESPONSE_INVALID"],
    });
  }
});
