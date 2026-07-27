import assert from "node:assert/strict";
import test from "node:test";
import {
  assertActivationContributionAvailable,
  monitorProduction,
  parseMonitorOptions,
  smokeRoutes,
} from "./monitor-production.mjs";

const activeContributionBody = "O formulário operacional está disponível.";

function activationFetch(url) {
  const target = String(url);
  if (target.endsWith("volta-redonda.pmtiles")) {
    return new Response("range", {
      status: 206,
      headers: { "content-range": "bytes 0-127/2048" },
    });
  }
  if (target.includes("/comun/mapa/contribuir")) {
    return new Response(activeContributionBody, { status: 200 });
  }
  return new Response("ok", { status: 200 });
}

test("activation smoke accepts only the canonical non-public domain", () => {
  assert.deepEqual(
    parseMonitorOptions([
      "--minutes=2",
      "--domain=comunvrabandonada.vercel.app",
      "--activation",
    ]),
    {
      minutes: 2,
      domain: "comunvrabandonada.vercel.app",
      publicMode: false,
      activationMode: true,
    },
  );
  assert.throws(
    () =>
      parseMonitorOptions([
        "--minutes=2",
        "--domain=comunsocial.online",
        "--public",
        "--activation",
      ]),
    /SOLO_ACTIVATION_SMOKE_INPUT_INVALID/,
  );
});

test("activation smoke verifies public routes and PMTiles without GitHub deployment context", async () => {
  const requestedUrls = [];
  const originalLog = console.log;
  const markers = [];
  console.log = (marker) => markers.push(marker);
  try {
    await monitorProduction({
      argv: [
        "--minutes=1",
        "--domain=comunvrabandonada.vercel.app",
        "--activation",
      ],
      env: {},
      fetchImpl: async (url, options) => {
        requestedUrls.push({ url: String(url), options });
        return activationFetch(url);
      },
      sleep: async () => assert.fail("one activation pass must not sleep"),
    });
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(smokeRoutes({ activationMode: true }), [
    "/comun",
    "/comun/calcadas",
    "/comun/acervo",
    "/comun/mapa/contribuir?origem=calcadas",
  ]);
  assert.equal(
    requestedUrls.some(({ url }) => url.startsWith("https://api.github.com/")),
    false,
  );
  assert.equal(markers.includes("SOLO_ACTIVATION_SMOKE_GREEN"), true);
});

test("activation smoke fails closed when the contribution surface remains paused", async () => {
  await assert.rejects(
    monitorProduction({
      argv: [
        "--minutes=1",
        "--domain=comunvrabandonada.vercel.app",
        "--activation",
      ],
      env: {},
      fetchImpl: async (url) => {
        if (String(url).includes("/comun/mapa/contribuir")) {
          return new Response(
            "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.",
            { status: 200 },
          );
        }
        return activationFetch(url);
      },
    }),
    /SOLO_ACTIVATION_SMOKE_CONTRIBUTION_STILL_PAUSED/,
  );
  assert.throws(
    () =>
      assertActivationContributionAvailable(
        "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.",
      ),
    /SOLO_ACTIVATION_SMOKE_CONTRIBUTION_STILL_PAUSED/,
  );
});
