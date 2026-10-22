import { expect, test } from "@playwright/test";

test("offline não retoma nem conserva uma Mesa privada gravada por versão anterior", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "comun:last-safe-route:v1",
      "/comun/c/coletivo-sintetico/mesa",
    );
  });
  await page.goto("/comun/offline");
  await expect(
    page.getByRole("heading", { name: "Sem conexão agora." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Voltar à última página segura" }),
  ).toHaveAttribute("href", "/comun");
  await expect
    .poll(() =>
      page.evaluate(() => sessionStorage.getItem("comun:last-safe-route:v1")),
    )
    .toBeNull();
  await expect(page.locator('a[href*="/mesa"]')).toHaveCount(0);
});
