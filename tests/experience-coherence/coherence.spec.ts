import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectNoOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function expectAtMostOnePrimaryAction(
  page: import("@playwright/test").Page,
) {
  expect(
    await page.locator('[data-comun-primary-action="true"]').count(),
  ).toBeLessThanOrEqual(1);
}

test("@a11y Home canônica mostra uma ação dominante e três caminhos claros", async ({
  page,
}) => {
  await page.goto("/comun");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "O que precisa de atenção?" }),
  ).toBeVisible();
  await expect(page.locator('[data-comun-app-v2-page="home"]')).toBeVisible();
  await expect(page.locator('[data-comun-primary-action="true"]')).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("link", { name: /Entender a cidade/ }),
  ).toHaveAttribute("href", "/comun/observatorios/panorama");
  await expect(
    page.getByRole("link", { name: /Participar do que está acontecendo/ }),
  ).toHaveAttribute("href", "/comun/pautas");
  await expect(
    page.getByRole("link", { name: /Minha participação/ }).first(),
  ).toHaveAttribute("href", "/comun/minha-participacao");
  await expectNoOverflow(page);
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("Home chega a Relata, Panorama e Pautas em um gesto", async ({ page }) => {
  await page.goto("/comun");
  const destinations = [
    ["Vi um problema", /\/comun\/relatar/],
    ["Entender a cidade", /\/comun\/observatorios\/panorama/],
    ["Participar do que está acontecendo", /\/comun\/pautas/],
  ] as const;
  for (const [name, destination] of destinations) {
    await page.goto("/comun");
    await page
      .getByRole("link", { name: new RegExp(name) })
      .first()
      .click();
    await expect(page).toHaveURL(destination);
  }
});

test("navegação canônica não promove objetos internos como portas principais", async ({
  page,
}) => {
  await page.goto("/comun");
  const navigation = page.locator(
    'nav[aria-label="Navegação principal"]:visible',
  );
  await expect(navigation).toHaveCount(1);
  await expect(navigation).not.toContainText(
    /Rodada|Dossiê|Grupo de Trabalho|Action Cycle|Evidence Item/i,
  );
  await expectAtMostOnePrimaryAction(page);
  await expectNoOverflow(page);
});

test("Pauta mantém uma próxima ação e a Roda retorna ao seu contexto", async ({
  page,
}) => {
  const response = await page.goto("/comun/pautas/calcadas-em-circulacao");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator("h1")).toHaveCount(1);
  await expectAtMostOnePrimaryAction(page);
  const roda = page.getByRole("link", { name: "Entrar na roda" }).first();
  if (await roda.isVisible().catch(() => false)) {
    await roda.click();
    await expect(
      page.getByRole("link", { name: "Voltar à pauta" }),
    ).toBeVisible();
    await expectAtMostOnePrimaryAction(page);
  }
  await expectNoOverflow(page);
});

test("Panorama oferece somente pontes exatas e preserva o próximo passo da Pauta", async ({
  page,
}) => {
  await page.goto("/comun/observatorios/panorama");
  await expectAtMostOnePrimaryAction(page);

  const bridges = page.locator(
    '[data-comun-organization-bridge="exact-public-evidence"]',
  );
  if ((await bridges.count()) === 0) {
    await expect(page.locator("body")).not.toContainText(
      /Pautas recomendadas|Talvez você goste|Criar pauta/i,
    );
    await expectNoOverflow(page);
    return;
  }

  const firstBridge = bridges.first();
  const evidenceRef = await firstBridge.getAttribute("data-comun-evidence-ref");
  expect(evidenceRef).toMatch(/^panorama:/);
  const link = firstBridge.getByRole("link", {
    name: /Ver (?:\d+ )?pautas? relacionadas?/,
  });
  const href = await link.getAttribute("href");
  expect(href).toMatch(/^\/comun\/pautas(?:\/|\?evidencia=)/);
  await link.click();

  if (href?.startsWith("/comun/pautas?evidencia=")) {
    await expect(
      page.getByRole("heading", {
        name: "Pautas relacionadas a esta evidência",
      }),
    ).toBeVisible();
    const pautaLink = page
      .getByRole("link", { name: "Acompanhar pauta" })
      .first();
    if (await pautaLink.isVisible().catch(() => false)) await pautaLink.click();
  }

  await expect(page).toHaveURL(/\/comun\/pautas\//);
  await expect(page.locator("h1")).toHaveCount(1);
  await expectAtMostOnePrimaryAction(page);
  await expectNoOverflow(page);
});

test("alias, filtros, retorno e rollback legado preservam contexto", async ({
  page,
}) => {
  await page.goto("/comun/busca?q=calcadas&tipo=pauta");
  await expect(page).toHaveURL(/\/comun\/buscar\?q=calcadas&tipo=pauta$/);
  await page.goto("/comun?experiencia=legacy");
  await expect(
    page.locator('[data-comun-legacy-boundary="active"]'),
  ).toBeVisible();
  await page.goto("/comun");
  await expect(page.locator('[data-comun-app-v2-page="home"]')).toBeVisible();
});

test("teclado, redução de movimento e zoom continuam funcionais", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/comun");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
  const motion = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector("a")!);
    return Number.parseFloat(style.transitionDuration || "0");
  });
  expect(motion).toBeLessThanOrEqual(0.01);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(
    page.getByRole("heading", { name: "O que precisa de atenção?" }),
  ).toBeVisible();
  await expectNoOverflow(page);
});

test("Central continua protegida e não vaza conteúdo administrativo", async ({
  page,
}) => {
  await page.goto("/comun/admin/operacao");
  await expect(page).toHaveURL(/\/comun\/admin\/(login|$)/);
  await expect(page.locator("body")).not.toContainText(
    /service_role|object_key|private_contact|member_user_id/i,
  );
});
