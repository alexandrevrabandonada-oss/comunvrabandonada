import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import budgets from "@/config/comun-quality-budgets.json";

const coreRoutes = [
  "/comun",
  "/comun?experiencia=coerencia",
  "/comun/ajuda",
  "/comun/seguranca",
  "/comun/offline",
  "/comun/buscar?q=calcadas",
];

test("@a11y WCAG automatizável, landmarks e reflow nas rotas centrais", async ({
  page,
}) => {
  for (const route of coreRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact ?? ""),
      ),
      route,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      route,
    ).toBeTruthy();
  }
});

test("@a11y teclado, foco visível, zoom e redução de movimento", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto("/comun/ajuda");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  expect(
    await focused.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("link", { name: "Explorar processos" }),
  ).toBeVisible();
  expect(await page.locator(".comun-sheet").count()).toBe(0);
});

test("@a11y autenticação aceita gerenciador, colagem e retorno explícito", async ({
  page,
}) => {
  await page.goto("/comun/entrar?returnTo=%2Fcomun%2Fminha-participacao");
  const email = page.getByLabel("E-mail");
  const password = page.getByLabel("Senha");
  await expect(email).toHaveAttribute("autocomplete", "email");
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await email.fill("pessoa.sintetica@example.invalid");
  await password.fill("senha-sintetica-nao-real");
  await expect(page.locator('input[name="returnTo"]')).toHaveValue(
    "/comun/minha-participacao",
  );
});

test("@network busca preserva fallback quando enriquecimento falha", async ({
  page,
}) => {
  await page.route("**/api/comun/civic-search**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"code":"fixture_unavailable"}',
    }),
  );
  await page.goto("/comun/buscar?q=calcadas");
  await expect(
    page.getByRole("heading", { name: "Buscar no COMUN" }),
  ).toBeVisible();
  await expect(page.getByTestId("civic-search-status")).toContainText(
    /resultados iniciais preservados/i,
  );
  await expect(page.getByText(/buscando relações/i)).toHaveCount(0);
});

test("@network conexão lenta mantém conteúdo útil e recuperação", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium" ||
      !testInfo.project.name.includes("low-android"),
  );
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (200 * 1024) / 8,
    uploadThroughput: (80 * 1024) / 8,
    connectionType: "cellular3g",
  });
  await page.goto("/comun/ajuda", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /Ajuda para seguir/ }),
  ).toBeVisible();
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        navigator.serviceWorker?.getRegistration("/comun/").then(Boolean),
      ),
    )
    .toBeTruthy();
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByTestId("connection-status")).toContainText(
    "Sem conexão",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByTestId("connection-status")).toContainText(
    /restabelecida/i,
  );
});

test("@performance budgets, hidratação e client boundaries", async ({
  browser,
}, testInfo) => {
  const errors: string[] = [];
  const qualityObserver = () => {
    const state = { lcp: 0, cls: 0, longTasks: 0 };
    Object.defineProperty(window, "__comunQualityLab", {
      value: state,
      configurable: true,
    });
    new PerformanceObserver((list) => {
      state.lcp = Math.max(
        state.lcp,
        ...list.getEntries().map((entry) => entry.startTime),
      );
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<
        PerformanceEntry & { value?: number; hadRecentInput?: boolean }
      >)
        if (!entry.hadRecentInput) state.cls += entry.value ?? 0;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      state.longTasks += list.getEntries().length;
    }).observe({ type: "longtask", buffered: true });
  };
  const routes = [
    ["home", "/comun", "simple"],
    ["help", "/comun/ajuda", "simple"],
    ["security", "/comun/seguranca", "simple"],
    ["search", "/comun/buscar?q=calcadas", "rich"],
    ["sidewalks", "/comun/calcadas", "rich"],
    ["archive", "/comun/acervo", "visual"],
    ["radio", "/comun/radio", "media"],
    ["art", "/comun/arte", "visual"],
  ] as const;
  const report = [];
  for (const [route, path, budgetClass] of routes) {
    const projectUse = testInfo.project.use;
    const routeContext = await browser.newContext({
      baseURL: process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3022",
      viewport: projectUse.viewport ?? { width: 390, height: 844 },
      hasTouch: projectUse.hasTouch,
      deviceScaleFactor: projectUse.deviceScaleFactor,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });
    await routeContext.addInitScript(qualityObserver);
    const routePage = await routeContext.newPage();
    routePage.on("pageerror", (error) => errors.push(error.name));
    const cdp = await routePage.context().newCDPSession(routePage);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await routePage.goto(path, { waitUntil: "networkidle" });
    await routePage.waitForTimeout(250);
    const metrics = await routePage.evaluate(() => {
      const entries = performance.getEntriesByType(
        "resource",
      ) as PerformanceResourceTiming[];
      const bytes = (pattern: RegExp) =>
        entries
          .filter((entry) => pattern.test(new URL(entry.name).pathname))
          .reduce((sum, entry) => sum + entry.transferSize, 0);
      const state = (
        window as typeof window & {
          __comunQualityLab?: {
            lcp: number;
            cls: number;
            longTasks: number;
          };
        }
      ).__comunQualityLab ?? { lcp: 0, cls: 0, longTasks: 0 };
      const measured = performance as Performance & {
        memory?: { usedJSHeapSize: number };
      };
      return {
        jsKb: bytes(/\.js$/) / 1024,
        cssKb: bytes(/\.css$/) / 1024,
        requests: entries.length + 1,
        heapMb: (measured.memory?.usedJSHeapSize ?? 0) / 1048576,
        ...state,
        heavyMapLoaded: entries.some((entry) =>
          /maplibre|pmtiles/i.test(entry.name),
        ),
      };
    });
    const budget = budgets[budgetClass];
    const passed =
      metrics.jsKb <= budget.initialJsKb &&
      metrics.cssKb <= budget.cssKb &&
      metrics.requests <= budget.requests &&
      (!metrics.heapMb || metrics.heapMb <= budget.heapMb) &&
      (!metrics.lcp || metrics.lcp <= budget.lcpMs) &&
      metrics.longTasks <= budget.longTasks;
    report.push({
      route,
      budgetClass,
      passed,
      jsKb: Number(metrics.jsKb.toFixed(1)),
      cssKb: Number(metrics.cssKb.toFixed(1)),
      requests: metrics.requests,
      heapMb: Number(metrics.heapMb.toFixed(1)),
      lcpMs: Math.round(metrics.lcp),
      cls: Number(metrics.cls.toFixed(4)),
      longTasks: metrics.longTasks,
      heavyMapLoaded: metrics.heavyMapLoaded,
    });
    await routeContext.close();
    if (process.env.COMUN_QUALITY_ENFORCE_BUDGETS === "1")
      expect(
        passed,
        `${route} exceeded ${budgetClass} budget: ${JSON.stringify(report.at(-1))}`,
      ).toBeTruthy();
    if (route !== "sidewalks")
      expect(metrics.heavyMapLoaded, `${route} loaded map assets`).toBe(false);
  }
  expect(errors).toEqual([]);
  await testInfo.attach("quality-performance-sanitized.json", {
    body: Buffer.from(JSON.stringify({ routes: report })),
    contentType: "application/json",
  });
  mkdirSync("reports/generated", { recursive: true });
  const project = testInfo.project.name.replace(/[^a-z0-9-]/gi, "-");
  writeFileSync(
    `reports/generated/quality-performance-${project}.json`,
    `${JSON.stringify({ schemaVersion: 1, source: "synthetic_lab", project, routes: report }, null, 2)}\n`,
    { mode: 0o600 },
  );
});
