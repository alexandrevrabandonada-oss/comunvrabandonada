import { expect, test } from "@playwright/test";

test("P1: Início anônimo leva à descoberta pública e permite retornar", async ({
  page,
}) => {
  await page.goto("/comun?experiencia=app-v2");
  const main = page.getByRole("main");
  const home = main.locator('[data-comun-app-v2-page="home"]').first();
  await expect(home).toBeVisible();

  const entry = main.getByRole("link", {
    name: "Explorar memórias, vozes e trocas",
  });
  await expect(entry).toHaveAttribute("href", "/comun/explorar");

  // Teclado, sem login, fixtures ou escrita. Conteúdo remoto pode estar vazio.
  await entry.focus();
  await expect(entry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/comun\/explorar(?:\?|$)/);
  const explore = main.locator('[data-comun-app-v2-page="explore"]');
  await expect(explore).toBeVisible();
  await expect(
    explore.getByRole("link", { name: "Acervo", exact: true }).first(),
  ).toBeVisible();
  await expect(
    explore.getByRole("link", { name: "Rádio", exact: true }).first(),
  ).toBeVisible();

  await page.goBack();
  await expect(home).toBeVisible();
});
