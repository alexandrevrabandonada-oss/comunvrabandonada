import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name.includes("pwa-standalone"))
    await page.addInitScript(() => {
      const native = window.matchMedia.bind(window);
      window.matchMedia = (query: string) =>
        query === "(display-mode: standalone)"
          ? ({
              matches: true,
              media: query,
              onchange: null,
              addListener() {},
              removeListener() {},
              addEventListener() {},
              removeEventListener() {},
              dispatchEvent: () => true,
            } as MediaQueryList)
          : native(query);
    });
});

test("a URL canônica abre o V2 e o rollback explícito abre o legado", async ({
  page,
}, testInfo) => {
  await page.goto("/comun");
  await expect(page.locator(".comun-app-shell-v2")).toHaveAttribute(
    "data-comun-shell-mode",
    "member_root",
  );
  const v2Navigation = page.locator('[data-comun-bottom-navigation="app-v2"]');
  await expect(v2Navigation).toBeAttached();
  if (!testInfo.project.name.includes("desktop"))
    await expect(v2Navigation).toBeVisible();
  await expect(page).toHaveURL(/\/comun$/);

  await page.goto("/comun?experiencia=legacy");
  await expect(page.locator(".comun-app-shell-v2")).toHaveCount(0);
  const legacyNavigation = page.locator(
    '[data-comun-bottom-navigation="legacy"]',
  );
  await expect(legacyNavigation).toBeAttached();
  if (!testInfo.project.name.includes("desktop"))
    await expect(legacyNavigation).toBeVisible();
  await expect(page).toHaveURL(/experiencia=legacy/);
});

test("roots, auth e nested recebem o shell correto sem flag", async ({
  page,
}, testInfo) => {
  await page.goto("/comun/participar");
  await expect(page.locator(".comun-app-shell-v2")).toHaveAttribute(
    "data-comun-shell-mode",
    "member_root",
  );
  const rootNavigation = page.locator(
    '[data-comun-bottom-navigation="app-v2"]',
  );
  await expect(rootNavigation).toBeAttached();
  if (!testInfo.project.name.includes("desktop"))
    await expect(rootNavigation).toBeVisible();

  await page.goto("/comun/entrar");
  await expect(page.locator(".comun-app-shell-v2")).toHaveAttribute(
    "data-comun-shell-mode",
    "auth",
  );
  await expect(page.locator("[data-comun-bottom-navigation]")).toHaveCount(0);
  await expect(page.getByLabel("E-mail")).toBeVisible();

  await page.goto("/comun/pautas/trabalho-burnout-volta-redonda");
  await expect(page.locator(".comun-app-shell-v2")).toHaveAttribute(
    "data-comun-shell-mode",
    "member_nested",
  );
  await expect(page.locator("[data-comun-bottom-navigation]")).toHaveCount(0);
  const nestedAppBar = page.locator('[data-comun-app-bar="contextual-v2"]');
  await expect(nestedAppBar).toBeAttached();
  if (!testInfo.project.name.includes("desktop"))
    await expect(nestedAppBar).toBeVisible();
});

test("links canônicos não propagam a flag e a navegação legada a preserva", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "360x800");

  await page.goto("/comun");
  const v2Links = await page
    .locator('a[href^="/comun"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(v2Links.some((href) => href?.includes("experiencia="))).toBe(false);

  await page.goto("/comun?experiencia=legacy");
  const legacyNavigation = page.locator(
    '[data-comun-bottom-navigation="legacy"] a',
  );
  await expect(legacyNavigation.first()).toHaveAttribute(
    "href",
    /experiencia=legacy/,
  );

  await page.goto("/comun/explorar?experiencia=legacy");
  const territoryLink = page.getByRole("link", { name: "Territórios" });
  await territoryLink.dispatchEvent("contextmenu", { button: 2 });
  await expect(territoryLink).toHaveAttribute("href", /experiencia=legacy/);
  await territoryLink.click();
  await expect(page).toHaveURL(/\/comun\/territorios\?experiencia=legacy/);

  await page.goto("/comun/explorar?experiencia=legacy");
  await page.getByLabel("Buscar no COMUN").fill("mobilidade");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/comun\/buscar\?/);
  expect(new URL(page.url()).searchParams.get("experiencia")).toBe("legacy");
});

test("a compatibilidade app-v2 aponta para a canônica sem loop", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "360x800");

  const response = await request.get(
    "/comun/participar?experiencia=app-v2&origem=atalho",
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBe("noindex, follow");
  expect(response.headers().link).toContain("/comun/participar?origem=atalho");
  expect(response.headers().link).not.toContain("experiencia=");

  const legacyResponse = await request.get(
    "/comun/participar?experiencia=legacy&origem=rollback",
  );
  expect(legacyResponse.status()).toBe(200);
  expect(legacyResponse.headers()["x-robots-tag"]).toBe("noindex, follow");
  expect(legacyResponse.headers().link).toContain(
    "/comun/participar?origem=rollback",
  );
  expect(legacyResponse.headers().link).not.toContain("experiencia=");

  await page.goto("/comun/participar?experiencia=app-v2");
  await expect(page.locator(".comun-app-shell-v2")).toHaveAttribute(
    "data-comun-shell-mode",
    "member_root",
  );
});

test("auth e returnTo mantêm V2 canônico ou legado explícito", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "360x800");

  await page.goto(
    "/comun/entrar?returnTo=%2Fcomun%2Fparticipar%3Fexperiencia%3Dapp-v2",
  );
  await expect(page.locator(".comun-app-shell-v2")).toHaveAttribute(
    "data-comun-shell-mode",
    "auth",
  );
  await expect(
    page.getByRole("link", { name: "Criar conta" }),
  ).not.toHaveAttribute("href", /experiencia=/);

  await page.goto(
    "/comun/entrar?experiencia=legacy&returnTo=%2Fcomun%2Fparticipar%3Fexperiencia%3Dlegacy",
  );
  await expect(page.locator(".comun-app-shell-v2")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Criar conta" })).toHaveAttribute(
    "href",
    /experiencia=legacy/,
  );
  await expect(
    page.getByRole("link", { name: "Esqueci minha senha" }),
  ).toHaveAttribute("href", /experiencia=legacy/);
});

test("admin continua protegido e preserva o recorte canônico", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "360x800");

  await page.goto("/comun/admin?fila=triage");
  await expect(page).toHaveURL(/\/comun\/admin\/login/);
  const current = new URL(page.url());
  expect(current.searchParams.get("redirectTo")).toBe(
    "/comun/admin?fila=triage",
  );
  expect(current.searchParams.get("experiencia")).toBeNull();

  await page.goto("/comun/admin?experiencia=legacy&fila=triage");
  await expect(page).toHaveURL(/\/comun\/admin\/login/);
  const legacy = new URL(page.url());
  expect(legacy.searchParams.get("experiencia")).toBe("legacy");
  expect(legacy.searchParams.get("redirectTo")).toContain("experiencia=legacy");
});

test("manifest e service worker promovem o V2 sem cache privado", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "pwa-standalone-430x932");

  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/comun");
  expect(manifest.scope).toBe("/comun/");
  const worker = await (await request.get("/sw.js")).text();
  expect(worker).toContain('const VERSION = "comun-pwa-v3"');
  expect(worker).toContain('"/comun/admin"');
  expect(worker).toContain('"/comun/entrar"');
  expect(worker).toContain('type === "CLEAR_CONTENT_CACHES"');

  await page.goto("/comun");
  await expect(page.getByTestId("standalone-active")).toBeAttached();
  await expect(page.locator(".comun-app-shell-v2")).toHaveAttribute(
    "data-comun-shell-mode",
    "member_root",
  );
});
