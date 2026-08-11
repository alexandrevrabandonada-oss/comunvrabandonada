import assert from "node:assert/strict";
import test from "node:test";
import {
  compareNormalizedCatalogs,
  comparePublicDocumentFacts,
  parseOfficialCatalogHtml,
} from "./transport-catalog-normalizer.mjs";

const url = "https://www.voltaredonda.rj.gov.br/horario-de-onibus/";
const card = (operator, code, label, suffix = "") => `<strong>${operator}</strong><h4>LINHA ${code}</h4><h6>${label}</h6><a href="/horario/${code}${suffix}-horarios.pdf">HORÁRIO</a><a href="/horario/${code}${suffix}-itinerarios.pdf">ITINERÁRIO</a>`;

test("normalizes cosmetic catalog drift without changing semantics", () => {
  const before = parseOfficialCatalogHtml("<strong><em>ignorar</em></strong>" + card("VIAÇÃO ELITE", "205A", "Morada da Colina x Padre Josimo"), url);
  const after = parseOfficialCatalogHtml(card("  Viação Elite  ", "205A", "Morada da Colina × Padre Josimo"), url);
  assert.equal(before.ok, true); assert.equal(after.ok, true);
  assert.equal(compareNormalizedCatalogs(before.records, after.records).semanticDiffEmpty, true);
});

test("reports added, removed, operator and URL changes deterministically", () => {
  const before = parseOfficialCatalogHtml(card("Viação Elite", "205A", "Rota") + card("Viação Elite", "210", "Outra"), url);
  const after = parseOfficialCatalogHtml(card("Viação Nova", "205A", "Rota", "-v2") + card("Viação Elite", "300", "Nova"), url);
  const diff = compareNormalizedCatalogs(before.records, after.records);
  assert.deepEqual(diff.addedLines, ["300"]); assert.deepEqual(diff.removedLines, ["210"]);
  assert.deepEqual(diff.changedOperators, ["205A"]); assert.deepEqual(diff.changedTimetableUrls, ["205A"]);
  assert.deepEqual(diff.changedItineraryUrls, ["205A"]);
});

test("fails closed on partial or conflicting catalog markup", () => {
  assert.equal(parseOfficialCatalogHtml("<html></html>", url).ok, false);
  assert.equal(parseOfficialCatalogHtml(card("A", "205A", "Rota") + card("B", "205A", "Rota"), url).ok, false);
});

test("compares only explicit public PDF facts", () => {
  assert.deepEqual(comparePublicDocumentFacts({ order: "010", departures: ["06:10"] }, { order: "010", departures: ["06:10"] }), { changedFields: [], semanticDiffEmpty: true });
  assert.deepEqual(comparePublicDocumentFacts({ order: "010", departures: ["06:10"] }, { order: "011", departures: ["06:10", "08:00"] }).changedFields, ["departures", "order"]);
});
