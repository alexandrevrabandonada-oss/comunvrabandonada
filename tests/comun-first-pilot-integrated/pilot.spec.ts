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

test("visitante percorre território comunidade pauta resultado e memória sem conta", async ({
  page,
}, testInfo) => {
  const { slug } = JSON.parse(
    await readFile(".comun-sidewalk-pilot-slug", "utf8"),
  );
  await page.goto("/comun");
  await expect(
    page.getByRole("heading", { name: /Organize seu território/ }),
  ).toBeVisible();
  await assertAccessible(page);
  await page.goto("/comun/territorios");
  await expect(
    page.getByRole("heading", { name: "Territórios" }),
  ).toBeVisible();
  await page.goto("/comun/c/cidade");
  await expect(
    page.getByText(/Ambiente de demonstração · conteúdo sintético/i),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cidade Abandonada" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Abrir pauta prioritária" }).click();
  await expect(page).toHaveURL(/\/comun\/pautas\//);
  await page.goto(`/comun/pautas/${slug}`);
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#construction_circle")).toBeVisible();
  await expect(page.locator("#memoria")).toBeVisible();
  await assertAccessible(page);
  await page.screenshot({
    path: `test-results/evidence/sprint-37-1-visitor-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("pessoa nova acompanha contribui consulta inbox e sai", async ({
  page,
}, testInfo) => {
  const { slug } = JSON.parse(
    await readFile(".comun-sidewalk-pilot-slug", "utf8"),
  );
  const email = `s37-${testInfo.project.name}@comun.test`;
  await page.goto("/comun/c/cidade");
  await page.getByRole("link", { name: "Acompanhar ou colaborar" }).click();
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
  await expect(page).toHaveURL(/\/comun\/c\/cidade\/participar/);
  await page.getByLabel("Participar de rodas").check();
  await page.getByLabel("Resultado comprovado").check();
  await page.getByRole("button", { name: "Acompanhar", exact: true }).click();
  await expect(page.getByText(/Alteração confirmada/).first()).toBeVisible();

  await page.goto("/comun/minha-participacao?secao=acompanhando");
  await expect(
    page.getByRole("heading", { name: "Comunidades acompanhadas" }),
  ).toBeVisible();
  await page.goto(`/comun/pautas/${slug}`);
  await page.getByRole("link", { name: "Registrar problema" }).click();
  await page.setInputFiles(
    'input[name="photo"]',
    ".local/comun-integral/calcada-fixture.jpg",
  );
  await page
    .getByRole("button", { name: "Mapa para confirmar ou ajustar o ponto" })
    .click({ position: { x: 180, y: 120 } });
  await page.getByText("Ruim", { exact: true }).click();
  await page.getByRole("button", { name: "Irregular", exact: true }).click();
  await page
    .getByLabel("Descrição opcional")
    .fill(
      "Barreira sintética usada somente no ensaio local da candidata integrada.",
    );
  await page
    .getByRole("checkbox", { name: /Autorizo a publicação sanitizada/ })
    .check();
  await page
    .getByRole("checkbox", { name: /Conferi fotografia, local, condição/ })
    .check();
  await expect(
    page.getByRole("button", { name: "Enviar para revisão" }),
  ).toBeEnabled();
  await assertAccessible(page);
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  await expect(
    page.getByRole("heading", { name: /Recebemos seu registro/ }),
  ).toBeVisible();
  await expect(page.getByText("Estado: em revisão")).toBeVisible();
  await page.screenshot({
    path: `test-results/evidence/sprint-37-1-confirmation-${testInfo.project.name}.png`,
    fullPage: true,
  });

  await page.getByRole("link", { name: "Ver em Minha área" }).click();
  await expect(page.getByRole("heading", { name: "Minha área" })).toBeVisible();
  await expect(page.getByText(/calçada/i).first()).toBeVisible();
  await assertAccessible(page);
  await page.goto("/comun/caixa-de-entrada");
  await expect(
    page.getByText(/Agora você acompanha Cidade Abandonada/),
  ).toBeVisible();
  await assertAccessible(page);
  await page.screenshot({
    path: `test-results/evidence/sprint-37-1-inbox-${testInfo.project.name}.png`,
    fullPage: true,
  });

  await page.goto("/comun/c/cidade");
  await expect(
    page.getByRole("heading", { name: "Roda e atividade" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Grupos de trabalho" }),
  ).toBeVisible();
  await expect(page.getByText(/Síntese demonstrativa/)).toBeVisible();
  await page.goto("/comun/c/cidade/participar");
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
  await page.goto("/comun/entrar?returnTo=%2Fcomun%2Fc%2Fcidade%2Fparticipar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-invalida-local");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByText("Não foi possível entrar com essa senha."),
  ).toBeVisible();
  await expect(page.locator('input[name="returnTo"]')).toHaveValue(
    "/comun/c/cidade/participar",
  );
  await assertAccessible(page);
});
