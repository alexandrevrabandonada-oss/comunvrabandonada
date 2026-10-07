import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("manifest válido, escopo e atalhos seguros", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: "/comun/",
    start_url: "/comun",
    scope: "/comun/",
    display: "standalone",
  });
  expect(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
  ).toBeTruthy();
  expect(manifest.shortcuts).toHaveLength(5);
  expect(manifest.shortcuts[0]).toMatchObject({
    name: "Vi um problema",
    url: "/comun/relatar",
  });
  expect(manifest.share_target).toBeUndefined();
});

test("shell registra service worker e não tem violações Axe graves", async ({
  page,
}) => {
  await page.goto("/comun");
  await expect(
    page.getByRole("link", { name: "Início" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        navigator.serviceWorker?.getRegistration("/comun/").then(Boolean),
      ),
    )
    .toBeTruthy();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("share sheet receives a page link without query strings or fragments", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload: { title: string; text: string; url: string }) => {
        (window as Window & { __comunSharePayload?: typeof payload }).__comunSharePayload =
          payload;
      },
    });
  });
  await page.goto("/comun/pautas?utm_source=private#top");

  const shareButton = page.locator(
    'button[aria-label="Compartilhar esta página"]:visible',
  );
  if (!(await shareButton.count()))
    await page.getByRole("button", { name: "Mais ações" }).click();
  await shareButton.click();

  const payload = await page.evaluate(
    () =>
      (window as Window & {
        __comunSharePayload?: { title: string; text: string; url: string };
      }).__comunSharePayload,
  );
  expect(payload?.url).toMatch(/\/comun\/pautas$/);
  expect(payload?.url).not.toContain("utm_source");
  expect(payload?.url).not.toContain("#");
  expect(payload?.title).toBeTruthy();
});

test("copy fallback gives a clear confirmation when native sharing is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { __comunCopiedUrl?: string }).__comunCopiedUrl =
            value;
        },
      },
    });
  });
  await page.goto("/comun?utm_source=private#top");

  const shareButton = page.locator(
    'button[aria-label="Compartilhar esta página"]:visible',
  );
  if (!(await shareButton.count()))
    await page.getByRole("button", { name: "Mais ações" }).click();
  await shareButton.click();

  await expect(shareButton).toContainText("Link copiado");
  await expect(shareButton.getByRole("status")).toHaveText("Link copiado.");
  const copiedUrl = await page.evaluate(
    () => (window as Window & { __comunCopiedUrl?: string }).__comunCopiedUrl,
  );
  expect(copiedUrl).toBeTruthy();
  expect(copiedUrl).not.toContain("utm_source");
  expect(copiedUrl).not.toContain("#");
});

test("fallback offline explica limites sem simular envio", async ({ page }) => {
  await page.goto("/comun/offline");
  await expect(
    page.getByRole("heading", { name: "Sem conexão agora." }),
  ).toBeVisible();
  await expect(page.getByText(/fotos não são guardadas/i)).toBeVisible();
  await expect(
    page.getByText(/precisam de conexão para confirmação/i),
  ).toBeVisible();
});

test("conteúdo privado está fora da política de cache", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  for (const route of [
    "/comun/admin",
    "/comun/minha-participacao",
    "/comun/caixa-de-entrada",
    "/api/",
  ])
    expect(sw).toContain(route);
  expect(sw).toContain('request.method !== "GET"');
  expect(sw).toContain('response.headers.has("set-cookie")');
  expect(sw).toContain("!url.search");
  expect(sw).toContain("!url.hash");
  expect(sw).toContain('cacheControl.includes("no-store")');
  expect(sw).toContain('type === "CLEAR_CONTENT_CACHES"');
  expect(sw).toContain("key !== SHELL_CACHE");
  expect(sw).toContain('const VERSION = "comun-pwa-v3"');
});

test("shell offline continua honesto e não confirma mutações", async ({
  page,
  context,
}) => {
  await page.goto("/comun/offline");
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker?.ready.then(Boolean)),
    )
    .toBeTruthy();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sem conexão agora." }),
  ).toBeVisible();
  await expect(
    page.getByText(/qualquer envio precisam de conexão/i),
  ).toBeVisible();
  await expect(page.getByText(/fotos não são guardadas/i)).toBeVisible();
  await context.setOffline(false);
});

test("logout limpa caches de conteúdo sem apagar o shell seguro", async ({
  page,
}) => {
  await page.goto("/comun/offline");
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker?.ready.then(Boolean)),
    )
    .toBeTruthy();
  await page.evaluate(async () => {
    const cache = await caches.open("comun-pwa-v3-public");
    await cache.put(
      "/comun/pautas/fixture-publica",
      new Response("fixture pública"),
    );
    navigator.serviceWorker.controller?.postMessage({
      type: "CLEAR_CONTENT_CACHES",
    });
  });
  await expect
    .poll(() =>
      page.evaluate(
        async () => !(await caches.keys()).includes("comun-pwa-v3-public"),
      ),
    )
    .toBeTruthy();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await caches.keys()).includes("comun-pwa-v3-shell"),
      ),
    )
    .toBeTruthy();
});
