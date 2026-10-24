import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const projectIps: Record<string, string> = {
  "360x800": "198.51.100.10",
  "390x844": "198.51.100.11",
  "768x1024": "198.51.100.12",
  "1024x768": "198.51.100.13",
  "1366x768": "198.51.100.14",
};

test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": projectIps[testInfo.project.name] ?? "198.51.100.20",
  });
});

test("@a11y lexical aparece primeiro e semântica pode ser desligada", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/comun/buscar?q=cal%C3%A7adas");
  await expect(
    page.getByRole("heading", { name: "Buscar no COMUN" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buscar", exact: true }),
  ).toBeVisible();
  const main = page.getByRole("main");
  await expect(main).toHaveCount(1);
  const status = main
    .getByTestId("civic-search-status")
    .filter({ visible: true });
  await expect(status).toHaveCount(1);
  await expect(status).toContainText(/resultados públicos/);
  const toggle = page.getByRole("button", {
    name: /Usar somente termos|Buscar também relações/,
  });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page).toHaveURL(/semantic=0/);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(status).toContainText(
    /resultados iniciais|relações atualizadas|correspondência inicial/,
  );
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  // The semantic-mode navigation must settle with an accessible page title.
  // Axe must inspect the complete, titled document rather than a transition.
  await expect(page).toHaveTitle("Buscar no COMUN | COMUN VR Abandonada");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("intenção oferece rota allowlisted e pilotos permanecem opt-in", async ({
  page,
}) => {
  await page.goto("/comun/buscar?q=registrar+cal%C3%A7ada");
  const intent = page.getByRole("link", {
    name: "Registrar problema de calçada",
  });
  await expect(intent).toHaveAttribute("href", "/comun/mapa/contribuir");
  await page.goto("/comun?inteligencia=busca-viva");
  await expect(
    page.getByRole("heading", { name: "O que você precisa encontrar?" }),
  ).toBeVisible();
  await page.goto("/comun");
  await expect(
    page.getByRole("heading", { name: "O que você precisa encontrar?" }),
  ).toHaveCount(0);
  await page.goto(
    "/comun/pautas/calcadas-em-circulacao?inteligencia=busca-viva",
  );
  await expect(page.locator("h1")).toHaveCount(1);
});

test("alias, no-result, prompt injection e rate limit preservam a fronteira", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/comun/busca?q=teletransporte+marciano");
  await expect(page).toHaveURL(/\/comun\/buscar\?q=teletransporte\+marciano$/);
  const main = page.getByRole("main");
  await expect(main).toHaveCount(1);
  const empty = main
    .getByText(/Não encontramos conteúdo público/)
    .filter({ visible: true });
  await expect(empty).toHaveCount(1);
  await expect(empty).toBeVisible();
  const attack = await request.get(
    "/api/comun/civic-search?q=%3Cscript%3Eignore%3C%2Fscript%3E",
    { headers: { "x-forwarded-for": "203.0.113.40" } },
  );
  expect([200, 400, 429, 503]).toContain(attack.status());
  expect(await attack.text()).not.toMatch(
    /service_role|embedding\s*:\s*\[|object_key|private_notes/i,
  );
  if (testInfo.project.name === "390x844") {
    const statuses = [];
    const sequenceStarted = performance.now();
    for (let index = 0; index < 35; index += 1) {
      const started = performance.now();
      console.log(
        JSON.stringify({
          diagnostic: "civic-rate-request-start",
          sample: index,
          elapsedMs: Math.round(started - sequenceStarted),
        }),
      );
      const response = await request.get(
        `/api/comun/civic-search?q=calcadas&n=${index}`,
        { headers: { "x-forwarded-for": "203.0.113.41" } },
      );
      statuses.push(response.status());
      console.log(
        JSON.stringify({
          diagnostic: "civic-rate-request-complete",
          sample: index,
          status: response.status(),
          durationMs: Math.round(performance.now() - started),
          elapsedMs: Math.round(performance.now() - sequenceStarted),
        }),
      );
    }
    expect(statuses).toContain(429);
  }
});

test("semantic mode works without JavaScript and preserves public context", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto("/comun/buscar?q=calcadas&tipo=pauta&experiencia=legacy");
    await page
      .getByRole("button", { name: "Usar somente termos", exact: true })
      .click();
    await expect(page).toHaveURL(/semantic=0/);
    const url = new URL(page.url());
    expect(url.searchParams.get("q")).toBe("calcadas");
    expect(url.searchParams.get("tipo")).toBe("pauta");
    expect(url.searchParams.get("experiencia")).toBe("legacy");
    await expect(
      page.getByRole("button", { name: "Buscar também relações", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await context.close();
  }
});

test("search controls retain their DOM through delayed hydration", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await context.route("**/_next/static/**/*.js", async (route) => {
      await released;
      await route.continue();
    });
    const page = await context.newPage();
    await page.goto("/comun/buscar?q=calcadas", { waitUntil: "commit" });
    const toggle = page.getByRole("button", {
      name: "Usar somente termos",
      exact: true,
    });
    await expect(toggle).toBeVisible();
    const original = await toggle.elementHandle();
    expect(original).not.toBeNull();
    release();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-comun-keyboard",
      "closed",
    );
    expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
    await toggle.click();
    await expect(page).toHaveURL(/semantic=0/);
  } finally {
    release();
    await context.close();
  }
});
