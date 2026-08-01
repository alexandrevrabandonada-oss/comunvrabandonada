import assert from "node:assert/strict";
import test from "node:test";
import {
  coreJourneys,
  intermediateRoutes,
  journeyMetrics,
} from "./catalog.mjs";

test("a matriz cobre os 18 fluxos pedidos", () => {
  assert.equal(coreJourneys.length, 18);
  assert.deepEqual(
    coreJourneys.map((item) => item.id),
    Array.from({ length: 18 }, (_, index) => index + 1),
  );
});

test("todas as rotas de entrada são internas e nenhum fluxo piora o orçamento", () => {
  for (const item of coreJourneys) {
    assert.match(item.entry, /^\/comun(?:\/|$)/);
    assert.ok(item.steps.after <= item.steps.before, item.intention);
    assert.ok(item.confirmation);
    assert.ok(item.tracking);
  }
});

test("rotas de passagem são classificadas sem remoção", () => {
  assert.ok(
    intermediateRoutes.some(
      (item) =>
        item.route === "/comun/participar" &&
        item.classification === "fallback",
    ),
  );
  assert.ok(
    intermediateRoutes.every((item) => item.classification !== "delete"),
  );
});

test("as métricas técnicas não contêm medição comportamental", () => {
  const metrics = journeyMetrics();
  assert.ok(metrics.screensAfter < metrics.screensBefore);
  assert.equal(metrics.lostContextsAfter, 0);
  assert.equal(metrics.authWithoutReturnAfter, 0);
});
