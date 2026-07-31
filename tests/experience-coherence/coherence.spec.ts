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

test("@a11y Home comparável declara propósito e uma ação principal", async ({
  page,
}) => {
  await page.goto("/comun?experiencia=coerencia");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Agora no território." }),
  ).toBeVisible();
  const surface = page.locator('[data-comun-experience-level="2"]');
  await expect(surface).toHaveAttribute(
    "data-comun-experience-pilot",
    "active",
  );
  await expect(
    page.getByRole("complementary", {
      name: "Comparação da direção de experiência",
    }),
  ).toBeVisible();
  await expect(
    surface.locator('[data-comun-primary-action="true"]'),
  ).toHaveCount(1);
  const primaryBox = await surface
    .locator('[data-comun-primary-action="true"] a')
    .boundingBox();
  expect(primaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoOverflow(page);
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("pauta piloto mantém contexto, estado, retorno e deep link", async ({
  page,
}) => {
  await page.goto("/comun/pautas/calcadas-em-circulacao?experiencia=coerencia");
  const surface = page.locator('[data-comun-experience-level="1"]');
  await expect(surface).toHaveAttribute(
    "data-comun-experience-pilot",
    "active",
  );
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.locator('nav[aria-label="Contexto do processo"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Voltar às pautas" }),
  ).toBeVisible();
  const register = page.getByRole("link", { name: "Registrar calçada" });
  if ((await register.count()) > 0) {
    const hrefs = await register.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );
    expect(
      hrefs.some((href) => href.includes("pauta=calcadas-em-circulacao")),
    ).toBe(true);
  }
  await expectNoOverflow(page);
});

test("alias, filtros e retorno à origem são preservados", async ({ page }) => {
  await page.goto("/comun/busca?q=calcadas&tipo=pauta");
  await expect(page).toHaveURL(/\/comun\/buscar\?q=calcadas&tipo=pauta$/);
  await page.goto(
    "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao&returnTo=%2Fcomun%2Fpautas%2Fcalcadas-em-circulacao",
  );
  await expect(page.locator("h1")).toBeVisible();
  await expectNoOverflow(page);
});

test("teclado, redução de movimento, zoom e fallback sólido continuam funcionais", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/comun?experiencia=coerencia");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
  const motion = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector("a")!);
    return Number.parseFloat(style.transitionDuration || "0");
  });
  expect(motion).toBeLessThanOrEqual(0.01);
  const fallback = await page
    .getByRole("complementary", {
      name: "Comparação da direção de experiência",
    })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        backdrop: style.backdropFilter,
      };
    });
  expect(fallback.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(fallback.backdrop === "none" || fallback.backdrop === "").toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(
    page.getByRole("heading", { name: "Agora no território." }),
  ).toBeVisible();
});

test("Central continua protegida e não vaza conteúdo administrativo", async ({
  page,
}) => {
  await page.goto("/comun/admin/operacao?experiencia=coerencia");
  await expect(page).toHaveURL(/\/comun\/admin\/(login|$)/);
  await expect(page.locator("body")).not.toContainText(
    /service_role|object_key|private_contact|member_user_id/i,
  );
});
