import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/comun/acervo",
  "/comun/acervo/colecoes",
  "/comun/acervo/identificar",
  "/comun/acervo/historias-orais",
  "/comun/acervo/musica",
  "/comun/acervo/arte",
  "/comun/radio",
  "/comun/territorios",
  "/comun/resultados",
  "/comun/pautas",
  "/comun/acoes",
];

for (const route of routes) {
  test(`@a11y landmark principal e salto ao conteúdo: ${route}`, async ({
    page,
  }) => {
    const response = await page.goto(`${route}?experiencia=app-v2`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator("main main")).toHaveCount(0);
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toHaveAttribute("href", "#conteudo");
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#conteudo")).toBeFocused();
    const audit = await new AxeBuilder({ page })
      .withRules(["landmark-main-is-top-level", "landmark-no-duplicate-main"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}
