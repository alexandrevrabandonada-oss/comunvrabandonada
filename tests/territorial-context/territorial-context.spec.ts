import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("territorial context keeps a textual accessible public reading", async ({ page }) => {
  const response = await page.goto("/comun/observatorios/territorio");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Território e Serviços Públicos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lista textual de Saúde" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assistência Social" })).toBeVisible();
  await page.getByLabel("Buscar pelo nome").focus();
  await expect(page.getByLabel("Buscar pelo nome")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
});

test("sources page is public and the API remains read-only", async ({ page, request }) => {
  const response = await page.goto("/comun/observatorios/territorio/fontes");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Fontes e metodologia" })).toBeVisible();
  expect((await request.head("/api/comun/observatorios/territorio")).status()).toBe(200);
  expect((await request.post("/api/comun/observatorios/territorio")).status()).toBe(405);
});
