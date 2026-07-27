import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPausedContribution,
  monitorActivationStability,
  monitorProduction,
  parseMonitorOptions,
  runActivationFunctionalSmoke,
  smokeRoutes,
  waitForActivationAliasReadiness,
  waitForActivationDeploymentReadiness,
  waitForRollbackReadiness,
} from "./monitor-production.mjs";

const deploymentUrl =
  "https://comunvrabandonada-readiness-alexandrevrabandonada-oss-projects.vercel.app";
const canonicalDomain = "comunvrabandonada.vercel.app";
const pausedBody =
  "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.";
const activeBody = "O formulário operacional está disponível.";

function options(overrides = {}) {
  return {
    minutes: 1,
    domain: canonicalDomain,
    publicMode: false,
    activationMode: true,
    rollbackReadiness: false,
    deploymentUrl,
    readinessMinutes: 1,
    pollSeconds: 5,
    requireConsecutive: 2,
    ...overrides,
  };
}

function textResponse(body, status = 200) {
  return new Response(body, { status });
}

function rangeResponse() {
  return new Response("range", {
    status: 206,
    headers: { "content-range": "bytes 0-127/2048" },
  });
}

function withMarkers(callback) {
  const originalLog = console.log;
  const markers = [];
  console.log = (marker) => markers.push(String(marker));
  return Promise.resolve(callback(markers)).finally(() => {
    console.log = originalLog;
  });
}

function readinessFetch(sequence, trace = []) {
  let index = 0;
  return async (url, request = {}) => {
    const target = String(url);
    trace.push({ target, request });
    const next = sequence[Math.min(index, sequence.length - 1)];
    index += 1;
    if (next instanceof Error) throw next;
    return textResponse(next.body, next.status);
  };
}

test("activation options require an allowlisted HTTPS deployment URL", () => {
  assert.deepEqual(
    parseMonitorOptions([
      "--minutes=2",
      `--domain=${canonicalDomain}`,
      `--deployment-url=${deploymentUrl}`,
      "--readiness-minutes=5",
      "--poll-seconds=10",
      "--require-consecutive=2",
      "--activation",
    ]),
    {
      minutes: 2,
      domain: canonicalDomain,
      publicMode: false,
      activationMode: true,
      rollbackReadiness: false,
      deploymentUrl,
      readinessMinutes: 5,
      pollSeconds: 10,
      requireConsecutive: 2,
    },
  );
  for (const argv of [
    [
      "--minutes=2",
      `--domain=${canonicalDomain}`,
      "--deployment-url=http://comunvrabandonada-readiness-alexandrevrabandonada-oss-projects.vercel.app",
      "--activation",
    ],
    [
      "--minutes=2",
      `--domain=${canonicalDomain}`,
      "--deployment-url=https://example.test",
      "--activation",
    ],
    [
      "--minutes=2",
      `--domain=${canonicalDomain}`,
      `--deployment-url=${deploymentUrl}`,
      "--readiness-minutes=6",
      "--activation",
    ],
    [
      "--minutes=2",
      `--domain=${canonicalDomain}`,
      `--deployment-url=${deploymentUrl}?unexpected=value`,
      "--activation",
    ],
    [
      "--minutes=2",
      `--domain=${canonicalDomain}`,
      `--deployment-url=${deploymentUrl}`,
      "--poll-seconds=4",
      "--activation",
    ],
    [
      "--minutes=2",
      `--domain=${canonicalDomain}`,
      `--deployment-url=${deploymentUrl}`,
      "--activation",
      "--rollback-readiness",
    ],
  ]) {
    assert.throws(() => parseMonitorOptions(argv));
  }
});

test("deployment readiness treats paused responses as transient until two active responses", async () => {
  const trace = [];
  await withMarkers(async (markers) => {
    await waitForActivationDeploymentReadiness({
      options: options(),
      fetchImpl: readinessFetch(
        [
          { body: pausedBody, status: 200 },
          { body: pausedBody, status: 200 },
          { body: activeBody, status: 200 },
          { body: activeBody, status: 200 },
        ],
        trace,
      ),
      sleep: async () => {},
    });
    assert.deepEqual(markers, ["SOLO_ACTIVATION_DEPLOYMENT_FLAG_VISIBLE"]);
  });
  assert.equal(trace.length, 4);
  assert.equal(new Set(trace.map(({ target }) => target)).size, 4);
  assert.equal(
    trace.every(
      ({ request }) =>
        request.headers["cache-control"] === "no-cache" &&
        request.headers.pragma === "no-cache",
    ),
    true,
  );
});

test("one active response does not satisfy the deployment readiness quorum", async () => {
  await assert.rejects(
    withMarkers(async () =>
      waitForActivationDeploymentReadiness({
        options: options({ readinessMinutes: 1, pollSeconds: 60 }),
        fetchImpl: readinessFetch([{ body: activeBody, status: 200 }]),
        sleep: async () => {},
      }),
    ),
    /SOLO_ACTIVATION_DEPLOYMENT_FLAG_NOT_READY/,
  );
});

test("deployment readiness tolerates a transient 500 before it becomes active", async () => {
  await waitForActivationDeploymentReadiness({
    options: options(),
    fetchImpl: readinessFetch([
      { body: "", status: 500 },
      { body: activeBody, status: 200 },
      { body: activeBody, status: 200 },
    ]),
    sleep: async () => {},
  });
});

test("deployment readiness fails closed for a permanent failed deployment", async () => {
  await assert.rejects(
    waitForActivationDeploymentReadiness({
      options: options({ readinessMinutes: 1, pollSeconds: 60 }),
      fetchImpl: readinessFetch([{ body: "", status: 503 }]),
      sleep: async () => {},
    }),
    /SOLO_ACTIVATION_DEPLOYMENT_FLAG_NOT_READY/,
  );
});

test("alias readiness starts only after deployment readiness and waits for propagation", async () => {
  const trace = [];
  const fetchImpl = async (url, request) => {
    const target = String(url);
    trace.push({ target, request });
    const alias = target.startsWith(`https://${canonicalDomain}`);
    const attempt = trace.filter(({ target: previous }) =>
      previous.startsWith(alias ? `https://${canonicalDomain}` : deploymentUrl),
    ).length;
    if (!alias) return textResponse(activeBody);
    return textResponse(attempt < 3 ? pausedBody : activeBody);
  };

  await waitForActivationDeploymentReadiness({
    options: options(),
    fetchImpl,
    sleep: async () => {},
  });
  await waitForActivationAliasReadiness({
    options: options(),
    fetchImpl,
    sleep: async () => {},
  });

  const firstAlias = trace.findIndex(({ target }) =>
    target.startsWith(`https://${canonicalDomain}`),
  );
  assert.equal(firstAlias, 2);
  assert.equal(
    trace
      .slice(0, firstAlias)
      .every(({ target }) => target.startsWith(deploymentUrl)),
    true,
  );
});

test("an alias that remains paused after an active deployment fails with propagation timeout", async () => {
  const fetchImpl = async (url) =>
    textResponse(
      String(url).startsWith(deploymentUrl) ? activeBody : pausedBody,
    );
  await waitForActivationDeploymentReadiness({
    options: options(),
    fetchImpl,
    sleep: async () => {},
  });
  await assert.rejects(
    waitForActivationAliasReadiness({
      options: options({ readinessMinutes: 1, pollSeconds: 60 }),
      fetchImpl,
      sleep: async () => {},
    }),
    /SOLO_ACTIVATION_ALIAS_PROPAGATION_TIMEOUT/,
  );
});

test("functional smoke starts after readiness, checks PMTiles, and never prints response bodies", async () => {
  const trace = [];
  await withMarkers(async (markers) => {
    await runActivationFunctionalSmoke({
      options: options(),
      fetchImpl: async (url, request = {}) => {
        const target = String(url);
        trace.push({ target, request });
        if (target.endsWith("volta-redonda.pmtiles")) return rangeResponse();
        return textResponse(activeBody);
      },
    });
    assert.deepEqual(markers, ["SOLO_ACTIVATION_FUNCTIONAL_SMOKE_GREEN"]);
  });
  assert.deepEqual(smokeRoutes({ activationMode: true }), [
    "/comun",
    "/comun/calcadas",
    "/comun/acervo",
    "/comun/pautas",
    "/comun/mapa/contribuir?origem=calcadas",
  ]);
  assert.equal(trace.at(-1).target.endsWith("volta-redonda.pmtiles"), true);
  assert.equal(trace.at(-1).request.headers.range, "bytes=0-127");
});

test("activation monitor runs only after a functional smoke and fails closed for private markers", async () => {
  const calls = [];
  await withMarkers(async (markers) => {
    await monitorActivationStability({
      options: options(),
      fetchImpl: async (url) => {
        calls.push(String(url));
        if (String(url).endsWith("volta-redonda.pmtiles"))
          return rangeResponse();
        return textResponse(activeBody);
      },
      sleep: async () => {},
    });
    assert.deepEqual(markers, ["SOLO_ACTIVATION_MONITOR_GREEN"]);
  });
  assert.equal(
    calls.some((url) => url.endsWith("volta-redonda.pmtiles")),
    true,
  );
  await assert.rejects(
    runActivationFunctionalSmoke({
      options: options(),
      fetchImpl: async (url) => {
        if (String(url).endsWith("volta-redonda.pmtiles"))
          return rangeResponse();
        return textResponse("private_notes=never-public");
      },
    }),
    /SOLO_ACTIVATION_PUBLIC_PRIVACY_MARKER/,
  );
});

test("rollback waits for the exact deployment and canonical alias to stabilize as paused", async () => {
  const trace = [];
  const fetchImpl = async (url, request) => {
    trace.push({ target: String(url), request });
    return textResponse(pausedBody);
  };
  await withMarkers(async (markers) => {
    await waitForRollbackReadiness({
      options: options({ activationMode: false, rollbackReadiness: true }),
      fetchImpl,
      sleep: async () => {},
    });
    assert.deepEqual(markers, [
      "SOLO_ACTIVATION_ROLLBACK_DEPLOYMENT_READY",
      "SOLO_ACTIVATION_ROLLBACK_ALIAS_READY",
      "SOLO_ACTIVATION_ROLLBACK_GREEN",
    ]);
  });
  const firstAlias = trace.findIndex(({ target }) =>
    target.startsWith(`https://${canonicalDomain}`),
  );
  assert.equal(firstAlias, 2);
});

test("full activation sequence runs readiness before smoke and monitoring", async () => {
  const trace = [];
  await withMarkers(async (markers) => {
    await monitorProduction({
      argv: [
        "--minutes=1",
        `--domain=${canonicalDomain}`,
        `--deployment-url=${deploymentUrl}`,
        "--readiness-minutes=1",
        "--poll-seconds=5",
        "--require-consecutive=2",
        "--activation",
      ],
      env: {},
      fetchImpl: async (url, request = {}) => {
        const target = String(url);
        trace.push({ target, request });
        if (target.endsWith("volta-redonda.pmtiles")) return rangeResponse();
        return textResponse(activeBody);
      },
      sleep: async () => {},
    });
    assert.deepEqual(markers, [
      "SOLO_ACTIVATION_DEPLOYMENT_FLAG_VISIBLE",
      "SOLO_ACTIVATION_CANONICAL_ALIAS_READY",
      "SOLO_ACTIVATION_FUNCTIONAL_SMOKE_GREEN",
      "SOLO_ACTIVATION_MONITOR_GREEN",
      "COMUN_CALCADAS_OPERATIONAL_ACTIVATION_GREEN",
    ]);
  });
  const firstRange = trace.findIndex(({ target }) =>
    target.endsWith("volta-redonda.pmtiles"),
  );
  assert.ok(firstRange > 3);
});

test("paused detection is strict and does not expose a remote body", () => {
  assert.equal(hasPausedContribution(pausedBody), true);
  assert.equal(hasPausedContribution(activeBody), false);
});
