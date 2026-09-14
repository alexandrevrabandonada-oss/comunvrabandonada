import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const password = "comun-primeiro-piloto-37";

async function assertAccessible(page: Page) {
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test("visitante percorre território pauta Calçadas resultado e memória sem conta", async ({
  page,
}, testInfo) => {
  const { slug } = JSON.parse(
    await readFile(".comun-sidewalk-pilot-slug", "utf8"),
  );
  await page.goto("/comun");
  await expect(
    page.getByRole("heading", { name: "O que precisa de atenção?" }),
  ).toBeVisible();
  await assertAccessible(page);
  await page.goto("/comun/territorios");
  await expect(
    page.getByRole("heading", { name: "Territórios" }),
  ).toBeVisible();
  await page.goto(`/comun/pautas/${slug}`);
  await expect(
    page.locator('[data-comun-app-v2-page="pauta-detail"]'),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Participar" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ferramenta desta pauta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Memória do ciclo" }),
  ).toBeVisible();
  await assertAccessible(page);
  await page.screenshot({
    path: `test-results/evidence/sprint-37-1-visitor-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("pessoa nova acompanha comunidade real e a Pauta de Calçadas", async ({
  page,
}, testInfo) => {
  const { slug } = JSON.parse(
    await readFile(".comun-sidewalk-pilot-slug", "utf8"),
  );
  const email = `s37-${testInfo.project.name}@comun.test`;
  await page.goto("/comun/c/trabalho");
  await page.getByRole("link", { name: /Acompanhar ou/ }).click();
  await page.getByRole("link", { name: /Criar conta/i }).click();
  await page.getByLabel("Nome de exibição").fill("Pessoa demonstração 37");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirmar senha").fill(password);
  await page.getByLabel(/Aceito os termos/).check();
  await page.getByLabel(/política de privacidade/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/comun\/onboarding\?returnTo=/);
  await assertAccessible(page);
  for (let step = 0; step < 4; step += 1)
    await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("button", { name: /Concluir e voltar à comunidade/ })
    .click();
  await expect(page).toHaveURL(/\/comun\/c\/trabalho\/participar/);
  await page.getByLabel("Participar de rodas").check();
  await page.getByLabel("Resultado comprovado").check();
  await page.getByRole("button", { name: "Acompanhar", exact: true }).click();
  await expect(page.getByText(/Alteração confirmada/).first()).toBeVisible();

  await page.goto("/comun/minha-participacao?secao=comunidades");
  await expect(
    page.getByRole("heading", { name: "Trabalho e Burnout", exact: true }),
  ).toBeVisible();
  await page.goto(`/comun/pautas/${slug}`);
  await expect(
    page.locator('[data-comun-app-v2-page="pauta-detail"]'),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Participar" })).toBeVisible();
  await assertAccessible(page);
  await page.screenshot({
    path: `test-results/evidence/sprint-37-1-member-pauta-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/comun/caixa-de-entrada");
  await expect(
    page.getByText(/Agora você acompanha Trabalho e Burnout/),
  ).toBeVisible();
  await assertAccessible(page);
  await page.screenshot({
    path: `test-results/evidence/sprint-37-1-inbox-${testInfo.project.name}.png`,
    fullPage: true,
  });

  await page.goto("/comun/c/trabalho");
  await expect(
    page.getByRole("heading", { name: "Trabalho e Burnout", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Organização e grupos de trabalho", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Síntese de condições de trabalho" }),
  ).toBeVisible();
  await page.goto("/comun/c/trabalho/participar");
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(page).toHaveURL(/status=pause/);
  await page.getByRole("button", { name: "Retomar" }).click();
  await page.getByRole("button", { name: "Deixar comunidade" }).click();
  await expect(page).toHaveURL(/status=leave/);
  await page.screenshot({
    path: `test-results/evidence/sprint-37-1-exit-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("erros de autenticação preservam contexto e oferecem próxima ação", async ({
  page,
}, testInfo) => {
  const email = `s37-${testInfo.project.name}-r0@comun.test`;
  await page.goto(
    "/comun/entrar?returnTo=%2Fcomun%2Fc%2Ftrabalho%2Fparticipar",
  );
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-invalida-local");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByText("Não foi possível entrar com essa senha."),
  ).toBeVisible();
  await expect(page.locator('input[name="returnTo"]')).toHaveValue(
    "/comun/c/trabalho/participar",
  );
  await assertAccessible(page);
});
