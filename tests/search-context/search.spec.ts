import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const base = "http://127.0.0.1:3152";
const search =
  "/comun/buscar?q=cultura&tipo=mem%C3%B3ria&pauta=cultura-local&territorio=roda-local&semantic=0";
test.beforeEach(async ({ page }, info) => {
  let n = 0;
  for (const c of info.testId + info.project.name)
    n = (n * 31 + c.charCodeAt(0)) % 250;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${n + 1}` });
  await page.route("**/*", (r) =>
    new URL(r.request().url()).origin === base ? r.continue() : r.abort(),
  );
});
const result = (page: import("@playwright/test").Page) =>
  page
    .getByRole("link", { name: "Memória da praça — laboratório", exact: true })
    .filter({ visible: true });
const ready = async (page: import("@playwright/test").Page) => {
  await expect(
    page.getByRole("status", { name: "Estado da busca pública" }),
  ).not.toContainText("Verificando");
};
test("multiple public filters, detail, explicit return, repeated history and focus", async ({
  page,
}) => {
  const errors: string[] = [];
  const bad: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text() + " " + m.location().url);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(new URL(r.url()).pathname);
  });
  page.on("request", (r) => {
    if (r.method() !== "GET" && r.method() !== "HEAD") writes.push(r.method());
  });
  await page.goto(search);
  await ready(page);
  await result(page).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("link", { name: "Voltar aos resultados da busca" }),
  ).toBeVisible();
  await page.goBack();
  await ready(page);
  await expect(page).toHaveURL(/pauta=cultura-local/);
  await expect(page).toHaveURL(/territorio=roda-local/);
  await expect(result(page)).toBeFocused();
  await page.goForward();
  await page
    .getByRole("link", { name: "Voltar aos resultados da busca" })
    .click();
  await ready(page);
  await expect(result(page)).toBeFocused();
  await page.goBack();
  await expect(
    page.getByRole("link", { name: "Voltar aos resultados da busca" }),
  ).toBeVisible();
  await page.goForward();
  await ready(page);
  await expect(
    page.getByRole("textbox", { name: "Termo de busca" }),
  ).toHaveValue("cultura");
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
  expect(writes).toEqual([]);
});
test("new tab and direct link preserve context only when explicit", async ({
  page,
  context,
}) => {
  await page.goto(search);
  await ready(page);
  const href = await result(page).getAttribute("href");
  const tab = await context.newPage();
  await tab.goto(href!);
  await expect(
    tab.getByRole("link", { name: "Voltar aos resultados da busca" }),
  ).toBeVisible();
  await tab
    .getByRole("link", { name: "Voltar aos resultados da busca" })
    .click();
  await ready(tab);
  await expect(tab).toHaveURL(/tipo=mem/);
  await tab.goto("/comun/acervo/memoria-local");
  await expect(
    tab.getByRole("link", { name: "Voltar aos resultados da busca" }),
  ).toHaveCount(0);
  await tab.close();
});
test("external and malformed return are never offered", async ({ page }) => {
  for (const target of [
    "https://evil.invalid/",
    "javascript:alert(1)",
    "/comun/admin?x=1",
    "/comun/buscar?q=cultura&token=not-public",
  ]) {
    await page.goto(
      `/comun/acervo/memoria-local?busca=${encodeURIComponent(target)}`,
    );
    await expect(
      page.getByRole("link", { name: "Voltar aos resultados da busca" }),
    ).toHaveCount(0);
  }
});
test("withdrawal while detail is open is not revived by browser back", async ({
  page,
  context,
}) => {
  await page.goto(search);
  await ready(page);
  await result(page).click();
  await expect(
    page.getByRole("link", { name: "Voltar aos resultados da busca" }),
  ).toBeVisible();
  await context.addCookies([
    { name: "search-context-lab", value: "withdrawn", url: base },
  ]);
  await page.goBack();
  await ready(page);
  await expect(result(page)).toHaveCount(0);
  await expect(
    page.getByRole("status", { name: "Estado da busca pública" }),
  ).toContainText("Não encontramos");
});
test("empty, total failure and partial failure are different usable states", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "search-context-lab", value: "empty", url: base },
  ]);
  await page.goto("/comun/buscar?q=cultura");
  await ready(page);
  await expect(
    page.getByRole("status", { name: "Estado da busca pública" }),
  ).toContainText("Não encontramos");
  await context.addCookies([
    { name: "search-context-lab", value: "down", url: base },
  ]);
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("status", { name: "Estado da busca pública" }),
  ).toContainText("Busca indisponível");
  await expect(
    page.getByRole("button", { name: "Tentar novamente" }),
  ).toBeVisible();
  await context.addCookies([
    { name: "search-context-lab", value: "partial", url: base },
  ]);
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("status", { name: "Estado da busca pública" }),
  ).toContainText("algumas fontes indisponíveis");
  await expect(
    page.getByRole("link", { name: "Cultura local", exact: true }),
  ).toBeVisible();
});
test("remove one and all filters explicitly, retain query and browser history", async ({
  page,
}) => {
  await page.goto(search);
  await ready(page);
  await page.getByRole("link", { name: /Remover tipo/ }).click();
  await ready(page);
  expect(new URL(page.url()).searchParams.has("tipo")).toBe(false);
  await expect(page).toHaveURL(/pauta=cultura-local/);
  await page
    .getByRole("link", { name: "Limpar filtros e manter busca" })
    .click();
  await ready(page);
  expect(new URL(page.url()).searchParams.get("q")).toBe("cultura");
  expect(new URL(page.url()).searchParams.has("pauta")).toBe(false);
  await page.goBack();
  await ready(page);
  await expect(page).toHaveURL(/pauta=cultura-local/);
  await page.goBack();
  await ready(page);
  await expect(page).toHaveURL(/tipo=mem/);
});
test("loading is announced, keyboard and mobile layout remain usable", async ({
  page,
}) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>((r) => (release = r));
  await page.route("**/api/comun/civic-search?**", async (route) => {
    await barrier;
    await route.continue();
  });
  await page.goto(search);
  await expect(
    page.getByRole("status", { name: "Estado da busca pública" }),
  ).toContainText("Verificando");
  release();
  await ready(page);
  await result(page).focus();
  await expect(result(page)).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations).toEqual([]);
});
test("sensitive form submission never enters query URL, HTML or read request", async ({
  page,
}) => {
  const urls: string[] = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/comun/buscar");
  await page
    .getByRole("textbox", { name: "Termo de busca" })
    .fill("pessoa@example.invalid");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("alert", { name: "Consulta pública" }),
  ).toContainText("Use somente termos públicos");
  expect(page.url()).not.toContain("example.invalid");
  expect(await page.content()).not.toContain("pessoa@example.invalid");
  expect(
    urls.some((u) => u.includes("example.invalid") || u.includes("example%")),
  ).toBe(false);
});
