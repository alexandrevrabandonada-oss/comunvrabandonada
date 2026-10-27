import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const base = "http://127.0.0.1:3150";
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    return u.origin === base ? route.continue() : route.abort();
  });
});
test("descoberta e retorno funcionam sem JavaScript", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport || { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    await page.goto("/comun/explorar?experiencia=app-v2");
    const rail = page.getByRole("region", { name: "Para conhecer com calma" });
    await expect(rail).toBeVisible();
    await rail.getByRole("link").first().click();
    await expect(
      page.getByRole("link", { name: "Voltar à descoberta" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Voltar à descoberta" }).click();
    await expect(
      page.getByRole("region", { name: "Para conhecer com calma" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
test("Jogos tem destino público real no laboratório, sem fixture 404", async ({
  page,
  request,
}) => {
  const response = await request.get("/comun/jogos");
  expect(response.status()).toBe(200);
  await page.goto("/comun/jogos");
  await expect(
    page.getByRole("link", { name: "Explorar mais conteúdos" }),
  ).toHaveAttribute("href", "/comun/explorar");
  await expect(
    page.getByRole("link", { name: /Voltar a Explorar/ }),
  ).toHaveCount(0);
  await page.goto("/comun/explorar?experiencia=legacy&categoria=radio");
  await expect(page.getByRole("link", { name: "Jogos" })).toHaveAttribute(
    "href",
    "/comun/jogos",
  );
  await page.getByRole("link", { name: "Jogos" }).click();
  await expect(
    page.getByRole("heading", { name: "VR: Cidade em Disputa" }),
  ).toBeVisible();
});

test("real Explorar page exposes three public sources without account or writes", async ({
  page,
}) => {
  const errors: string[] = [];
  const writes: string[] = [];
  const httpErrors: number[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) httpErrors.push(r.status());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!["GET", "HEAD"].includes(r.method())) writes.push(r.method());
  });
  await page.goto("/comun/explorar?experiencia=app-v2");
  const rail = page.getByRole("region", { name: "Para conhecer com calma" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("link")).toHaveCount(3);
  await expect(rail).toContainText("Acervo comunitário");
  await expect(rail).toContainText("Vozes locais");
  await expect(rail).toContainText("Roda local");
  expect(
    (
      await new AxeBuilder({ page })
        .include('[aria-labelledby="public-discovery-heading"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await rail.getByRole("link").first().focus();
  await expect(rail.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("link", { name: "Voltar à descoberta" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar à descoberta" }).click();
  await expect(rail).toBeVisible();
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
  expect(httpErrors).toEqual([]);
});
test("successful empty sources preserve existing category navigation", async ({
  context,
  page,
}) => {
  await context.addCookies([
    { name: "discovery-lab", value: "empty", url: base },
  ]);
  await page.goto("/comun/explorar?experiencia=app-v2");
  await expect(
    page.getByRole("heading", { name: "Para conhecer com calma" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Acervo/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({
      hasText: "Não encontramos itens públicos verificáveis",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "categorias para explorar" }),
  ).toBeVisible();
});
test("a failed source leaves the others usable and states its limitation", async ({
  context,
  page,
}) => {
  await context.addCookies([
    { name: "discovery-lab", value: "archive-down", url: base },
  ]);
  await page.goto("/comun/explorar?experiencia=app-v2");
  const rail = page.getByRole("region", { name: "Para conhecer com calma" });
  await expect(rail.getByRole("link")).toHaveCount(2);
  await expect(rail.getByRole("status")).toContainText(
    "temporariamente indisponíveis",
  );
});
test("withdrawal between listing and detail revalidates instead of rendering stale content", async ({
  context,
  page,
}) => {
  await page.goto("/comun/explorar?experiencia=app-v2");
  const href = await page
    .getByRole("region", { name: "Para conhecer com calma" })
    .getByRole("link")
    .first()
    .getAttribute("href");
  await context.addCookies([
    { name: "discovery-lab", value: "withdrawn", url: base },
  ]);
  await page.goto(href!);
  await expect(
    page.getByRole("heading", { name: "Conteúdo indisponível" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Memória da praça — laboratório" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar ao Explorar" }).click();
  await expect(page).toHaveURL(/comun\/explorar/);
});
test("direct external entry does not invent history; explicit return carries only public context", async ({
  page,
}) => {
  await page.goto("/comun/acervo/memoria-local");
  await expect(
    page.getByRole("link", { name: "Voltar à descoberta" }),
  ).toHaveCount(0);
  await page.goto(
    "/comun/acervo/memoria-local?origem=descoberta&experiencia=app-v2&categoria=acervo&access_token=PRIVATE&returnTo=https://evil.invalid",
  );
  const href = await page
    .getByRole("link", { name: "Voltar à descoberta" })
    .getAttribute("href");
  expect(href).toContain("categoria=acervo");
  expect(href).not.toMatch(/PRIVATE|evil|access_token|returnTo/);
});
test("offer destination identifies the revalidated item and its removal", async ({
  context,
  page,
}) => {
  await page.goto(
    "/comun/cooperativas/roda-local?oferta=troca-local&origem=descoberta",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Você veio conhecer" }),
  ).toContainText("Troca de livros");
  await context.addCookies([
    { name: "discovery-lab", value: "withdrawn", url: base },
  ]);
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: "Este item" }),
  ).toContainText("não está mais disponível");
});
