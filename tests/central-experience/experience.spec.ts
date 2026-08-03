import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/comun",
  "/comun/participar",
  "/comun/buscar?q=territorio",
  "/comun/territorios",
  "/comun/radio",
  "/comun/acervo/arte",
  "/comun/acervo",
];

for (const route of routes)
  test(`@a11y ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact ?? ""),
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

test("visitante entende navegacao finita", async ({ page }) => {
  await page.goto("/comun");
  await expect(page.getByRole("navigation").first()).toBeVisible();
  await expect(page.locator('[data-comun-app-v2-page="home"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pede atenção" }),
  ).toBeVisible();
  await page.goto("/comun/participar");
  await expect(page).toHaveURL(/\/comun\/participar/);
  await expect(page.locator("h1")).toContainText("Como você quer contribuir?");
});

test("área pessoal exige sessão", async ({ page }) => {
  await page.goto("/comun/minha-participacao");
  await expect(page).toHaveURL(/\/comun\/entrar/);
  await page.goto("/comun/caixa-de-entrada");
  await expect(page).toHaveURL(/\/comun\/entrar/);
});

test("busca preserva origem e não usa popularidade", async ({ page }) => {
  await page.goto("/comun/buscar?q=territorio");
  await expect(page.getByText(/resultados públicos/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /curtidas|seguidores|popularidade:/i,
  );
});

test("@visual screenshots públicas", async ({ page }, testInfo) => {
  for (const [name, route] of [
    ["home", "/comun"],
    ["participar", "/comun/participar"],
    ["busca", "/comun/buscar?q=territorio"],
    ["territorios", "/comun/territorios"],
    ["radio", "/comun/radio"],
  ]) {
    await page.goto(route);
    await page.screenshot({
      path: `reports/screenshots/sprint-31-${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
});
