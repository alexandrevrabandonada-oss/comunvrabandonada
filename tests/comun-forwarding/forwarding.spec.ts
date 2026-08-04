import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("adaptador Fiscaliza permanece explícito, sem envio automático e acessível @a11y", async ({
  page,
}) => {
  await page.goto("/comun/minha-participacao", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Carteira de participação" }),
  ).toBeVisible();
  await expect(page.locator('a[href*="voltaredonda"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Criar carteira local" }).click();
  await expect(
    page.getByText(/Nada é enviado por esta carteira/),
  ).toBeVisible();
  const violations = await new AxeBuilder({ page }).analyze();
  expect(
    violations.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});
