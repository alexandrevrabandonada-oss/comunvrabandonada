import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const appV2 = "experiencia=app-v2";
const contrastRoutes = [
  "/comun",
  "/comun/explorar",
  "/comun/participar",
  "/comun/entrar",
  "/comun/criar-conta",
  "/comun/comunidades",
  "/comun/pautas/trabalho-burnout-volta-redonda",
  "/comun/territorios",
  "/comun/calcadas",
  "/comun/resultados",
  "/comun/acervo",
  "/comun/radio",
  "/comun/arte",
  "/comun/ajuda",
  "/comun/mapa",
] as const;

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

test("@contrast resolve texto e superfície nos shells representativos", async ({
  page,
}) => {
  for (const route of contrastRoutes) {
    await page.goto(`${route}?${appV2}`);
    const offenders = await page.locator("#conteudo").evaluate((main) => {
      type Rgb = { r: number; g: number; b: number; a: number };
      const parse = (value: string): Rgb | null => {
        const match = value.match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)(?:[, /]+(\d+(?:\.\d+)?))?\)/);
        if (!match) return null;
        return {
          r: Number(match[1]),
          g: Number(match[2]),
          b: Number(match[3]),
          a: match[4] === undefined ? 1 : Number(match[4]),
        };
      };
      const blend = (front: Rgb, back: Rgb): Rgb => ({
        r: front.r * front.a + back.r * (1 - front.a),
        g: front.g * front.a + back.g * (1 - front.a),
        b: front.b * front.a + back.b * (1 - front.a),
        a: 1,
      });
      const luminance = (color: Rgb) => {
        const channel = (value: number) => {
          const normalized = value / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return (
          0.2126 * channel(color.r) +
          0.7152 * channel(color.g) +
          0.0722 * channel(color.b)
        );
      };
      const background = (element: Element) => {
        let current: Element | null = element;
        let resolved: Rgb = { r: 255, g: 255, b: 255, a: 1 };
        const layers: Rgb[] = [];
        while (current) {
          const color = parse(getComputedStyle(current).backgroundColor);
          if (color && color.a > 0) layers.push(color);
          current = current.parentElement;
        }
        for (const layer of layers.reverse()) resolved = blend(layer, resolved);
        return resolved;
      };
      return [...main.querySelectorAll("h1,h2,h3,p,a,button,label,dt,dd,summary,strong,span")]
        .flatMap((element) => {
          const ownText = [...element.childNodes]
            .filter((node) => node.nodeType === 3)
            .map((node) => node.textContent ?? "")
            .join(" ")
            .trim();
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (
            !ownText ||
            rect.width < 1 ||
            rect.height < 1 ||
            style.visibility === "hidden" ||
            style.display === "none" ||
            Number(style.opacity) === 0
          )
            return [];
          const rawForeground = parse(style.color);
          if (!rawForeground) return [];
          const back = background(element);
          const foreground = blend(rawForeground, back);
          const light = Math.max(luminance(foreground), luminance(back));
          const dark = Math.min(luminance(foreground), luminance(back));
          const ratio = (light + 0.05) / (dark + 0.05);
          const fontSize = Number.parseFloat(style.fontSize);
          const weight = Number.parseInt(style.fontWeight, 10) || 400;
          const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
          const required = large ? 3 : 4.5;
          return ratio + 0.05 < required
            ? [{
                text: ownText.slice(0, 80),
                tag: element.tagName,
                ratio: Number(ratio.toFixed(2)),
                required,
                color: style.color,
                background: `rgb(${Math.round(back.r)}, ${Math.round(back.g)}, ${Math.round(back.b)})`,
              }]
            : [];
        })
        .slice(0, 20);
    });
    expect(offenders, `${route}: ${JSON.stringify(offenders)}`).toEqual([]);
  }
});

test("@first-viewport Participar oferece três intenções e próxima categoria", async ({
  page,
}) => {
  await page.goto(`/comun/participar?${appV2}`);
  await expect(page.locator(".comun-intention-card__action").first()).toBeVisible();
  const result = await page.evaluate(() => {
    const nav = document.querySelector(".comun-bottom-nav-v2");
    const usableBottom = nav?.getBoundingClientRect().top ?? innerHeight;
    const actions = [...document.querySelectorAll(".comun-intention-card__action")];
    const visibleActions = actions.filter((action) => {
      const rect = action.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= usableBottom;
    }).length;
    const organize = [...document.querySelectorAll("h2")].find(
      (heading) => heading.textContent?.trim() === "Organizar e agir",
    );
    return {
      viewportHeight: innerHeight,
      visibleActions,
      nextCategoryStarted:
        !!organize && organize.getBoundingClientRect().top < usableBottom,
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    };
  });
  expect(result.visibleActions).toBeGreaterThanOrEqual(
    result.viewportHeight >= 700 ? 3 : 1,
  );
  if (result.viewportHeight >= 700) expect(result.nextCategoryStarted).toBe(true);
  expect(result.overflow).toBe(false);
});

test("@first-viewport Entrar mostra contexto e início do formulário", async ({
  page,
}) => {
  await page.goto(`/comun/entrar?${appV2}&returnTo=%2Fcomun%2Fparticipar%3Fexperiencia%3Dapp-v2`);
  await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
  const email = page.getByRole("textbox", { name: "E-mail" });
  await expect(email).toBeVisible();
  const placement = await email.evaluate((element) => ({
    ratio: element.getBoundingClientRect().top / innerHeight,
    viewportHeight: innerHeight,
  }));
  expect(placement.ratio).toBeLessThan(
    placement.viewportHeight < 500 ? 0.7 : 0.55,
  );
  await expect(page.getByTestId("connection-status")).toHaveClass(/sr-only/);
});

test("@mobile navegação efetiva, reconexão real e acessibilidade", async ({
  context,
  page,
}) => {
  for (const route of ["/comun/participar", "/comun/entrar"]) {
    await page.goto(`${route}?${appV2}`);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    );
    expect(violations, `${route}: ${violations.map((item) => item.id)}`).toEqual([]);
  }

  await page.goto(`/comun/participar?${appV2}`);
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue(
          "--comun-bottom-nav-effective-height",
        ),
      ),
    )
    .toMatch(/^\d+(?:\.\d+)?px$/);
  const navContract = await page.evaluate(() => {
    const nav = document.querySelector(".comun-bottom-nav-v2");
    const content = document.querySelector(".comun-app-shell-v2__content");
    return {
      measured: Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--comun-bottom-nav-effective-height",
        ),
      ),
      nav: nav?.getBoundingClientRect().height ?? 0,
      padding: content
        ? Number.parseFloat(getComputedStyle(content).paddingBottom)
        : 0,
    };
  });
  expect(navContract.measured).toBeGreaterThanOrEqual(navContract.nav);
  expect(navContract.padding).toBeGreaterThan(navContract.nav);

  const status = page.getByTestId("connection-status");
  await page.evaluate(() => dispatchEvent(new Event("online")));
  await expect(status).toHaveClass(/sr-only/);
  await context.setOffline(true);
  await expect(status).toContainText(/sem conexão/i);
  await context.setOffline(false);
  await expect(status).toContainText("Conexão restabelecida");
});

test("@zoom fonte ampliada e zoom não escondem controles", async ({ page }) => {
  for (const route of ["/comun/participar", "/comun/entrar"]) {
    await page.goto(`${route}?${appV2}`);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
    const target = route.endsWith("entrar")
      ? page.getByRole("button", { name: "Entrar" })
      : page.locator(".comun-intention-card__action").last();
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeVisible();
  }
});

for (const [name, route] of [
  ["participar", "/comun/participar"],
  ["entrar", "/comun/entrar"],
] as const) {
  test(`@visual registra ${name} estabilizado`, async ({ page }, testInfo) => {
    const runtimeErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.goto(`${route}?${appV2}`);
    // Aguarda a hidratação terminar antes de o screenshot ocultar o cursor.
    await page.waitForTimeout(250);
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: false,
    });
    expect(runtimeErrors).toEqual([]);
  });
}
