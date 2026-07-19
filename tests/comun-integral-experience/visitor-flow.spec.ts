import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const localFixturePassword = "comun-local-fixture-only";

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

test("@visual superfícies públicas integrais", async ({ page }, testInfo) => {
  for (const [name, route] of [["home", "/comun"], ["territorios", "/comun/territorios"], ["comunidades", "/comun/comunidades"], ["participar", "/comun/participar"], ["login", "/comun/entrar?returnTo=%2Fcomun%2Fmapa%2Fcontribuir"], ["busca", "/comun/buscar?q=calcada"]]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.screenshot({ path: `reports/screenshots/sprint-34-1-${name}-${testInfo.project.name}.png`, fullPage: true });
  }
});

test("retorno inseguro é rejeitado", async ({ page }) => {
  await page.goto("/comun/entrar?returnTo=https%3A%2F%2Fevil.example%2Froubo");
  await expect(page.locator('input[name="returnTo"]')).toHaveValue("/comun/minha-participacao");
  await expect(page.getByText("evil.example")).toHaveCount(0);
});

test("login, onboarding mínimo e retorno à ação de calçada", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "390x844", "Fluxo autenticado principal roda uma vez no viewport mobile crítico.");
  const manifest = JSON.parse(await readFile(".local/comun-integral/current.json", "utf8"));
  const participant = manifest.participant;
  const returnTo = "/comun/mapa/contribuir?origem=calcadas";
  await page.goto(`/comun/entrar?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("E-mail").fill(participant.email);
  await page.getByLabel("Senha").fill(localFixturePassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/comun\/onboarding\?returnTo=/);
  await expect(page.getByRole("heading", { name: "Boas-vindas", exact: true })).toBeVisible();
  await page.screenshot({ path: "reports/screenshots/sprint-34-1-onboarding-boas-vindas-390x844.png", fullPage: true });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.screenshot({ path: "reports/screenshots/sprint-34-1-onboarding-territorio-390x844.png", fullPage: true });
  for (let step = 0; step < 3; step += 1) await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("Registrar problema na calçada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Concluir e registrar problema na calçada/i }).click();
  await expect(page).toHaveURL(/\/comun\/mapa\/contribuir\?origem=calcadas/);
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/comun");
  await expect(page.getByRole("heading", { name: /Bom te ver de volta/ })).toBeVisible();
  await page.screenshot({ path: "reports/screenshots/sprint-34-1-home-autenticada-390x844.png", fullPage: true });
  await page.goto("/comun/minha-participacao");
  await expect(page.getByRole("heading", { name: "Minha área" })).toBeVisible();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  await page.screenshot({ path: "reports/screenshots/sprint-34-1-minha-area-390x844.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
