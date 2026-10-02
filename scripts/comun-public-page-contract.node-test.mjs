import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  inspectPublicPage,
  SECURITY_TEST_POLICY,
} from "./comun-public-page-contract.mjs";
const inspect = (html, extra = {}) =>
  inspectPublicPage(
    {
      path: "/comun",
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      html,
      ...extra,
    },
    ["Atenção"],
  );
const page = (body = "") => `<main><h1>Atenção</h1>${body}</main>`;
test("heading must occur in exposed main, with normalized accents and casing", () => {
  assert.equal(inspect("<main><h1> ATENCAO </h1></main>").valid, true);
  for (const html of [
    "<script>Atenção</script>",
    "<h1>Atenção</h1>",
    "<main hidden><h1>Atenção</h1></main>",
    '<main><h1 aria-hidden="true">Atenção</h1></main>',
    "<main><h1>Outra página</h1></main>",
  ])
    assert.equal(inspect(html).contractPresent, false);
});
test("HTML response and status are part of the contract", () => {
  assert.equal(inspect(page(), { status: 503 }).valid, false);
  assert.equal(
    inspect(page(), { headers: { "content-type": "application/json" } }).valid,
    false,
  );
});
test("placeholder syntax does not block real accessible hints", () => {
  assert.equal(
    inspect(
      page(
        '<input class="placeholder:text-gray-500" placeholder="Pesquisar cidade">',
      ),
    ).valid,
    true,
  );
  assert.equal(
    inspect(page('<script>{"placeholder":"Pesquisar cidade"}</script>')).valid,
    true,
  );
  assert.equal(inspect(page('<input placeholder="fixture">')).valid, false);
});
test("unknown synthetic markers remain blocked in visible and hidden payloads", () => {
  for (const body of [
    "<p>CONTEUDO SINTETICO</p>",
    '<script>{"value":"fixture"}</script>',
    "<div hidden>fixture</div>",
    "<!-- fixture -->",
    "<template>fixt&#117;re</template>",
    "<div hidden>fixt&#117;re</div>",
    '<script>{"value":"fixt\\u0075re"}</script>',
    '<img alt="fixture">',
  ])
    assert.equal(inspect(page(body)).valid, false, body);
});
test("reviewed security explanation is scoped, and never waives other fixture data", async () => {
  const source = await readFile(
    new URL("../app/comun/seguranca/page.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes(SECURITY_TEST_POLICY));
  assert.equal(
    inspect(page(SECURITY_TEST_POLICY), { path: "/comun/seguranca" }).valid,
    true,
  );
  assert.equal(inspect(page(SECURITY_TEST_POLICY)).valid, false);
  assert.equal(
    inspect(page(SECURITY_TEST_POLICY + "<script>fixture</script>"), {
      path: "/comun/seguranca",
    }).valid,
    false,
  );
});
test("server HTML does not assert content provenance or browser confirmation", () => {
  const result = inspect(page() + "<script>$RC()</script>");
  assert.equal(result.contentProvenance, "not_verified_by_html");
  assert.equal(result.inspection, "server_html_structure");
  assert.equal(result.browserConfirmationRequired, true);
  assert.equal(
    inspect("<script>Atenção</script>").browserConfirmationRequired,
    true,
  );
});
