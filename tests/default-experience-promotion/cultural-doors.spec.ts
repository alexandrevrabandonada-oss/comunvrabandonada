import { expect, test } from "@playwright/test";

test("Home apresenta três portas culturais públicas sem exigir cadastro", async ({
  page,
}) => {
  await page.goto("/comun");

  const culture = page.getByRole("region", {
    name: "Cultura para aproveitar",
  });
  await expect(culture).toBeVisible();
  await expect(culture.getByRole("link")).toHaveCount(3);

  await expect(culture.locator('a[href="/comun/jogos"]')).toBeVisible();
  await expect(culture.locator('a[href="/comun/radio"]')).toBeVisible();
  await expect(culture.locator('a[href="/comun/acervo"]')).toBeVisible();
  await expect(culture).toContainText("sem cadastro ou participação política");
});

test("porta Jogos abre a rota canônica existente", async ({ page }) => {
  await page.goto("/comun");
  await page
    .locator('[data-comun-home-culture="true"] a[href="/comun/jogos"]')
    .click();
  await expect(page).toHaveURL(/\/comun\/jogos$/);
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toBeVisible();
});
