import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  firstWaveRoutes,
  relationalScenarios,
  sourceMatrix,
} from "./catalog.mjs";

test("a matriz cobre exatamente os 18 cenários relacionais pedidos", () => {
  assert.equal(relationalScenarios.length, 18);
  assert.deepEqual(
    relationalScenarios.map((item) => item.id),
    Array.from({ length: 18 }, (_, index) => index + 1),
  );
});

test("toda relação declara chave, fonte pública e lacuna sem heurística", () => {
  assert.ok(sourceMatrix.length >= 14);
  for (const relation of sourceMatrix) {
    assert.ok(relation.key);
    assert.ok(relation.canonicalSource);
    assert.notEqual(relation.available, false);
  }
  assert.match(
    sourceMatrix.find(
      (item) => item.origin === "community" && item.destination === "pauta",
    ).gap,
    /sem chave estrangeira/i,
  );
});

test("contrato de entidade é allowlisted, sanitizado e não admite href externo", async () => {
  const source = await readFile("lib/comun-entity-context.ts", "utf8");
  for (const kind of [
    "territory",
    "community",
    "pauta",
    "action",
    "miniapp",
    "protocol",
    "result",
    "memory",
  ])
    assert.match(source, new RegExp(`"${kind}"`));
  assert.match(source, /relationAllowlist/);
  assert.match(source, /COMUN_ENTITY_NON_CANONICAL_HREF/);
  assert.match(source, /replace\(\/\[\\u0000-\\u001f\\u007f\]/);
});

test("primeira onda preserva feature flag e componentes relacionais", async () => {
  for (const route of firstWaveRoutes) {
    const source = await readFile(route.file, "utf8");
    for (const token of route.requiredTokens)
      assert.ok(source.includes(token), `${route.route} precisa de ${token}`);
  }
});

test("fontes culturais aceitam ausência de relação sem fabricar vínculo", () => {
  const radio = sourceMatrix.find((item) => item.origin === "radio_episode");
  const art = sourceMatrix.find((item) => item.origin === "artwork");
  assert.match(radio.gap, /opcionais/i);
  assert.match(art.gap, /não exige pauta/i);
});

test("Calçadas e relatos de pauta permanecem contagens semanticamente distintas", async () => {
  const consistency = await readFile(
    "scripts/civic-graph/audit-comun-civic-graph-consistency.mjs",
    "utf8",
  );
  assert.match(consistency, /sidewalk_records_published/);
  assert.match(consistency, /contributions_approved_public/);
  assert.match(consistency, /escopos distintos/);
  assert.doesNotMatch(consistency, /Math\.max|\|\|\s*860/);
});

test("relação privada fica bloqueada por filtros de visibilidade", async () => {
  const central = await readFile("lib/central-hub.ts", "utf8");
  const radio = await readFile("lib/radio.ts", "utf8");
  assert.match(central, /visibility", "public"|visibility.*public/);
  assert.match(
    radio,
    /publication_status", "published"|publication_status.*published/,
  );
});

test("todos os shells entram no inventário do A5 sem promover migração integral", async () => {
  const shell = await readFile("lib/comun-shell-contract.ts", "utf8");
  for (const mode of [
    "public_web",
    "member_root",
    "member_nested",
    "institutional",
    "immersive",
    "auth",
    "admin",
  ])
    assert.match(shell, new RegExp(`"${mode}"`));
});
