import { expect, test } from "@playwright/test";

const storageKey = "comun:last-safe-route:v1";

test("offline ignora e elimina retorno privado persistido", async ({ page }) => {
  await page.addInitScript(({ key, value }) => {
    window.sessionStorage.setItem(key, value);
  }, { key: storageKey, value: "/comun/c/vila-brasilia/mesa" });

  await page.goto("/comun/offline");
  await expect(page.getByRole("link", { name: "Voltar à última página segura" }))
    .toHaveAttribute("href", "/comun");
  await expect.poll(() => page.evaluate((key) =>
    window.sessionStorage.getItem(key), storageKey)).toBeNull();
});

test("offline preserva retorno público elegível", async ({ page }) => {
  await page.addInitScript(({ key, value }) => {
    window.sessionStorage.setItem(key, value);
  }, { key: storageKey, value: "/comun/acervo" });

  await page.goto("/comun/offline");
  await expect(page.getByRole("link", { name: "Voltar à última página segura" }))
    .toHaveAttribute("href", "/comun/acervo");
});
