import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  inspectPublicPage,
  PUBLIC_PAGE_CONTRACTS,
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
const streamedPage = (body = page(), completion = '$RC("B:0","S:0")') =>
  `<!doctype html><html><body><!--$?--><template id="B:0"></template><p>Carregando experiência…</p><!--/$--><div hidden id="S:0">${body}</div><script>${completion}</script></body></html>`;

test("React segment insertion completes content inside the streamed main", () => {
  const html =
    streamedPage('<main><template id="P:1"></template></main>') +
    '<div hidden id="S:1"><h1>Atenção</h1></div><script>$RS("S:1","P:1")</script>';
  const result = inspect(html);
  assert.equal(result.valid, true);
  assert.equal(result.completedStreamSegments, 1);
  for (const broken of [
    html.replace('$RS("S:1","P:1")', ""),
    html.replace('$RS("S:1","P:1")', '$RS("S:9","P:1")'),
    html.replace('$RS("S:1","P:1")', '$RS("S:1","P:9")'),
    html.replace('$RS("S:1","P:1")', 'const fake = \'$RS("S:1","P:1")\''),
    html.replace('<template id="P:1"></template>', '<div id="P:1"></div>'),
    html + '<template id="P:1"></template>',
    html.replace("<h1>Atenção</h1>", "<h1 hidden>Atenção</h1>"),
  ])
    assert.equal(inspect(broken).contractPresent, false);
  assert.equal(
    inspect(html.replace("<h1>Atenção</h1>", "<h1>Atenção</h1><p>fixture</p>"))
      .valid,
    false,
  );
  assert.equal(
    inspect(
      html.replace(
        '<template id="P:1"></template>',
        '<div hidden><template id="P:1"></template></div>',
      ),
    ).contractPresent,
    false,
  );
});

test("RSC style syntax is classified without excluding data markers", () => {
  const transport = (value) =>
    `<script>self.__next_f.push(${JSON.stringify([1, JSON.stringify(value)])})</script>`;
  assert.equal(
    inspect(
      page() +
        transport({
          className: "placeholder:text-comun-paper/50",
          placeholder: "Buscar",
        }),
    ).valid,
    true,
  );
  for (const value of [
    { className: "placeholder:text-comun-paper/50", value: "fixture" },
    { className: "placeholder:text-comun-paper/50", value: "placeholder" },
    { placeholder: "fixture" },
    { value: "placeholder:text-comun-paper/50" },
    { value: "fixt\\u0075re" },
  ])
    assert.equal(inspect(page() + transport(value)).valid, false);
  assert.equal(
    inspect(page("<p>placeholder:text-comun-paper/50</p>")).valid,
    false,
  );
  assert.equal(
    inspect(
      page() + '<script>self.__next_f.push([1,"invalid placeholder"])</script>',
    ).valid,
    false,
  );
});

test("four delta routes accept completed React Suspense headings inside main", () => {
  for (const path of [
    "/comun",
    "/comun/participar",
    "/comun/radio",
    "/comun/observatorios",
  ]) {
    const [, headings] = PUBLIC_PAGE_CONTRACTS.find(
      ([route]) => route === path,
    );
    const result = inspectPublicPage(
      {
        path,
        status: 200,
        headers: { "content-type": "text/html" },
        html: streamedPage(`<main><h1>${headings[0]}</h1></main>`),
      },
      headings,
    );
    assert.equal(result.valid, true, path);
    assert.equal(result.completedStreamBoundaries, 1);
    assert.equal(result.browserConfirmationRequired, true);
  }
});

test("stream completion never waives missing, wrong or genuinely hidden headings", () => {
  for (const html of [
    streamedPage(page(), ""),
    streamedPage(page(), '$RC("B:9","S:0")'),
    streamedPage(page(), '$RC("B:0","S:9")'),
    streamedPage(page(), 'const payload = \'$RC("B:0","S:0")\''),
    streamedPage(page()).replace("<!--/$-->", ""),
    streamedPage(page())
      .replace("<body>", "<body><div hidden>")
      .replace("</body>", "</div></body>"),
    streamedPage("<h1>Atenção</h1>"),
    streamedPage("<main><h1>Outra página</h1></main>"),
    streamedPage("<main hidden><h1>Atenção</h1></main>"),
    streamedPage('<main><h1 aria-hidden="true">Atenção</h1></main>'),
  ])
    assert.equal(inspect(html).contractPresent, false, html);
});

test("completed stream retains full payload scan and visible marker checks", () => {
  for (const body of [
    "<p>fixture</p>",
    "<div hidden>fixture</div>",
    '<script>{"value":"fixture"}</script>',
  ]) {
    const result = inspect(streamedPage(page(body)));
    assert.equal(result.contractPresent, true);
    assert.equal(result.valid, false);
    assert.deepEqual(result.unresolvedPayloadMarkers, ["fixture"]);
  }
  assert.deepEqual(
    inspect(streamedPage(page("<p>fixture</p>"))).visibleMarkers,
    ["fixture"],
  );
});
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
