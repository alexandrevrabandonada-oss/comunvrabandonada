import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const experience of ["", "?experiencia=legacy"]) {
  const mode = experience ? "legacy" : "canônica";

  test(`@a11y Participar ${mode}: explorar e aprender sem entrar numa conta`, async ({
    page,
  }) => {
    await page.goto(`/comun/participar${experience}`);
    const paths = page.locator("[data-comun-participation-paths]");
    await expect(paths).toBeVisible();
    await expect(paths.locator("[data-comun-participation-path]")).toHaveCount(
      3,
    );
    for (const [label, href] of [
      ["Buscar um assunto", "/comun/buscar"],
      ["Conhecer ações", "/comun/acoes"],
      ["Conhecer comunidades", "/comun/comunidades"],
    ]) {
      await expect(
        paths.getByRole("link", { name: label, exact: true }),
      ).toHaveAttribute("href", `${href}${experience}`);
    }
    await paths
      .getByRole("link", { name: "Não sei por onde começar", exact: true })
      .click();
    await expect(page).toHaveURL(`/comun/ajuda/primeira-acao${experience}`);
    await expect(page.locator("h1")).toHaveText("Do assunto à primeira ação");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(
      page.locator("[data-comun-first-action-guide] > li"),
    ).toHaveCount(3);
    await expect(
      page.getByRole("link", { name: "Pesquisar meu assunto", exact: true }),
    ).toHaveAttribute("href", `/comun/buscar${experience}`);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
    await page
      .getByRole("link", {
        name: "Voltar às formas de participação",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(`/comun/participar${experience}`);
    await expect(
      page.locator("[data-comun-participation-paths]"),
    ).toBeVisible();
  });
}

test("Orientação prática funciona sem JavaScript e abre a busca pública", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto("/comun/ajuda/primeira-acao?etapa=acompanhamento");
    await expect(
      page.getByRole("heading", {
        name: "Do assunto à primeira ação",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator('[data-comun-practice-guidance="acompanhamento"]:visible'),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Pesquisar meu assunto", exact: true })
      .click();
    await expect(page).toHaveURL(/\/comun\/buscar$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await page
      .getByRole("textbox", { name: "Termo de busca" })
      .fill("calçadas");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/q=cal%C3%A7adas/);
    await expect(
      page.getByRole("heading", { name: "Buscar no COMUN", exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
