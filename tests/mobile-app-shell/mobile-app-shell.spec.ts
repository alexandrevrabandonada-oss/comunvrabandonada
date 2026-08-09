import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("Motorola mobile abre Relata em um gesto sem modal ou login", async ({
  page,
}) => {
  await page.goto("/comun");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(nav).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Início", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link")).toHaveCount(5);
  await expect(nav.getByRole("button")).toHaveCount(0);
  const relata = nav.getByRole("link", { name: "Vi um problema" });
  await expect(relata).toHaveAttribute("href", /\/comun\/relatar/);
  await relata.click();
  await expect(page).toHaveURL(/\/comun\/relatar/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/comun\/entrar/);
});

test("Motorola Home abre Relata em um gesto", async ({ page }) => {
  await page.goto("/comun");
  const action = page.getByRole("link", { name: /Vi um problema/ }).first();
  await expect(action).toBeVisible();
  await action.click();
  await expect(page).toHaveURL(/\/comun\/relatar/);
});

test("Calçadas usa o fluxo P4 canônico sem conta obrigatória", async ({
  page,
}) => {
  await page.goto("/comun");
  await page
    .getByRole("link", { name: "Calçadas", exact: true })
    .first()
    .click();
  await page
    .getByRole("link", { name: /Registrar/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/comun\/calcadas\/contribuir/);
  await expect(page).not.toHaveURL(/\/comun\/(entrar|mapa\/contribuir)/);
});

test("Explorar agrupa diretórios e miniapp preserva uma navegação local", async ({
  page,
}) => {
  await page.goto("/comun/explorar");
  await expect(page.getByRole("heading", { name: "Explorar" })).toBeVisible();
  for (const name of [
    "Territórios",
    "Comunidades",
    "Pautas",
    "Ferramentas",
    "Resultados",
    "Acervo",
  ])
    await expect(
      page.getByRole("link", { name, exact: true }).first(),
    ).toBeVisible();
  await page.goto("/comun/calcadas");
  await expect(
    page.getByRole("navigation", { name: "Navegação do Mapa das Calçadas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Registrar calçada", exact: true }),
  ).toHaveCount(1);
  expect(
    await page
      .getByText("Sobre este processo", { exact: false })
      .evaluateAll((elements) =>
        elements.every((element) => !element.getClientRects().length),
      ),
  ).toBe(true);
  await expect(page.getByLabel("Instalar COMUN")).toHaveCount(0);
});

test("fallback do shell não duplica a árvore interativa", async ({ page }) => {
  await page.goto("/comun/entrar?returnTo=%2Fcomun%2Fcalcadas");
  await expect(page.getByLabel("E-mail")).toHaveCount(1);
  await expect(page.getByLabel("Senha")).toHaveCount(1);
  await expect(page.locator("main#conteudo")).toHaveCount(1);
});

test("@a11y shell mobile não possui bloqueios ou overflow", async ({
  page,
}) => {
  for (const route of [
    "/comun",
    "/comun/explorar",
    "/comun/territorios/volta-redonda",
    "/comun/c/cidade",
    "/comun/pautas/calcadas-em-circulacao",
    "/comun/calcadas",
    "/comun/calcadas/registros/demo-human-gate-s37-2-travessia",
  ]) {
    await page.goto(route);
    const violations = (
      await new AxeBuilder({ page }).analyze()
    ).violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    );
    expect(
      violations,
      `${route}: ${violations.map((item) => item.id).join(", ")}`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
  }
});
