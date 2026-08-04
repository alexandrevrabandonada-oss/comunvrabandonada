import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("Carteira local cria recuperação, preserva linguagem e é acessível @a11y", async ({ page }) => {
  await page.goto("/comun/minha-participacao", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Carteira de participação" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar carteira local" })).toBeVisible();
  await page.getByRole("button", { name: "Criar carteira local" }).click();
  await expect(page.getByText("Código exibido uma vez")).toBeVisible();
  await expect(page.getByText(/^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){5}$/)).toBeVisible();
  await expect(page.getByText("Nenhum relato é encaminhado por esta tela.")).toBeVisible();
  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
});
