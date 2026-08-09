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

test("Participar abre intenções agrupadas em um passo e sem mutation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.headers()["next-action"])
      mutations.push(request.headers()["next-action"]);
  });
  await page.goto(`/comun?${flag}`);
  await page.getByRole("button", { name: "Participar agora" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Escolha uma forma de participar",
  });
  await expect(dialog).toContainText("Resolver um problema");
  await dialog
    .getByRole("button", { name: "Ver cultura, memória e direitos" })
    .click();
  for (const group of [
    "Construir junto",
    "Preservar memória e cultura",
    "Corrigir ou proteger",
  ])
    await expect(dialog).toContainText(group);
  const sidewalk = dialog.getByRole("link", { name: /^Calçada(?:\s|$)/ });
  await expect(sidewalk).toHaveAttribute(
    "href",
    /\/comun\/calcadas\/contribuir/,
  );
  await expect(sidewalk).toHaveAttribute("href", /intencao=register_sidewalk/);
  await expect(sidewalk).toHaveAttribute("href", /etapa=participate/);
  expect(mutations).toEqual([]);
});

test("autenticação preserva intenção e bloqueia returnTo externo ou expirado", async ({
  page,
}) => {
  const intended =
    "/comun/calcadas/contribuir?experiencia=app-v2%26intencao=register_sidewalk";
  await page.goto(
    `/comun/entrar?${flag}&returnTo=${encodeURIComponent(intended)}`,
  );
  await expect(
    page.getByText("você volta à ação escolhida", { exact: false }),
  ).toBeVisible();
  await expect(page.locator('input[name="returnTo"]')).toHaveValue(
    /\/comun\/calcadas\/contribuir/,
  );
  await page.goto(
    `/comun/entrar?${flag}&returnTo=${encodeURIComponent("https://example.com/private")}`,
  );
  await expect(page.locator('input[name="returnTo"]')).toHaveValue(
    "/comun/minha-participacao",
  );

  const expired = Math.floor(Date.now() / 1000) - 10;
  await page.goto(
    `/comun/participar/confirmacao?${flag}&intencao=contribute_pauta&contextoAte=${expired}`,
  );
  await expect(
    page.locator("[data-comun-journey-stage='confirm']"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Acompanhar participação" }),
  ).not.toHaveAttribute("href", /intencao=/);
});

test("confirmação canônica oferece tracking, retorno claro e privacidade", async ({
  page,
}) => {
  await page.goto(
    `/comun/participar/confirmacao?${flag}&intencao=contribute_pauta&pauta=calcadas-em-circulacao&returnTo=${encodeURIComponent("/comun/pautas/calcadas-em-circulacao?experiencia=app-v2")}`,
  );
  const confirmation = page.locator("[data-comun-journey-stage='confirm']");
  await expect(confirmation).toContainText("O que aconteceu");
  await expect(confirmation).toContainText("Privacidade");
  await expect(confirmation).toContainText("O que acontece agora");
  await expect(
    page.getByRole("link", { name: "Acompanhar participação" }),
  ).toHaveAttribute("href", /secao=contribuicoes/);
  await expect(
    page.getByRole("link", { name: "Voltar à pauta" }),
  ).toHaveAttribute("href", /calcadas-em-circulacao/);
});

test("Explorar preserva recorte e oferece fallback semântico para filtro inválido", async ({
  page,
}) => {
  await page.goto(`/comun/explorar?categoria=radio&${flag}`);
  await expect(page.locator('a[href*="/comun/radio"]').first()).toBeVisible();
  await page.goto(`/comun/explorar?categoria=inexistente&${flag}`);
  await expect(
    page.getByText("Este filtro não existe", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Limpar recorte" }),
  ).toHaveAttribute("href", "/comun/explorar");
});

test("Caixa protegida preserva experiência, origem e sessão expirada", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto(`/comun/caixa-de-entrada?${flag}`);
  await expect(page).toHaveURL(/\/comun\/entrar/);
  expect(decodeURIComponent(page.url())).toContain(
    "returnTo=/comun/caixa-de-entrada",
  );
  expect(decodeURIComponent(page.url())).not.toContain("experiencia=app-v2");
  await page.goto(
    `/comun/entrar?${flag}&status=sessao-expirada&returnTo=${encodeURIComponent("/comun/caixa-de-entrada?experiencia=app-v2")}`,
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "sessão terminou" }),
  ).toBeVisible();
});

test("offline, reduced motion, reflow e PWA mantêm orientação", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/comun?${flag}`);
  await page.context().setOffline(true);
  await page.evaluate(() => dispatchEvent(new Event("offline")));
  await expect(
    page.getByRole("status", { name: "" }).filter({ hasText: "Offline" }),
  ).toBeVisible();
  await page.context().setOffline(false);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  if (testInfo.project.name.includes("pwa-standalone"))
    expect(
      await page.evaluate(
        () => matchMedia("(display-mode: standalone)").matches,
      ),
    ).toBe(true);
});

test("@a11y roots e confirmação não têm violações sérias", async ({ page }) => {
  for (const route of [
    `/comun?${flag}`,
    `/comun/explorar?categoria=arte&${flag}`,
    `/comun/participar/confirmacao?${flag}`,
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
