import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("visitante percorre início, território, participação e retorno", async ({ page }) => {
  await page.goto("/comun");
  await expect(page.getByRole("heading", { name: "Organize seu território. Construa soluções coletivamente." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await page.getByRole("link", { name: "Explorar o território" }).click();
  await expect(page).toHaveURL(/\/comun\/territorios/);
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/comun");
  await page.getByRole("link", { name: "Participar de uma ação" }).click();
  await expect(page).toHaveURL(/\/comun\/participar/);
  await expect(page.locator("h1")).toContainText("Como você quer contribuir?");
  await page.goto("/comun");
  await page.getByRole("button", { name: "Abrir busca" }).click();
  await expect(page.getByRole("dialog", { name: "Buscar no COMUN" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("dialog", { name: "Buscar no COMUN" })).toHaveCount(0);
});

test("@a11y home não apresenta violações sérias", async ({ page }) => {
  await page.goto("/comun");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("@visual home integral", async ({ page }, testInfo) => {
  await page.goto("/comun");
  await page.screenshot({ path: `reports/screenshots/sprint-34-home-${testInfo.project.name}.png`, fullPage: true });
});
