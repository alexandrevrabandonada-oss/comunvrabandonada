import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("radio preserves public credits and discovery return without JavaScript", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: "http://127.0.0.1:3150",
    viewport: testInfo.project.use.viewport || { width: 390, height: 844 },
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:3150"
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  await page.goto(
    "/comun/radio/episodios/escuta-local?origem=descoberta&categoria=radio&experiencia=app-v2",
  );
  await expect(
    page.getByRole("heading", {
      name: "Escuta da praça — laboratório",
      exact: true,
    }),
  ).toBeVisible();
  const rights = page.locator("[data-comun-radio-rights]:visible");
  await expect(rights).toHaveCount(1);
  await expect(
    rights.getByText("Equipe de escuta local — Apresentação", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar à descoberta" }).click();
  await expect(page).toHaveURL(/\/comun\/explorar\?.*categoria=radio/);
  await context.close();
});

for (const mode of ["legacy", "app-v2"]) {
  test(`radio episode provenance is public and revalidated in ${mode}`, async ({
    page,
    context,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const query = `&experiencia=${mode}`;
    await page.goto(
      `/comun/radio/episodios/escuta-local?origem=descoberta&categoria=radio${query}`,
    );
    await expect(
      page.locator('[data-comun-app-v2-page="radio-episode"]'),
    ).toHaveCount(mode === "app-v2" ? 1 : 0);
    await expect(
      page.getByRole("heading", {
        name: "Escuta da praça — laboratório",
        exact: true,
      }),
    ).toBeVisible();
    const rights = page.locator("[data-comun-radio-rights]:visible");
    await expect(rights).toHaveCount(1);
    await expect(
      rights.getByText("Equipe de escuta local — Apresentação", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      rights.getByText("Composição: Autoria comunitária", { exact: true }),
    ).toBeVisible();
    await expect(
      rights.getByText(
        "Licença/condições informadas: Escuta autorizada; redistribuição depende de autorização.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Crédito reservado do laboratório"),
    ).toHaveCount(0);
    expect(
      (await new AxeBuilder({ page }).include(".surface-memory").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`radio-rights-${mode}.png`),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Voltar à descoberta" }).click();
    await expect(page).toHaveURL(/\/comun\/explorar\?.*categoria=radio/);
    await context.addCookies([
      {
        name: "discovery-lab",
        value: "withdrawn",
        url: "http://127.0.0.1:3150",
      },
    ]);
    await page.goto(
      `/comun/radio/episodios/escuta-local?origem=descoberta&categoria=radio${query}`,
    );
    await expect(
      page.getByRole("heading", { name: "Conteúdo indisponível" }),
    ).toBeVisible();
    await expect(
      page.getByText("Equipe de escuta local — Apresentação"),
    ).toHaveCount(0);
    await expect(page.getByText("Composição: Autoria comunitária")).toHaveCount(
      0,
    );
  });
}
