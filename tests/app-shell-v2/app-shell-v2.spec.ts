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

test("shell modes keep footer, roots and nested navigation coherent", async ({
  page,
}) => {
  await page.goto(`/comun?${flag}`);
  const root = page.locator("[data-comun-shell-mode]");
  await expect(root).toHaveAttribute("data-comun-shell-mode", "member_root");
  await expect(page.locator("footer")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(
    nav.getByRole("button", { name: "Abrir formas de participar" }),
  ).toHaveCount(1);

  await page.goto(`/comun/participar?${flag}`);
  await expect(
    page.getByRole("button", { name: "Abrir formas de participar" }),
  ).toHaveAttribute("aria-current", "page");

  await page.goto(`/comun/comunidades?${flag}`);
  await expect(page.locator("[data-comun-shell-mode]")).toHaveAttribute(
    "data-comun-shell-mode",
    "member_nested",
  );
  await expect(page.getByRole("link", { name: "Voltar" })).toBeVisible();
  await expect(
    page.locator("[data-comun-bottom-navigation='app-v2']"),
  ).toHaveCount(0);
  await expect(page.locator("footer")).toHaveCount(0);

  await page.goto(`/comun/ajuda?${flag}`);
  await expect(page.locator("[data-comun-shell-mode]")).toHaveAttribute(
    "data-comun-shell-mode",
    "institutional",
  );
  await expect(page.locator("footer")).toBeVisible();
});

test("participation panel is allowlisted, progressive and mutation-free", async ({
  page,
}) => {
  await page.goto(`/comun?${flag}`);
  await page
    .getByRole("button", { name: "Abrir formas de participar" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Escolha uma forma de participar",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link")).toHaveCount(5);
  await dialog
    .getByRole("button", { name: "Ver cultura, memória e direitos" })
    .click();
  for (const label of [
    "Contribuir com pauta",
    "Registrar calçada",
    "Entrar em comunidade",
    "Assumir tarefa",
    "Enviar item ao Acervo",
    "Enviar áudio à Rádio",
    "Enviar obra",
    "Correção ou retirada",
  ])
    await expect(
      dialog.getByRole("link", { name: label, exact: false }),
    ).toBeVisible();
  await expect(dialog.locator("form")).toHaveCount(0);
});

test("tab scroll and Explore filters survive tab changes", async ({ page }) => {
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = ".comun-v2-page{min-height:2000px!important}";
      document.head.append(style);
    });
  });
  await page.goto(`/comun/explorar?categoria=comunidades&${flag}`);
  await expect(
    page
      .getByRole("navigation", { name: "Filtros principais" })
      .getByRole("link", { name: "Comunidades", exact: true }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await nav.getByRole("link", { name: "Início", exact: true }).press("Enter");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Explorar", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/categoria=comunidades/);

  await page.evaluate(() =>
    window.scrollTo(
      0,
      Math.min(600, document.documentElement.scrollHeight - innerHeight),
    ),
  );
  const saved = await page.evaluate(() => window.scrollY);
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Início", exact: true })
    .press("Enter");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Explorar", exact: true })
    .press("Enter");
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThanOrEqual(Math.max(0, saved - 2));
});

test("community and miniapp cards use distinct semantic grammars", async ({
  page,
}) => {
  await page.goto(`/comun/comunidades?${flag}`);
  await expect(
    page.locator("[data-comun-card='community']").first(),
  ).toBeVisible();
  await expect(page.locator("[data-comun-card='miniapp']")).toHaveCount(0);
  await page.goto(`/comun?${flag}`);
  await expect(
    page.locator("[data-comun-card='miniapp']").first(),
  ).toBeVisible();
});

test("@a11y app shell v2 has no serious violations, overflow or obscured end", async ({
  page,
}, testInfo) => {
  for (const route of [
    "/comun",
    "/comun/explorar",
    "/comun/comunidades",
    "/comun/c/trabalho",
    "/comun/calcadas",
  ]) {
    await page.goto(`${route}?${flag}`);
    const violations = (
      await new AxeBuilder({ page }).analyze()
    ).violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    );
    expect(
      violations,
      `${route}: ${violations.map((item) => item.id).join(", ")}`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() => {
        const content = document.querySelector(".comun-app-shell-v2__content");
        const nav = document.querySelector(".comun-bottom-nav-v2");
        if (!content || !nav) return true;
        return (
          Number.parseFloat(getComputedStyle(content).paddingBottom) >=
          nav.getBoundingClientRect().height
        );
      }),
    ).toBe(true);
  }
  if (testInfo.project.name.includes("pwa-standalone"))
    expect(
      await page.evaluate(
        () => matchMedia("(display-mode: standalone)").matches,
      ),
    ).toBe(true);
});

test("immersive shell and virtual keyboard keep controls reachable", async ({
  page,
}) => {
  await page.goto(`/comun/calcadas?${flag}`);
  await expect(page.locator("[data-comun-shell-mode]")).toHaveAttribute(
    "data-comun-shell-mode",
    "immersive",
  );
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(
    page.locator("[data-comun-bottom-navigation='app-v2']"),
  ).toHaveCount(0);

  await page.addInitScript(() => {
    const viewport = new EventTarget() as EventTarget & {
      height: number;
      offsetTop: number;
    };
    viewport.height = innerHeight;
    viewport.offsetTop = 0;
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    Object.defineProperty(window, "__setComunViewportHeight", {
      configurable: true,
      value: (height: number) => {
        viewport.height = height;
        viewport.dispatchEvent(new Event("resize"));
      },
    });
  });
  await page.goto(`/comun/explorar?${flag}`);
  await page.getByRole("textbox", { name: "Buscar no COMUN" }).focus();
  await expect(
    page.getByRole("textbox", { name: "Buscar no COMUN" }),
  ).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute(
    "data-comun-keyboard",
    "closed",
  );
  await page.evaluate(() => {
    (
      window as typeof window & {
        __setComunViewportHeight: (height: number) => void;
      }
    ).__setComunViewportHeight(innerHeight * 0.58);
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-comun-keyboard",
    "open",
  );
  await expect(
    page.locator("[data-comun-bottom-navigation='app-v2']"),
  ).toHaveCSS("display", "none");
});

test("reduced motion and forced colors retain state cues", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto(`/comun?${flag}`);
  await expect(
    page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Início", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    await page
      .locator(".comun-app-shell-v2")
      .evaluate((element) => getComputedStyle(element).overflowX),
  ).not.toBe("visible");
});
