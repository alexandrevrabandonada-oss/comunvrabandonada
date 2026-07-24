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
  await expect(page.getByRole("link", { name: /voltar à pauta calçadas/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /registrar calçada/i }).first()).toBeVisible();
});

for (const route of ["/comun", "/comun/participar", "/comun/calcadas"]) {
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
