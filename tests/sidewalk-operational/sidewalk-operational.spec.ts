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

test("participante sem GPS usa teclado para posicionar e confere privacidade", async ({
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
  const manualMap = page.getByRole("button", {
    name: /Mapa para confirmar ou ajustar o ponto/,
  });
  await manualMap.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await expect(manualMap).toBeFocused();
  await expect(manualMap).toHaveAttribute(
    "data-map-provider",
    "realVoltaRedonda",
  );
  await expect(manualMap).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(
    page.getByText(/Toque em uma rua para ajustar o ponto/i),
  ).toBeVisible();
});

test("superfície pública não expõe texto privado ou coordenada exata", async ({
  page,
}) => {
  await page.goto("/comun/calcadas");
  await expect(page.locator("body")).not.toContainText(
    "PRIVATE_SIDEWALK_RUNTIME",
  );
  await expect(page.locator("body")).not.toContainText("-44.104321");
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
