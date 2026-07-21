import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const screenshot = (page: any, name: string) =>
  page.screenshot({
    path: `reports/screenshots/sprint-38-${name}-1366x768.png`,
    fullPage: true,
  });

test("jornada integrada não prende a pessoa no miniapp", async ({ page }) => {
  await page.goto("/comun");
  await expect(
    page.getByText("Ferramentas em atividade", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "home");
  await page.goto("/comun/pautas/calcadas-em-circulacao");
  await expect(
    page.getByText("Ferramenta desta pauta", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "pauta");
  await page.goto("/comun/c/cidade");
  await expect(
    page.getByText("Ferramentas que estamos usando", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "comunidade");
  await page.goto("/comun/territorios");
  await screenshot(page, "territorios");
  await page.goto("/comun/calcadas");
  await expect(
    page.getByRole("heading", { name: "Calçadas de Volta Redonda" }),
  ).toBeVisible();
  await screenshot(page, "mapa");
  await expect(
    page.getByText("Base cartográfica real · registros demonstrativos", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Contexto do processo")).toContainText(
    "Volta Redonda",
  );
  await expect(page.getByLabel("Instalar COMUN")).toHaveCount(0);
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await screenshot(page, "lista");
  await page.goto("/comun/calcadas/registros/demo-human-gate-s37-2-travessia");
  await expect(
    page.getByText("Confirmar ou atualizar", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "registro");
  await page.goto("/comun/entrar?returnTo=%2Fcomun%2Fminha-participacao");
  await page
    .getByLabel("E-mail")
    .fill("demo-human-gate-s37-2-facilitador@comun.test");
  await page.getByLabel("Senha").fill("comun-demo-local-37-2");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/comun/minha-participacao");
  await expect(page.getByRole("heading", { name: "Minha área" })).toBeVisible();
  await screenshot(page, "minha-area");
  await page.goto("/comun/calcadas/prioridades");
  await expect(
    page.getByRole("heading", { name: "Prioridades comunitárias" }),
  ).toBeVisible();
  await screenshot(page, "prioridade");
  await page.goto("/comun/calcadas/mobilizacao");
  await expect(
    page.getByRole("heading", { name: "Mobilização", exact: true }),
  ).toBeVisible();
  await screenshot(page, "mobilizacao");
  await page.goto("/comun/calcadas/resultados");
  await expect(
    page.getByRole("heading", { name: "Resultados e memória", exact: true }),
  ).toBeVisible();
  await screenshot(page, "resultado");
  await page.goto(
    "/comun/pautas/calcadas-em-circulacao/memoria/demo-human-gate-s37-2-memoria",
  );
  await expect(
    page.getByRole("heading", { name: "Memória demonstrativa do ciclo" }),
  ).toBeVisible();
  await screenshot(page, "memoria");
  await page.goto("/comun/caixa-de-entrada");
  await expect(
    page.getByRole("heading", { name: "Caixa de Entrada" }),
  ).toBeVisible();
  await screenshot(page, "inbox");
  await page.goto("/comun/c/cidade");
  await expect(
    page.getByText("Ferramentas que estamos usando", { exact: true }),
  ).toBeVisible();
});

test("@a11y deep links preservam contexto sem bloqueios", async ({ page }) => {
  for (const route of [
    "/comun/c/cidade",
    "/comun/pautas/calcadas-em-circulacao",
    "/comun/calcadas",
    "/comun/calcadas/registros/demo-human-gate-s37-2-travessia",
    "/comun/calcadas/prioridades",
    "/comun/calcadas/mobilizacao",
    "/comun/calcadas/resultados",
    "/comun/pautas/calcadas-em-circulacao/memoria/demo-human-gate-s37-2-memoria",
  ]) {
    await page.goto(route);
    await expect(page.getByLabel("Contexto do processo")).toBeVisible();
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
