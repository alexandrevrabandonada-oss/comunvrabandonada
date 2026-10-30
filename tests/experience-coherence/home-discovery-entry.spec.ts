import { expect, test } from "@playwright/test";

test("P1: Início anônimo leva à descoberta pública e permite retornar", async ({
  page,
}) => {
  await page.goto("/comun?experiencia=app-v2");
  await expect(
    page.locator('[data-comun-app-v2-page="home"]'),
  ).toBeVisible();

  const entry = page.getByRole("link", {
    name: "Explorar memórias, vozes e trocas",
  });
  await expect(entry).toHaveAttribute("href", "/comun/explorar");

  // Teclado, sem login, fixtures ou escrita. Conteúdo remoto pode estar vazio.
  await entry.focus();
  await expect(entry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/comun\/explorar(?:\?|$)/);
  await expect(
    page.locator('[data-comun-app-v2-page="explore"]'),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Acervo", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Rádio", exact: true }).first()).toBeVisible();

  await page.goBack();
  await expect(
    page.locator('[data-comun-app-v2-page="home"]'),
  ).toBeVisible();
});
