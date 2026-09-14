import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import {
  createReadOnlyRenderContext,
  inspectPublicDocument,
  inspectPublicAsset,
} from "./launch-document-checks.mjs";

test("rendered streaming content is measured while writes and other origins are blocked", async () => {
  let foreignHits = 0;
  const methods = [];
  const foreign = createServer((req, res) => {
    foreignHits++;
    res.end("unexpected");
  });
  await new Promise((resolve) => foreign.listen(0, "127.0.0.1", resolve));
  const other = `http://127.0.0.1:${foreign.address().port}`;
  const html = `<h1 hidden id="stream">Comunidades</h1><script>document.getElementById('stream').hidden=false;Promise.allSettled([fetch('/write',{method:'POST'}),fetch('${other}/data')]).then(()=>document.body.dataset.done='yes')</script>`;
  const owned = createServer((req, res) => {
    methods.push(req.method);
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  });
  await new Promise((resolve) => owned.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${owned.address().port}`;
  const context = await createReadOnlyRenderContext(browser, origin);
  try {
    const live = await context.newPage();
    await live.goto(origin);
    await live.waitForFunction(() => document.body.dataset.done === "yes");
    const r = await inspectPublicDocument(
      live,
      { path: "/comun/comunidades", html },
      "Comunidades",
      { rendered: true },
    );
    assert.equal(r.contractPresent, true);
    assert.equal(foreignHits, 0);
    assert.ok(methods.length > 0);
    assert.ok(methods.every((m) => m === "GET"));
  } finally {
    await context.close();
    await Promise.all([
      new Promise((r) => owned.close(r)),
      new Promise((r) => foreign.close(r)),
    ]);
  }
});
let browser, page;
const blockedRequests = [];
before(async () => {
  browser = await chromium.launch();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    serviceWorkers: "block",
  });
  await context.route("**/*", (route) => {
    blockedRequests.push(route.request().url());
    return route.abort();
  });
  page = await context.newPage();
});
after(async () => {
  await browser?.close();
});
const check = (html, path = "/comun/comunidades", expected = "Comunidades") =>
  inspectPublicDocument(page, { html, path, status: 200 }, expected);
test("input placeholder and CSS variant are not demonstration records", async () => {
  assert.deepEqual(
    (
      await check(
        '<h1>Comunidades</h1><input placeholder="Buscar" class="placeholder:text-gray">',
      )
    ).forbiddenMarkers,
    [],
  );
});
test("real demonstration text still blocks", async () => {
  assert.ok(
    (await check("<h1>Comunidades</h1><p>Registros demonstrativos</p>"))
      .contentMarkers.length,
  );
  assert.ok(
    (
      await check("<h1>Comunidades</h1><p>fixture de comunidade</p>")
    ).contentMarkers.includes("fixture"),
  );
});
test("editorial security heading and exact technical explanation are legitimate", async () => {
  const r = await check(
    "<h1>Como o COMUN protege relatos</h1><p>Verificacoes tecnicas usam fixtures descartaveis, exigem acesso administrativo e nunca enviam segredos ou originais privados ao navegador.</p>",
    "/comun/seguranca",
    "Segurança",
  );
  assert.equal(r.contractPresent, true);
  assert.deepEqual(r.forbiddenMarkers, []);
});
test("an additional fixture record is not hidden by the explanation exception", async () => {
  const r = await check(
    "<h1>Como o COMUN protege relatos</h1><p>Verificacoes tecnicas usam fixtures descartaveis, exigem acesso administrativo e nunca enviam segredos ou originais privados ao navegador.</p><article>fixture publicado</article>",
    "/comun/seguranca",
    "Segurança",
  );
  assert.ok(r.contentMarkers.includes("fixture"));
});
test("script-only and hidden titles never satisfy the journey", async () => {
  for (const html of [
    '<script>"Comunidades"</script>',
    "<h1 hidden>Comunidades</h1>",
    '<h1 style="display:none">Comunidades</h1>',
    '<div aria-hidden="true">Comunidades</div>',
  ])
    assert.equal((await check(html)).contractPresent, false);
});
test("entities accents and editorial whitespace are decoded by browser", async () => {
  assert.equal(
    (await check("<h1>R&#225;dio\n comunitária</h1>", "/comun/radio", "Rádio"))
      .contractPresent,
    true,
  );
});

test("navigation and body keywords do not replace the page heading", async () => {
  assert.equal(
    (
      await check(
        '<nav>Comunidades</nav><h1>Outra página</h1><script>"Comunidades"</script>',
      )
    ).contractPresent,
    false,
  );
  assert.equal(
    (await check("<h1>Outra página</h1><p>Comunidades</p>")).contractPresent,
    false,
  );
  assert.equal(
    (await check("<h1>Memória viva da cidade</h1>", "/comun/acervo", "Acervo"))
      .contractPresent,
    true,
  );
});
test("explicit synthetic origin is checked separately from visible text", async () => {
  const r = await check(
    '<h1>Comunidades</h1><div hidden data-fixture="true">x</div>',
  );
  assert.equal(r.contractPresent, true);
  assert.deepEqual(r.originMarkers, ["explicit_synthetic_origin"]);
  assert.equal(r.provenanceVerified, false);
});
test("private data in scripts still blocks and is not returned in the evidence", async () => {
  const r = await check(
    '<h1>Comunidades</h1><script>{"original_object_key":"radio-originals/synthetic/original.wav"}</script>',
  );
  assert.ok(r.payloadLeaks.includes("private_original_key"));
  assert.ok(!JSON.stringify(r).includes("synthetic/original.wav"));
});
test("page scripts are disabled and subresources intercepted", async () => {
  const requested = page.waitForRequest("https://example.invalid/image");
  await check(
    '<h1>Comunidades</h1><script>globalThis.compromised=true;fetch("https://example.invalid/private")</script><img src="https://example.invalid/image">',
  );
  await requested;
  assert.equal(
    await page.evaluate(() => typeof globalThis.compromised),
    "undefined",
  );
  assert.ok(blockedRequests.includes("https://example.invalid/image"));
  assert.ok(!blockedRequests.includes("https://example.invalid/private"));
});
test("HTML 200 is not robots", async () => {
  assert.equal(
    (
      await inspectPublicAsset(
        page,
        "robots",
        { status: 200, html: "<html>ok</html>" },
        "http://127.0.0.1:3999",
      )
    ).valid,
    false,
  );
});
test("restricted pilot robots is valid without enabling indexation", async () => {
  const r = await inspectPublicAsset(
    page,
    "robots",
    { status: 200, html: "User-agent: *\nDisallow: /" },
    "http://127.0.0.1:3999",
  );
  assert.equal(r.valid, true);
  assert.equal(r.policy, "restricted_pilot");
});
test("robots without private exclusions or with allow override fails", async () => {
  for (const html of [
    "User-agent: *\nAllow: /",
    "User-agent: *\nDisallow: /\nAllow: /api",
  ])
    assert.equal(
      (
        await inspectPublicAsset(
          page,
          "robots",
          { status: 200, html },
          "http://127.0.0.1:3999",
        )
      ).valid,
      false,
    );
});
test("sitemap requires XML namespace and public same-origin locations", async () => {
  for (const html of [
    "<html>ok</html>",
    "<urlset/>",
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://127.0.0.1:3999/comun/admin</loc></url></urlset>',
  ])
    assert.equal(
      (
        await inspectPublicAsset(
          page,
          "sitemap",
          { status: 200, html },
          "http://127.0.0.1:3999",
        )
      ).valid,
      false,
    );
  const r = await inspectPublicAsset(
    page,
    "sitemap",
    {
      status: 200,
      html: '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://127.0.0.1:3999/comun</loc></url></urlset>',
    },
    "http://127.0.0.1:3999",
  );
  assert.equal(r.valid, true);
});
