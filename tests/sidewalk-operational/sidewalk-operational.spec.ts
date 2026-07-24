import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("visitante encontra mapa, filtros operacionais e pauta", async ({
  page,
}) => {
  await page.goto("/comun/calcadas");
  await expect(page.locator("h1")).toContainText("Calçadas de Volta Redonda");
  await page.getByRole("button", { name: /Mais filtros/ }).click();
  for (const label of [
    "Condição",
    "Problema",
    "Bairro",
    "Situação",
    "Verificação",
    "Período",
  ])
    await expect(
      page.locator("label").filter({ hasText: label }).locator("select"),
    ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Calçadas em circulação/ }),
  ).toBeVisible();
});

test("captura exige privacidade, consentimento e confirmação", async ({
  page,
}) => {
  await page.goto(
    "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
  );
  const file = page.locator('input[type="file"]');
  await expect(file).toHaveAttribute("accept", "image/*");
  await expect(file).toHaveAttribute("capture", "environment");
  await file.setInputFiles("public/icons/comun-192.png");
  await expect(
    page.getByText(/fotografia e o ponto exato ficam privados/i),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /Autorizo a publicação sanitizada/ }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: /Conferi fotografia, local, condição e impacto/,
    }),
  ).not.toBeChecked();
});

test("@a11y mapa operacional não possui violações sérias", async ({ page }) => {
  await page.goto("/comun/calcadas");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
