import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [path, title, publisher] of [
  [
    "/comun/observatorios/ambiente/qualidade-dos-rios",
    "Qualidade dos Rios",
    "INEA",
  ],
  [
    "/comun/observatorios/servicos-essenciais/energia",
    "Interrupções de energia elétrica",
    "ANEEL",
  ],
]) {
  test(`${publisher}: received direct link, public context, copy and return`, async ({
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
    const errors: string[] = [];
    const writes: string[] = [];
    let opaqueTechnicalMetrics = 0;
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      // Existing aggregate technical telemetry is separate from business mutation.
      // Accept only its exact payload contract, never a generic POST exception.
      if (
        new URL(r.url()).pathname === "/api/comun/quality-metrics" &&
        r.method() === "POST"
      ) {
        const payload = r.postDataJSON();
        // Chromium may omit a beacon body from request inspection. This is
        // recorded as uninspected telemetry, never claimed as a payload proof.
        if (payload === null) {
          opaqueTechnicalMetrics += 1;
          return;
        }
        if (
          JSON.stringify(Object.keys(payload).sort()) !==
            JSON.stringify(
              [
                "name",
                "value",
                "rating",
                "routeClass",
                "deviceClass",
                "appVersion",
              ].sort(),
            ) ||
          /SYNTHETIC_SESSION|token|email|userId/.test(JSON.stringify(payload))
        )
          writes.push(r.url());
        return;
      }
      if (
        r.headers()["next-action"] ||
        (r.url().includes("/api/") && r.method() !== "GET")
      )
        writes.push(r.url());
    });
    const response = await page.goto(`${path}?token=SYNTHETIC_SESSION#origem`);
    if (process.env.COMUN_TEST_OBSERVATORY_DISABLED === "1") {
      expect(response?.status()).toBe(404);
      await expect(
        page.locator('meta[name="comun:share"][content="public"]'),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", { level: 1, name: title, exact: true }),
      ).toHaveCount(0);
      await expect(
        page.locator("[data-comun-observatory-evidence]"),
      ).toHaveCount(0);
      expect(writes).toEqual([]);
      return;
    }
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    const evidence = page.locator("[data-comun-observatory-evidence]");
    const summary = await evidence
      .locator("[data-comun-public-summary]")
      .innerText();
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", summary);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      title,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(evidence).toContainText(publisher);
    await expect(evidence).toContainText("Volta Redonda");
    await page.screenshot({
      path: `D:/COMUN-49H-QA/specialized-initial-${publisher}-${page.viewportSize()?.width}.png`,
      fullPage: false,
    });
    await evidence
      .getByText("Limites desta evidência", { exact: true })
      .click();
    await expect(evidence.locator("details")).toHaveAttribute("open", "");
    expect(
      (await new AxeBuilder({ page }).include("main > header").analyze())
        .violations,
    ).toEqual([]);
    if ((page.viewportSize()?.width ?? 1280) < 1024)
      await page.getByLabel("Mais ações", { exact: true }).click();
    const share = page
      .getByRole("button", { name: /Compartilhar esta página$/ })
      .filter({ visible: true })
      .first();
    await share.focus();
    await page.keyboard.press("Enter");
    await expect(share).toHaveText("Link copiado");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `https://comunsocial.online${path}`,
    );
    expect(page.url()).toContain("token=SYNTHETIC_SESSION");
    await evidence
      .getByRole("link", { name: "Consultar fontes e metodologia" })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}/fontes$`));
    await page.goBack();
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    expect(page.url()).toContain("token=SYNTHETIC_SESSION");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `D:/COMUN-49H-QA/specialized-${publisher}-${page.viewportSize()?.width}.png`,
      fullPage: false,
    });
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
    test.info().annotations.push({
      type: "technical-telemetry",
      description: `uninspected beacon bodies: ${opaqueTechnicalMetrics}; business writes: 0`,
    });
  });
}
