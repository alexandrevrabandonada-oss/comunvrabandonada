import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

const manifest = JSON.parse(
  readFileSync(".local/comun-auth/current.json", "utf8"),
) as { personas: { persona: string; state: string }[] };

function stateFor(persona: string) {
  const state = manifest.personas.find(
    (entry) => entry.persona === persona,
  )?.state;
  if (!state) throw new Error(`storageState ausente: ${persona}`);
  return state;
}

async function openAdmin(
  browser: Browser,
  path: string,
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({
    storageState: stateFor("operations_admin"),
    viewport,
  });
  const page = await context.newPage();
  await page.goto(path);
  return { context, page };
}

async function assertAdminV2(page: Page) {
  await expect(page.locator(".comun-admin-shell-v2")).toHaveAttribute(
    "data-comun-shell-mode",
    "admin",
  );
  await expect(page.locator("[data-comun-bottom-navigation]")).toHaveCount(0);
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(page.getByLabel("E-mail")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
}

test("@a11y shell administrativo V2 em cinco viewports", async ({
  browser,
}, testInfo) => {
  const viewport = testInfo.project.use.viewport as {
    width: number;
    height: number;
  };
  const { context, page } = await openAdmin(
    browser,
    "/comun/admin/acervo?experiencia=app-v2",
    viewport,
  );
  try {
    await expect(page.locator(".comun-admin-context-bar h1")).toHaveText(
      "Acervo",
    );
    await assertAdminV2(page);
    if (viewport.width < 1024) {
      await expect(page.locator(".comun-admin-rail")).toBeHidden();
      const menu = page.locator(".comun-admin-context-bar details");
      await menu.locator("summary").focus();
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("open", "");
    } else {
      await expect(page.locator(".comun-admin-rail")).toBeVisible();
    }
    const firstAction = page.locator("main a, main button, main input").first();
    await firstAction.focus();
    const focusBox = await firstAction.boundingBox();
    expect(focusBox).not.toBeNull();
    expect(focusBox!.y + focusBox!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({
      path: testInfo.outputPath(`admin-acervo-${testInfo.project.name}.png`),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("filtros e retorno operacional sobrevivem ao detalhe", async ({
  browser,
}, testInfo) => {
  if (!["390x844", "1366x768"].includes(testInfo.project.name)) return;
  const viewport = testInfo.project.use.viewport as {
    width: number;
    height: number;
  };
  const { context, page } = await openAdmin(
    browser,
    "/comun/admin/acervo?experiencia=app-v2",
    viewport,
  );
  try {
    await page.goto(
      "/comun/admin/acervo?experiencia=app-v2&q=memoria&status=review&page=2",
    );
    await expect(page.locator(".comun-admin-shell-v2")).toBeVisible();
    const newItem = page.locator('main a[href="/comun/admin/acervo/novo"]');
    await expect(newItem).toHaveCount(1);
    await newItem.click();
    await expect(page).toHaveURL(/\/comun\/admin\/acervo\/novo/);
    expect(new URL(page.url()).searchParams.get("experiencia")).toBe("app-v2");
    const returnTo = new URL(page.url()).searchParams.get("returnTo") ?? "";
    expect(returnTo).toContain("q=memoria");
    expect(returnTo).toContain("status=review");
    expect(returnTo).toContain("page=2");
    await page.getByRole("link", { name: "← Voltar ao recorte" }).click();
    await expect(page).toHaveURL(/\/comun\/admin\/acervo/);
    expect(new URL(page.url()).searchParams.get("q")).toBe("memoria");
    expect(new URL(page.url()).searchParams.get("status")).toBe("review");
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  } finally {
    await context.close();
  }
});

test("@a11y tabela e formulário mantêm semântica administrativa", async ({
  browser,
}, testInfo) => {
  if (!["320x568", "landscape", "1366x768"].includes(testInfo.project.name))
    return;
  const viewport = testInfo.project.use.viewport as {
    width: number;
    height: number;
  };
  const { context, page } = await openAdmin(
    browser,
    "/comun/admin/dossies/revisoes?experiencia=app-v2",
    viewport,
  );
  try {
    await assertAdminV2(page);
    const tables = page.locator("main table");
    if (await tables.count()) {
      await expect(tables.first()).toHaveAttribute("aria-label", /.+/);
      expect(await page.locator("main table th:not([scope])").count()).toBe(0);
    }
    await page.goto(
      "/comun/admin/radio/episodios/novo?experiencia=app-v2&returnTo=%2Fcomun%2Fadmin%2Fradio%3Fpage%3D2",
    );
    await assertAdminV2(page);
    await expect(page.getByLabel("Título")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "CRIAR EPISÓDIO" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("@a11y sessão expirada preserva proteção e flag", async ({
  browser,
}, testInfo) => {
  if (!["320x568", "1366x768"].includes(testInfo.project.name)) return;
  const viewport = testInfo.project.use.viewport as {
    width: number;
    height: number;
  };
  const { context, page } = await openAdmin(
    browser,
    "/comun/admin/acervo?experiencia=app-v2",
    viewport,
  );
  try {
    await context.clearCookies();
    await page.goto("/comun/admin/comunidades?experiencia=app-v2");
    await expect(page).toHaveURL(/\/comun\/admin\/login/);
    expect(new URL(page.url()).searchParams.get("experiencia")).toBe("app-v2");
    await expect(page.locator(".comun-admin-shell-v2")).toHaveCount(0);
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);
  } finally {
    await context.close();
  }
});
