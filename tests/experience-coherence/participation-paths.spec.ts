import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const experience of ["", "?experiencia=legacy"]) {
  for (const javaScriptEnabled of [true, false]) {
    test(`Comunidades preserva experiência ao filtrar e limpar ${experience || "canônica"} JS=${javaScriptEnabled}`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({ baseURL, javaScriptEnabled });
      try {
        const page = await context.newPage();
        await page.goto(`/comun/comunidades${experience}`);
        const form = page.locator("form").filter({
          has: page.getByRole("textbox", {
            name: "Buscar comunidade",
            exact: true,
          }),
        });
        await form
          .getByRole("textbox", { name: "Buscar comunidade", exact: true })
          .fill("comunidade-inexistente-49e");
        const submit = form.getByRole("button", {
          name: experience ? "Filtrar" : "Buscar",
          exact: true,
        });
        await submit.focus();
        await page.keyboard.press("Enter");
        await expect(
          page.getByRole("heading", {
            name: "Nenhuma comunidade com esses filtros",
            exact: true,
          }),
        ).toBeVisible();
        expect(new URL(page.url()).searchParams.get("experiencia")).toBe(
          experience ? "legacy" : null,
        );
        await page
          .getByRole("link", { name: "Limpar filtros", exact: true })
          .click();
        await expect(page).toHaveURL(`/comun/comunidades${experience}`);
        await expect(
          page.getByRole("textbox", { name: "Buscar comunidade", exact: true }),
        ).toHaveValue("");
        const communityLinks = page.locator('main a[href^="/comun/c/"]');
        expect(await communityLinks.count()).toBeGreaterThan(0);
        for (const link of await communityLinks.all()) {
          const url = new URL((await link.getAttribute("href"))!, baseURL);
          expect(url.searchParams.get("experiencia")).toBe(
            experience ? "legacy" : null,
          );
        }
        if (experience) {
          await expect(
            form.getByRole("link", { name: "Limpar", exact: true }),
          ).toHaveAttribute("href", `/comun/comunidades${experience}`);
        }
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        ).toBe(true);
      } finally {
        await context.close();
      }
    });
  }
}

for (const experience of ["", "?experiencia=legacy"]) {
  const mode = experience ? "legacy" : "canônica";

  test(`@a11y Participar ${mode}: explorar e aprender sem entrar numa conta`, async ({
    page,
  }) => {
    await page.goto(`/comun/participar${experience}`);
    const paths = page.locator("[data-comun-participation-paths]");
    await expect(paths).toBeVisible();
    await expect(paths.locator("[data-comun-participation-path]")).toHaveCount(
      3,
    );
    for (const [label, href] of [
      ["Buscar um assunto", "/comun/buscar"],
      ["Conhecer ações", "/comun/acoes"],
      ["Conhecer comunidades", "/comun/comunidades"],
    ]) {
      await expect(
        paths.getByRole("link", { name: label, exact: true }),
      ).toHaveAttribute("href", `${href}${experience}`);
    }
    await expect(
      paths.getByRole("link", { name: "Aprender a organizar", exact: true }),
    ).toHaveAttribute(
      "href",
      `/comun/ajuda/primeira-acao${experience}#organizar`,
    );
    await expect(paths).toContainText(
      "Criar ou administrar um núcleo não está disponível",
    );
    await paths
      .getByRole("link", { name: "Não sei por onde começar", exact: true })
      .click();
    await expect(page).toHaveURL(`/comun/ajuda/primeira-acao${experience}`);
    await expect(page.locator("h1")).toHaveText("Do assunto à primeira ação");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(
      page.locator("[data-comun-first-action-guide] > li"),
    ).toHaveCount(3);
    await expect(
      page.getByRole("link", { name: "Pesquisar meu assunto", exact: true }),
    ).toHaveAttribute("href", `/comun/buscar${experience}`);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
    await page
      .getByRole("link", {
        name: "Voltar às formas de participação",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(`/comun/participar${experience}`);
    await expect(
      page.locator("[data-comun-participation-paths]"),
    ).toBeVisible();
  });
}

test("Orientação prática funciona sem JavaScript e abre a busca pública", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto("/comun/ajuda/primeira-acao?etapa=acompanhamento");
    await expect(
      page.getByRole("heading", {
        name: "Do assunto à primeira ação",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator('[data-comun-practice-guidance="acompanhamento"]:visible'),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Pesquisar meu assunto", exact: true })
      .click();
    await expect(page).toHaveURL(/\/comun\/buscar$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await page
      .getByRole("textbox", { name: "Termo de busca" })
      .fill("calçadas");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/q=cal%C3%A7adas/);
    await expect(
      page.getByRole("heading", { name: "Buscar no COMUN", exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

for (const experience of ["", "?experiencia=legacy"]) {
  test(`Home -> organização pública -> comunidades -> retorno ${experience || "canônica"}`, async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        !["GET", "HEAD"].includes(request.method()) &&
        new URL(request.url()).pathname.startsWith("/api/comun") &&
        new URL(request.url()).pathname !== "/api/comun/quality-metrics"
      )
        writes.push(request.url());
    });
    await page.goto(`/comun${experience}`);
    const paths = page.locator("[data-comun-participation-paths]");
    await expect(paths).toBeVisible();
    await paths
      .getByRole("link", { name: "Aprender a organizar", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      `/comun/ajuda/primeira-acao${experience}#organizar`,
    );
    await expect(page.locator("#organizar")).toContainText(
      "não permite criar ou administrar núcleos",
    );
    expect(Array.from(new URL(page.url()).searchParams.keys())).toEqual(
      experience ? ["experiencia"] : [],
    );
    await page
      .getByRole("link", {
        name: "Consultar comunidades e formas de ajudar",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(`/comun/comunidades${experience}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.goBack();
    await expect(page.locator("#organizar")).toBeVisible();
    expect(writes).toEqual([]);
  });
}
