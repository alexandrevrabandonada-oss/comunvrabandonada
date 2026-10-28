import { expect, test } from "@playwright/test";

test("offline ignora e elimina retorno privado persistido", async ({ page }) => {
  await page.addInitScript(
    (value) => sessionStorage.setItem("comun:last-safe-route:v1", value),
    "/comun/c/vila-brasilia/mesa",
  );

  await page.goto("/comun/offline");
  const returnLink = page.getByRole("link", { name: /última página segura/ });
  await expect(returnLink).toHaveAttribute("href", "/comun");

  const saved = await page.evaluate(() => {
    return sessionStorage.getItem("comun:last-safe-route:v1");
  });
  expect(saved).toBeNull();
});

test("offline preserva retorno público elegível", async ({ page }) => {
  await page.addInitScript(
    (value) => sessionStorage.setItem("comun:last-safe-route:v1", value),
    "/comun/acervo",
  );

  await page.goto("/comun/offline");
  const returnLink = page.getByRole("link", { name: /última página segura/ });
  await expect(returnLink).toHaveAttribute("href", "/comun/acervo");
});
