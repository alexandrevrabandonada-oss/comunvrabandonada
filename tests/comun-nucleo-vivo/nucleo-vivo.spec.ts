import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("jornada central liga home, participação e mapa", async ({ page }) => {
  await page.goto("/comun");
  await expect(page.getByRole("heading", { name: "Agora no território." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sua próxima participação" })).toBeVisible();
  await page.getByRole("link", { name: /participar de uma ação/i }).first().click();
  await expect(page.getByRole("heading", { name: /como você quer contribuir/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Registrar uma calçada" })).toBeVisible();
});

test("mapa mantém vínculo explícito com a pauta", async ({ page }) => {
  await page.goto("/comun/calcadas");
  const pautaLink = page.getByRole("link", {
    name: /voltar à pauta calçadas/i,
  });
  await expect(pautaLink).toBeVisible();
  await pautaLink.click();
  await expect(page).toHaveURL(/\/comun\/pautas\/calcadas-em-circulacao$/);
  await expect(
    page.getByRole("heading", { name: "Calçadas em circulação" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /abrir ferramenta/i }).click();
  await expect(page).toHaveURL(/\/comun\/calcadas$/);
  await expect(page.getByRole("link", { name: /registrar calçada/i }).first()).toBeVisible();
});

test("pauta canônica mantém seis fases e retorno allowlisted", async ({
  page,
}) => {
  const response = await page.goto(
    "/comun/pautas/calcadas-em-circulacao",
  );
  expect(response?.status()).toBe(200);
  for (const phase of [
    "Entenda",
    "Converse",
    "Contribua",
    "Construa",
    "Acompanhe",
    "Memória",
  ]) {
    await expect(page.getByRole("link", { name: phase, exact: true })).toBeVisible();
  }
  const contribute = page.getByRole("link", {
    name: /registrar uma calçada/i,
  }).first();
  const href = await contribute.getAttribute("href");
  expect(href).toContain("returnTo=%2Fcomun%2Fpautas%2Fcalcadas-em-circulacao");
  await expect(page.locator("body")).not.toContainText(
    "editorial:calcadas-em-circulacao",
  );
});

for (const route of [
  "/comun",
  "/comun/participar",
  "/comun/calcadas",
  "/comun/pautas/calcadas-em-circulacao",
]) {
  test(`@a11y ${route}`, async ({ page }) => {
    await page.goto(route);
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact ?? ""),
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}
