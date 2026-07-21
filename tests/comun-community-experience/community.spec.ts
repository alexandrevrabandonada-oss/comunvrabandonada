import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("descoberta filtra por território e ação", async ({ page }) => {
  await page.goto("/comun/comunidades");
  await expect(
    page.getByRole("heading", { name: "Comunidades" }),
  ).toBeVisible();
  await page.getByLabel("Tipo").selectOption("territorial");
  await page.getByLabel("Somente comunidades com ação aberta").check();
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/tipo=territorial/);
  await expect(page.getByText(/comunidades encontradas/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Cidade Abandonada/ }),
  ).toBeVisible();
});
test("comunidade mostra propósito ação e pauta sem duplicação", async ({
  page,
}) => {
  await page.goto("/comun/c/cidade");
  await expect(
    page.getByRole("heading", { name: "Cidade Abandonada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Por que existimos" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Registrar um trecho fictício de calçada/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pauta prioritária" }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((x) =>
      ["serious", "critical"].includes(x.impact ?? ""),
    ),
  ).toEqual([]);
});
test("roda grupo governança e cultura têm consequência", async ({ page }) => {
  await page.goto("/comun/c/trabalho");
  for (const name of [
    "Roda e atividade",
    "Como participar",
    "Grupos de trabalho",
    "Resultados, cultura e memória",
    "Memória e governança",
  ])
    await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText(/Decisão após síntese/)).toBeVisible();
  await expect(
    page.locator("#conteudo").getByRole("link", { name: "Arte" }),
  ).toHaveAttribute("href", "/comun/acervo/arte");
});
test("agenda local produz arquivo ICS", async ({ request }) => {
  const response = await request.get("/comun/c/cidade/agenda");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("text/calendar");
  expect(await response.text()).toContain("BEGIN:VEVENT");
});
test("acompanhar preserva retorno e exige sessão", async ({ page }) => {
  await page.goto("/comun/c/cidade");
  await page.getByRole("link", { name: "Acompanhar ou colaborar" }).click();
  await expect(page).toHaveURL(/\/comun\/entrar\?returnTo=/);
  await expect(
    page.getByText(/Destino protegido: \/comun\/c\/cidade\/participar/),
  ).toBeVisible();
});
test("comunidade pública está na allowlist offline e privada não", async ({
  request,
}) => {
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toContain('"/comun/c/"');
  expect(sw).toContain('"/comun/minha-participacao"');
  expect(sw).toContain('request.method !== "GET"');
});
test("vínculo persiste em home área inbox preferências e saída", async ({
  page,
}, testInfo) => {
  const accounts: Array<{ project: string; email: string; password: string }> =
    JSON.parse(await readFile(".local/comun-community/auth.json", "utf8"));
  const account = accounts.find(
    ({ project }) => project === testInfo.project.name,
  );
  if (!account)
    throw new Error(`Conta fixture ausente para ${testInfo.project.name}`);
  const { email, password } = account;
  await page.goto("/comun/c/cidade");
  await page.getByRole("link", { name: "Acompanhar ou colaborar" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/comun\/c\/cidade\/participar/);
  await page.getByLabel("Participar de rodas").check();
  await page.getByLabel("Resultado comprovado").check();
  await page.getByRole("button", { name: "Acompanhar", exact: true }).click();
  await expect(page.getByText(/Alteração confirmada/).first()).toBeVisible();
  await page.goto("/comun/minha-participacao?secao=acompanhando");
  await expect(
    page.getByRole("heading", { name: "Comunidades acompanhadas" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/evidence/sprint-36-1-community-area-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/comun/caixa-de-entrada");
  await expect(
    page.getByText(/Agora você acompanha Cidade Abandonada/),
  ).toBeVisible();
  await page.goto("/comun/c/cidade/participar");
  await expect(page.getByLabel("Participar de rodas")).toBeChecked();
  await page.getByRole("button", { name: "Deixar comunidade" }).click();
  await expect(page).toHaveURL(/status=leave/);
  await page.goto("/comun/minha-participacao?secao=acompanhando");
  await expect(
    page.getByRole("heading", { name: "Comunidades acompanhadas" }),
  ).toHaveCount(0);
});
