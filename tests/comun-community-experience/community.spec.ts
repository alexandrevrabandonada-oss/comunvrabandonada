import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("descoberta filtra por território e ação", async ({ page }) => {
  await page.goto("/comun/comunidades");
  await expect(
    page.getByRole("heading", { name: "Comunidades" }),
  ).toBeVisible();
  await page.getByText("Filtros avançados", { exact: true }).click();
  await page.locator('select[name="tipo"]:visible').selectOption("thematic");
  await page.locator('input[name="acao"]:visible').check();
  await page
    .getByRole("button", { name: "Aplicar filtros" })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/tipo=thematic/);
  await expect(page.getByText(/comunidades encontradas/)).toBeVisible();
  const workCommunity = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Trabalho e Burnout" }),
  });
  await expect(workCommunity).toBeVisible();
  await expect(
    workCommunity.getByRole("link", { name: "Conhecer comunidade" }),
  ).toHaveAttribute("href", "/comun/c/trabalho");
  await expect(
    page.getByRole("link", { name: /Cidade Abandonada/ }),
  ).toHaveCount(0);
});
test("comunidade mostra propósito ação e pauta sem duplicação", async ({
  page,
}) => {
  await page.goto("/comun/c/trabalho");
  await expect(
    page.getByRole("heading", { name: "Trabalho e Burnout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Próxima ação", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Contribuir com evidência sanitizada/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pautas e ações ativas" }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((x) =>
      ["serious", "critical"].includes(x.impact ?? ""),
    ),
  ).toEqual([]);
});
test("grupo e memória pública têm consequência", async ({ page }) => {
  await page.goto("/comun/c/trabalho");
  await page
    .getByText("Organização e grupos de trabalho", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Síntese de condições de trabalho" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Resultados, cultura e memória" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver resultados" }),
  ).toHaveAttribute("href", /\/comun\/resultados/);
});
test("agenda local produz arquivo ICS", async ({ request }) => {
  const response = await request.get("/comun/c/trabalho/agenda");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("text/calendar");
  expect(await response.text()).toContain("BEGIN:VEVENT");
});
test("acompanhar preserva retorno e exige sessão", async ({ page }) => {
  await page.goto("/comun/c/trabalho");
  await page.getByRole("link", { name: /Acompanhar ou/ }).click();
  await expect(page).toHaveURL(/\/comun\/entrar\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toMatch(
    /^\/comun\/c\/trabalho\/participar/,
  );
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
  await page.goto("/comun/c/trabalho");
  await page.getByRole("link", { name: /Acompanhar ou/ }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/comun\/c\/trabalho\/participar/);
  await page.getByLabel("Participar de rodas").check();
  await page.getByLabel("Resultado comprovado").check();
  await page.getByRole("button", { name: "Acompanhar", exact: true }).click();
  await expect(page.getByText(/Alteração confirmada/).first()).toBeVisible();
  await page.goto("/comun/minha-participacao?secao=comunidades");
  await expect(
    page.getByRole("heading", { name: "Trabalho e Burnout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir comunidade" }),
  ).toHaveAttribute("href", /\/comun\/c\/trabalho/);
  await page.screenshot({
    path: `test-results/evidence/sprint-36-1-community-area-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/comun/caixa-de-entrada");
  await expect(
    page.getByText(/Agora você acompanha Trabalho e Burnout/),
  ).toBeVisible();
  await page.goto("/comun/c/trabalho/participar");
  await expect(page.getByLabel("Participar de rodas")).toBeChecked();
  await page.getByRole("button", { name: "Deixar comunidade" }).click();
  await expect(page).toHaveURL(/status=leave/);
  await page.goto("/comun/minha-participacao?secao=comunidades");
  await expect(
    page.getByRole("heading", { name: "Trabalho e Burnout", exact: true }),
  ).toHaveCount(0);
});
