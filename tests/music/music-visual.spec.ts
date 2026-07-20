import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const evidence = path.resolve("reports/visual/sprint-23-2");
const publicRoutes = ["/comun/acervo/artistas", "/comun/acervo/musica"];

async function assertResponsive(page: Page) {
  await expect(page.locator("main")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "a página não pode ter overflow horizontal").toBe(false);
  await expect(page.locator("h1")).toBeVisible();
}

test.describe("acervo musical", () => {
  for (const route of publicRoutes) {
    test(`@visual ${route} é responsiva`, async ({ page }, testInfo) => {
      await page.goto(route);
      await assertResponsive(page);
      const label = route.endsWith("artistas") ? "artists" : "music";
      await page.screenshot({ path: path.join(evidence, `${label}-${testInfo.project.name.replace(/\D/g, "")}.png`), fullPage: true });
    });

    test(`@a11y ${route} não tem violações sérias`, async ({ page }) => {
      await page.goto(route);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
    });
  }

  test("@visual detalhes publicados permanecem utilizáveis", async ({ page }, testInfo) => {
    for (const [index, indexRoute] of publicRoutes.entries()) {
      await page.goto(indexRoute);
      const prefix = index ? "/comun/acervo/musica/" : "/comun/acervo/artistas/";
      const detail = page.locator(`main a[href^="${prefix}"]`).first();
      if (!(await detail.count())) continue;
      await detail.click();
      await assertResponsive(page);
      await page.screenshot({ path: path.join(evidence, `${index ? "release" : "artist"}-detail-${testInfo.project.name.replace(/\D/g, "")}.png`), fullPage: true });
    }
  });
});

test.describe("admin musical", () => {
  test("@visual @a11y observabilidade permanece protegida e responsiva", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-360", "login administrativo é exercitado uma vez para respeitar o rate limit");
    const password = process.env.COMUN_ADMIN_PASSWORD;
    test.skip(!password, "credencial administrativa de teste indisponível");
    await page.goto("/comun/admin/login?redirectTo=/comun/admin/acervo/musica/observabilidade");
    await page.getByLabel("E-mail").fill(process.env.COMUN_ADMIN_EMAIL ?? "alexandrecampos@id.uff.br");
    await page.getByLabel("Senha").fill(password!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Observabilidade musical" })).toBeVisible({ timeout: 15_000 });
    await assertResponsive(page);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
    if (testInfo.project.name === "mobile-390") {
      await page.screenshot({ path: path.join(evidence, "observability-390.png"), fullPage: true });
    }
  });
});
