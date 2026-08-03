import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const flag = "experiencia=app-v2";

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name.includes("pwa-standalone"))
    await page.addInitScript(() => {
      const native = window.matchMedia.bind(window);
      window.matchMedia = (query: string) =>
        query === "(display-mode: standalone)"
          ? ({
              matches: true,
              media: query,
              onchange: null,
              addListener() {},
              removeListener() {},
              addEventListener() {},
              removeEventListener() {},
              dispatchEvent: () => true,
            } as MediaQueryList)
          : native(query);
    });
});

test("coleções da primeira onda usam shell e título contextuais", async ({
  page,
}) => {
  const routes = [
    ["/comun/territorios", "Territórios"],
    ["/comun/pautas", "Pautas"],
    ["/comun/acoes", "Ações"],
    ["/comun/resultados", "Resultados"],
    ["/comun/acervo", "Acervo"],
    ["/comun/radio", "Rádio"],
  ];
  for (const [route, title] of routes) {
    await page.goto(`${route}?${flag}`);
    await expect(
      page.locator("[data-comun-app-bar='contextual-v2']"),
    ).toContainText(title);
    await expect(
      page.locator("[data-comun-app-v2-page]").first(),
    ).toBeVisible();
    await expect(
      page.locator("[data-comun-app-bar='contextual-v2']"),
    ).not.toContainText("COMUN / Processo comunitário");
  }
});

test("deep link de pauta mantém contexto, retorno e relações canônicas", async ({
  page,
}) => {
  await page.goto(`/comun/pautas/calcadas-em-circulacao?${flag}`);
  await expect(
    page.locator("[data-comun-app-bar='contextual-v2']"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar" })).toHaveAttribute(
    "href",
    /^\/comun/,
  );
  await expect(page.getByRole("link", { name: "Voltar" })).not.toHaveAttribute(
    "href",
    /experiencia=/,
  );
  const rail = page.locator("[data-comun-relation-rail]").first();
  if (await rail.count()) {
    await expect(rail).toBeVisible();
    const relations = rail.locator("a");
    expect(await relations.count()).toBeGreaterThan(0);
    for (
      let index = 0;
      index < Math.min(3, await relations.count());
      index += 1
    )
      await expect(relations.nth(index)).not.toHaveAttribute(
        "href",
        /experiencia=/,
      );
  }
});

test("Calçadas preserva pauta canônica e escopo próprio", async ({ page }) => {
  await page.goto(`/comun/calcadas?${flag}`);
  await expect(
    page.locator("[data-comun-miniapp-experience='app-v2']"),
  ).toBeVisible();
  await expect(page.locator("[data-comun-relation-rail]")).toContainText(
    "Calçadas em circulação",
  );
  await expect(page.locator("body")).toContainText(
    /registro|Mapa comunitário/i,
  );
});

test("estado vazio oferece próxima ação e não simula dado", async ({
  page,
}) => {
  await page.goto(`/comun/territorios?${flag}`);
  const empty = page.locator("[data-comun-empty-state='actionable']");
  if (await empty.count()) {
    await expect(empty).toBeVisible();
    await expect(empty.locator("a").first()).not.toHaveAttribute(
      "href",
      /experiencia=/,
    );
    await expect(empty).not.toContainText(
      /exemplo fictício|conteúdo de demonstração/i,
    );
  }
});

test("filtros culturais permanecem no retorno e nos detalhes", async ({
  page,
}) => {
  await page.goto(
    `/comun/acervo/identificar?q=estacao&state=under_review&${flag}`,
  );
  await expect(page.locator('input[name="experiencia"]')).toHaveCount(0);
  await expect(page.locator('input[name="q"]')).toHaveValue("estacao");
  const detail = page.locator('a[href*="/comun/acervo/identificar/"]').first();
  if (await detail.count())
    await expect(detail).not.toHaveAttribute("href", /experiencia=/);
});

test("não há campos privados nem overflow nos documentos públicos", async ({
  page,
}) => {
  for (const route of [
    `/comun/resultados?${flag}`,
    `/comun/radio?${flag}`,
    `/comun/acervo/arte?${flag}`,
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBeLessThan(400);
    const html = await page.locator("body").innerText();
    expect(html).not.toMatch(
      /private_notes|contact_private|internal_note|service_role/i,
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
  }
});

test("redução de movimento, forced colors e PWA preservam relações", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto(`/comun/pautas?${flag}`);
  await expect(page.locator("[data-comun-app-v2-page]").first()).toBeVisible();
  const duration = await page
    .locator("[data-comun-app-v2-page]")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  expect(["0s", "0.01ms", "0.001s", "1e-05s", ""]).toContain(duration);
  if (testInfo.project.name.includes("pwa-standalone"))
    expect(
      await page.evaluate(
        () => matchMedia("(display-mode: standalone)").matches,
      ),
    ).toBe(true);
});

test("@a11y superfícies relacionais não têm violações sérias", async ({
  page,
}) => {
  for (const route of [
    `/comun/territorios?${flag}`,
    `/comun/pautas?${flag}`,
    `/comun/resultados?${flag}`,
    `/comun/acervo?${flag}`,
    `/comun/radio?${flag}`,
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
  }
});
