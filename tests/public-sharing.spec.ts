import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const path = "/comun/pautas/calcadas-em-circulacao";
const canonical = `https://comunsocial.online${path}`;
const shareButton = (page: import("@playwright/test").Page) =>
  page
    .getByRole("button", { name: /Compartilhar esta página$/ })
    .filter({ visible: true })
    .first();

async function openShare(page: import("@playwright/test").Page) {
  if (
    (page.viewportSize()?.width ?? 1280) < 1024 &&
    !(await shareButton(page).isVisible())
  ) {
    await page.getByLabel("Mais ações", { exact: true }).click();
  }
  await expect(shareButton(page)).toBeVisible();
}

test("public page, metadata and real clipboard use the same canonical content; browser back preserves context", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    }),
  );
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      request.headers()["next-action"] ||
      (/\/api\/comun\/(?:escola|acoes|pautas|participacao)/.test(
        request.url(),
      ) &&
        request.method() !== "GET")
    )
      writes.push(request.url());
  });
  await page.goto(`${path}?token=SYNTHETIC_SESSION#contexto`);
  await expect(page.locator('meta[name="comun:share"]')).toHaveAttribute(
    "content",
    "public",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    canonical,
  );
  const heading = (
    await page.getByRole("heading", { level: 1 }).innerText()
  ).trim();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    heading,
  );
  const before = page.url();
  await openShare(page);
  await shareButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(shareButton(page)).toHaveText("Link copiado");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    canonical,
  );
  expect(page.url()).toBe(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `D:/COMUN-49H-QA/pauta-${page.viewportSize()?.width}.png`,
    fullPage: true,
  });
  await page
    .locator('[data-comun-pauta-practice-guidance="pauta"] summary')
    .click();
  await page
    .getByRole("link", { name: "Evidência ou suposição?", exact: true })
    .click();
  await expect(page.locator('meta[name="comun:share"]')).toHaveAttribute(
    "content",
    "public",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://comunsocial.online/comun/ajuda/praticas/evidencia-ou-suposicao",
  );
  await expect(
    page.locator("[data-comun-public-practice-material]"),
  ).toContainText("A leitura não registra progresso");
  await openShare(page);
  await shareButton(page).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "https://comunsocial.online/comun/ajuda/praticas/evidencia-ou-suposicao",
  );
  await page.goBack();
  expect(page.url()).toBe(before);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
  await expect(
    page.locator("nextjs-portal").getByText("Runtime Error", { exact: true }),
  ).toHaveCount(0);
});

test("cancelled OS sharing does not copy or claim success; failed native and clipboard sharing exposes an accessible manual link", async ({
  page,
}) => {
  // Fault injection at OS APIs; this proves rendered handling, not the native OS sheet.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelled", "AbortError");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("COPY_MUST_NOT_RUN");
        },
      },
    });
  });
  await page.goto(path);
  await expect(page.locator('meta[name="comun:share"]')).toHaveAttribute(
    "content",
    "public",
  );
  await openShare(page);
  await shareButton(page).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Compartilhamento cancelado" }),
  ).toBeAttached();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(shareButton(page)).toHaveText("Compartilhar");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new Error("OS_UNAVAILABLE");
      },
    }),
  );
  await openShare(page);
  await shareButton(page).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Copiar link manualmente" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Link público")).toBeFocused();
  await expect(dialog.getByLabel("Link público")).toHaveValue(canonical);
  expect(
    (await new AxeBuilder({ page }).include("dialog").analyze()).violations,
  ).toEqual([]);
  expect(
    await dialog
      .getByLabel("Link público")
      .evaluate(
        (element: HTMLInputElement) =>
          element.selectionEnd! - element.selectionStart!,
      ),
  ).toBe(canonical.length);
  await page.screenshot({
    path: `D:/COMUN-49H-QA/manual-${page.viewportSize()?.width}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(shareButton(page)).toBeFocused();
  expect(new URL(page.url()).pathname).toBe(path);
});

test("native payload matches the authorized public summary and contains no session or private handles", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload: unknown) => {
        (window as unknown as { shared: unknown }).shared = payload;
      },
    }),
  );
  await page.goto(
    `${path}?email=SYNTHETIC_PRIVATE&experiencia=legacy#protocol`,
  );
  await expect(page.locator('meta[name="comun:share"]')).toHaveAttribute(
    "content",
    "public",
  );
  await openShare(page);
  await shareButton(page).click();
  const payload = await page.evaluate(
    () => (window as unknown as { shared: unknown }).shared,
  );
  expect(payload).toEqual({
    url: canonical,
    title: await page
      .locator('meta[property="og:title"]')
      .getAttribute("content"),
    text: await page
      .locator('meta[property="og:description"]')
      .getAttribute("content"),
  });
  expect(JSON.stringify(payload)).not.toMatch(
    /SYNTHETIC_PRIVATE|experiencia|protocol|email/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("public reading and return work with JavaScript disabled, without School activation", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/comun/ajuda/praticas/evidencia-ou-suposicao?etapa=pauta");
  await expect(
    page.getByRole("heading", { name: "Como aplicar na prática" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir atividade na Escola" }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Voltar à orientação", exact: true })
    .click();
  await expect(
    page
      .locator('[data-comun-practice-guidance="pauta"]')
      .filter({ visible: true }),
  ).toBeVisible();
  await context.close();
});
