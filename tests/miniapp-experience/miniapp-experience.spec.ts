import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const screenshot = (page: any, name: string, project: string) =>
  page.screenshot({
    path: `test-results/evidence/sprint-38-${name}-${project}.png`,
    fullPage: true,
  });

test("jornada integrada não prende a pessoa no miniapp", async ({
  page,
}, testInfo) => {
  const fixture = JSON.parse(
    await readFile(".comun-sidewalk-pilot-slug", "utf8"),
  );
  await page.goto("/comun");
  await expect(page.locator('[data-comun-app-v2-page="home"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "O que você quer fazer?" }),
  ).toBeVisible();
  await expect(page.locator('[data-comun-primary-action="true"]')).toHaveCount(
    1,
  );
  await screenshot(page, "home", testInfo.project.name);
  await page.goto("/comun/pautas/calcadas-em-circulacao");
  await expect(
    page.locator('[data-comun-app-v2-page="pauta-detail"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ferramenta desta pauta" }),
  ).toBeVisible();
  await screenshot(page, "pauta", testInfo.project.name);
  await page.goto("/comun/c/cidade");
  await expect(
    page.locator('[data-comun-app-v2-page="community-home"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pautas e ações ativas" }),
  ).toBeVisible();
  await screenshot(page, "comunidade", testInfo.project.name);
  await page.goto("/comun/territorios");
  await screenshot(page, "territorios", testInfo.project.name);
  await page.goto("/comun/calcadas");
  await expect(
    page.getByRole("heading", { name: "Mapa comunitário" }),
  ).toBeVisible();
  await screenshot(page, "mapa", testInfo.project.name);
  await expect(
    page.getByText("Base cartográfica real · contribuições revisadas", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegação do Mapa das Calçadas" }),
  ).toBeVisible();
  if ((testInfo.project.use.viewport?.width ?? 1366) < 1024) {
    await expect(
      page.getByRole("link", { name: /Voltar à pauta Calçadas em circulação/ }),
    ).toBeVisible();
  }
  await expect(page.getByLabel("Instalar COMUN")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toBeVisible();
  await page.goto("/comun/calcadas?vista=lista");
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await screenshot(page, "lista", testInfo.project.name);
  await page.goto(`/comun/calcadas/registros/${fixture.recordSlug}`);
  await expect(
    page.getByRole("heading", { name: "Trecho de calçada quebrada — E2E" }),
  ).toBeVisible();
  await screenshot(page, "registro", testInfo.project.name);
  await page.goto("/comun/entrar?returnTo=%2Fcomun%2Fminha-participacao");
  await page
    .getByLabel("E-mail")
    .fill("fixture-s33-2-integral-s37-integral-facilitator@comun.test");
  await page.getByLabel("Senha").fill("comun-local-fixture-only");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/comun/minha-participacao");
  await expect(
    page.getByRole("heading", { name: "Minha participação" }),
  ).toBeVisible();
  await screenshot(page, "minha-area", testInfo.project.name);
  await page.goto("/comun/calcadas/prioridades");
  await expect(
    page.getByRole("heading", { name: "Prioridades comunitárias" }),
  ).toBeVisible();
  await screenshot(page, "prioridade", testInfo.project.name);
  await page.goto("/comun/calcadas/mobilizacao");
  await expect(
    page.getByRole("heading", { name: "Mobilização", exact: true }),
  ).toBeVisible();
  await screenshot(page, "mobilizacao", testInfo.project.name);
  await page.goto("/comun/calcadas/resultados");
  await expect(
    page.getByRole("heading", { name: "Resultados e memória", exact: true }),
  ).toBeVisible();
  await screenshot(page, "resultado", testInfo.project.name);
  await page.goto(
    `/comun/pautas/${fixture.slug}/memoria/${fixture.memorySlug}`,
  );
  await expect(
    page.getByRole("heading", {
      name: "O que aprendemos sobre as calçadas neste ciclo de teste?",
    }),
  ).toBeVisible();
  await expect(page.getByText(/Memória fixture do ensaio local/)).toBeVisible();
  await screenshot(page, "memoria", testInfo.project.name);
  await page.goto("/comun/caixa-de-entrada");
  await expect(page.locator('[data-comun-app-v2-page="inbox"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Caixa" })).toBeVisible();
  await screenshot(page, "inbox", testInfo.project.name);
  await page.goto("/comun/c/cidade");
  await expect(
    page.locator('[data-comun-app-v2-page="community-home"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pautas e ações ativas" }),
  ).toBeVisible();
});

test("@a11y deep links preservam contexto sem bloqueios", async ({
  page,
}, testInfo) => {
  const fixture = JSON.parse(
    await readFile(".comun-sidewalk-pilot-slug", "utf8"),
  );
  for (const route of [
    "/comun/c/cidade",
    "/comun/pautas/calcadas-em-circulacao",
    "/comun/calcadas",
    `/comun/calcadas/registros/${fixture.recordSlug}`,
    "/comun/calcadas/prioridades",
    "/comun/calcadas/mobilizacao",
    "/comun/calcadas/resultados",
    `/comun/pautas/${fixture.slug}/memoria/${fixture.memorySlug}`,
  ]) {
    await page.goto(route);
    if ((testInfo.project.use.viewport?.width ?? 1366) < 1024) {
      await expect(
        page.locator('[data-comun-app-bar="contextual-v2"]'),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Voltar", exact: true }),
      ).toBeVisible();
      await expect(
        page.locator('[data-bottom-navigation="absent"]'),
      ).toBeVisible();
    } else {
      await expect(page.locator("#conteudo")).toBeVisible();
    }
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
