import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

function pilotSlug() {
  const slugFile = path.join(process.cwd(), ".comun-sidewalk-pilot-slug");
  const payload = JSON.parse(fs.readFileSync(slugFile, "utf8"));
  return payload as { slug: string; recordSlug: string; memorySlug: string };
}

const secretMarkers = ["PRIVATE-", "private_contact", "internal_notes", "object_key", "raw_text", "signed_url"];

function assertNoLeak(body: string, extra: string[] = []) {
  const forbidden = [...secretMarkers, ...extra];
  for (const f of forbidden) {
    expect(body.toLowerCase()).not.toContain(f.toLowerCase());
  }
}

// --- Visitante

test("visitante entende a pauta piloto", async ({ page }) => {
  const { slug } = pilotSlug();
  await page.goto(`/comun/pautas/${slug}`);
  await expect(page.locator("h1")).toContainText(/Mapa Popular das Calçadas/i);
  await expect(page.locator('a[href="#map"]')).toBeVisible();
  await expect(page.locator('a[href="#construction_circle"]')).toBeVisible();
  const body = await page.locator("body").innerText();
  assertNoLeak(body, ["private_notes", "auth_user_id"]);
});

test("mapa possui alternativa textual em lista", async ({ page }) => {
  const { slug } = pilotSlug();
  await page.goto(`/comun/pautas/${slug}#map`);
  await expect(page.locator("#map")).toBeVisible();
  await page.getByRole("link", { name: "Abrir Mapa das Calçadas" }).click();
  await expect(page).toHaveURL(/\/comun\/calcadas/);
  const listButton = page.getByRole("button", { name: "Lista", exact: true });
  await listButton.click();
  await expect(listButton).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .locator("article")
      .first()
      .or(page.getByText("Nenhum registro público corresponde aos filtros.")),
  ).toBeVisible();
});

test("detalhe do registro exibe categoria, impacto e aviso de cobertura", async ({ page }) => {
  const { slug, recordSlug } = pilotSlug();
  await page.goto(`/comun/pautas/${slug}/registros/${recordSlug}`);
  await expect(page.locator("h1")).toContainText(/Trecho de calçada/i);
  await expect(page.locator("text=critical")).toBeVisible();
  await expect(page.locator("text=buraco")).toBeVisible();
  await expect(page.locator("text=Os dados representam contribuições recebidas e verificadas")).toBeVisible();
  const body = await page.locator("body").innerText();
  assertNoLeak(body, ["private_notes", "auth_user_id"]);
});

test("contribuição comum é recebida e sanitizada", async ({ page }) => {
  const { slug } = pilotSlug();
  await page.goto(`/comun/pautas/${slug}`);
  await expect(page.locator("form#participar textarea[name='body']")).toBeVisible();
  await page.locator("form#participar textarea[name='body']").fill("Teste de contribuição E2E — texto sem dados pessoais.");
  await page.locator("form#participar input[name='author_alias']").fill("E2E");
  await page.locator("form#participar input[name='human_check']").fill("5");
  await page.locator("form#participar button").click();
  await page.waitForURL(/contribuicao=pendente/);
  await expect(page.getByText("Contribuicao recebida", { exact: false })).toBeVisible();
});

test("protocolo popular acessível sem dados privados", async ({ page }) => {
  await page.goto("/comun/protocolo-popular");
  await expect(page.locator("h1")).toBeVisible();
  const body = await page.locator("body").innerText();
  assertNoLeak(body, ["internal_notes", "private_contact"]);
});

test("home reflete pauta piloto", async ({ page }) => {
  const { slug } = pilotSlug();
  await page.goto("/comun");
  await expect(page.locator('a[href="/comun/pautas/' + slug + '"]').first()).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/Mapa Popular das Calçadas/i);
});

test("território reúne ciclo", async ({ page }) => {
  await page.goto("/comun/mapa");
  await expect(page.locator("h1").first()).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/Mapa|mapa|território/i);
});

test("memória do ciclo aparece na pauta", async ({ page }) => {
  const { slug } = pilotSlug();
  await page.goto(`/comun/pautas/${slug}`);
  await expect(page.locator("section#memoria")).toBeVisible();
  await expect(page.getByText("O que aprendemos sobre as calçadas", { exact: false })).toBeVisible();
});

// --- Membro (autenticação)

test("área pessoal exige sessão", async ({ page }) => {
  await page.goto("/comun/minha-participacao");
  await expect(page).toHaveURL(/\/comun\/entrar/);
  await page.goto("/comun/caixa-de-entrada");
  await expect(page).toHaveURL(/\/comun\/entrar/);
});

// --- A11y

const a11yRoutes = [
  ["pauta principal", ""],
  ["mapa", "#map"],
  ["roda", "#construction_circle"],
  ["participação", "#participation"],
  ["detalhe do registro", "/registros/:recordSlug"],
];

for (const [name, suffix] of a11yRoutes) {
  test(`@a11y pauta piloto ${name}`, async ({ page }) => {
    const { slug, recordSlug } = pilotSlug();
    const route = suffix === "/registros/:recordSlug" ? `/comun/pautas/${slug}/registros/${recordSlug}` : `/comun/pautas/${slug}${suffix}`;
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    const audit = await new AxeBuilder({ page }).analyze();
    expect(audit.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  });
}

// --- Visual

test("@visual screenshots do piloto de calçadas", async ({ page }, testInfo) => {
  const { slug, recordSlug } = pilotSlug();
  const surfaces = [
    ["home", "/comun", null],
    ["pauta", `/comun/pautas/${slug}`, null],
    ["mapa", `/comun/pautas/${slug}`, "#map"],
    ["roda", `/comun/pautas/${slug}`, "#construction_circle"],
    ["participacao", `/comun/pautas/${slug}`, "#participation"],
    ["observatorio", `/comun/pautas/${slug}`, "#observatory"],
    ["detalhe", `/comun/pautas/${slug}/registros/${recordSlug}`, null],
    ["territorio", "/comun/mapa", null],
  ] as const;
  for (const [name, route, selector] of surfaces) {
    await page.goto(route);
    const screenshotPath = `reports/screenshots/sprint-32-1-sidewalk-${name}-${testInfo.project.name}.png`;
    if (selector) {
      const section = page.locator(selector);
      await expect(section).toBeVisible();
      await section.screenshot({ path: screenshotPath });
    } else {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  }
});
