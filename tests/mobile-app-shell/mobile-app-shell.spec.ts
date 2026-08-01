import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("bottom nav possui cinco destinos e Participar abre action sheet", async ({
  page,
}) => {
  await page.goto("/comun");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(nav).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Início", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(
    nav.getByRole("button", { name: "Abrir formas de participar" }),
  ).toHaveCount(1);
  await nav.getByRole("button", { name: "Abrir formas de participar" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Escolha uma forma de participar",
  });
  await expect(dialog).toBeVisible();
  for (const name of [
    "Registrar uma calçada",
    "Enviar relato",
    "Contribuir com o Acervo",
    "Participar de roda",
    "Encontrar ação",
  ])
    await expect(
      dialog.getByRole("link", { name, exact: false }),
    ).toBeVisible();
});

test("Explorar agrupa diretórios e miniapp preserva uma navegação local", async ({
  page,
}) => {
  await page.goto("/comun/explorar");
  await expect(page.getByRole("heading", { name: "Explorar" })).toBeVisible();
  for (const name of [
    "Territórios",
    "Comunidades",
    "Pautas",
    "Ferramentas",
    "Resultados",
    "Acervo",
  ])
    await expect(page.getByLabel(name, { exact: true }).first()).toBeVisible();
  await page.goto("/comun/calcadas");
  await expect(
    page.getByRole("navigation", { name: "Navegação do Mapa das Calçadas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Registrar calçada", exact: true }),
  ).toHaveCount(1);
  expect(
    await page
      .getByText("Sobre este processo", { exact: false })
      .evaluateAll((elements) =>
        elements.every((element) => !element.getClientRects().length),
      ),
  ).toBe(true);
  await expect(page.getByLabel("Instalar COMUN")).toHaveCount(0);
});

test("@a11y shell mobile não possui bloqueios ou overflow", async ({
  page,
}) => {
  for (const route of [
    "/comun",
    "/comun/explorar",
    "/comun/territorios/volta-redonda",
    "/comun/c/cidade",
    "/comun/pautas/calcadas-em-circulacao",
    "/comun/calcadas",
    "/comun/calcadas/registros/demo-human-gate-s37-2-travessia",
  ]) {
    await page.goto(route);
    const violations = (
      await new AxeBuilder({ page }).analyze()
    ).violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    );
    expect(
      violations,
      `${route}: ${violations.map((item) => item.id).join(", ")}`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
  }
});
