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
        // Test the form after the interactive shell settles: on the previous
        // mobile CI run, hydration replaced a typed q with an empty value.
        // The no-JavaScript path is still tested independently below.
        if (javaScriptEnabled) await page.waitForLoadState("networkidle");
        const form = page.locator("form").filter({
          has: page.getByRole("textbox", {
            name: "Buscar comunidade",
            exact: true,
          }),
        });
        const query = "comunidade-inexistente-49e";
        const searchField = form.getByRole("textbox", {
          name: "Buscar comunidade",
          exact: true,
        });
        await searchField.fill(query);
        const submit = form.getByRole("button", {
          name: experience ? "Filtrar" : "Buscar",
          exact: true,
        });
        await submit.focus();
        await expect(searchField).toHaveValue(query);
        await page.keyboard.press("Enter");
        // A successful navigation must carry the actual typed query, not just
        // land in the same experience with silently cleared filters.
        await expect
          .poll(() => new URL(page.url()).searchParams.get("q"))
          .toBe(query);
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
        await expect(communityLinks.first()).toBeVisible();
        const communityHrefs = await communityLinks.evaluateAll((links) =>
          links.map((link) => link.getAttribute("href")),
        );
        expect(communityHrefs.length).toBeGreaterThan(0);
        for (const href of communityHrefs) {
          expect(href).not.toBeNull();
          const url = new URL(href!, baseURL);
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
        if (!javaScriptEnabled) {
          // Axe needs a JavaScript runtime. Keep application scripts blocked
          // in a separate context so it audits the unhydrated public fallback.
          const auditContext = await browser.newContext({ baseURL });
          try {
            await auditContext.route("**/*", (route) =>
              route.request().resourceType() === "script"
                ? route.abort()
                : route.continue(),
            );
            const auditPage = await auditContext.newPage();
            await auditPage.goto(`/comun/comunidades${experience}`);
            await expect(
              auditPage.getByRole("textbox", {
                name: "Buscar comunidade",
                exact: true,
              }),
            ).toBeVisible();
            const audit = await new AxeBuilder({ page: auditPage }).analyze();
            expect(
              audit.violations.filter((violation) =>
                ["serious", "critical"].includes(violation.impact ?? ""),
              ),
            ).toEqual([]);
          } finally {
            await auditContext.close();
          }
        }
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
    await expect(page).toHaveTitle("Do assunto à primeira ação | COMUN");
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

for (const viewport of [
  { name: "mobile", width: 360, height: 800 },
  { name: "desktop", width: 1280, height: 800 },
]) {
  test("Home sem JS: " + viewport.name, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: viewport.width, height: viewport.height },
      javaScriptEnabled: false,
    });
    try {
      const page = await context.newPage();
      const writes: string[] = [];
      page.on("request", (request) => {
        if (
          !["GET", "HEAD"].includes(request.method()) &&
          new URL(request.url()).pathname.startsWith("/api/comun")
        ) {
          writes.push(request.url());
        }
      });

      await page.goto("/comun");
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(
        page.locator("[data-comun-participation-paths]"),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Buscar um assunto", exact: true }),
      ).toHaveAttribute("href", "/comun/buscar");
      await page
        .getByRole("link", { name: "Buscar um assunto", exact: true })
        .click();
      await expect(page).toHaveURL(/\/comun\/buscar$/);
      await page
        .getByRole("textbox", { name: "Termo de busca" })
        .fill("calçadas");
      await page.getByRole("button", { name: "Buscar", exact: true }).click();
      await expect(page).toHaveURL(/\/comun\/buscar\?q=cal%C3%A7adas/);
      await expect(
        page.getByRole("heading", { name: "Buscar no COMUN", exact: true }),
      ).toBeVisible();

      await page.goBack();
      await expect(page).toHaveURL(/\/comun\/buscar$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/comun$/);
      const featured = page
        .getByRole("main")
        .locator("[data-comun-home-featured-source]");
      const source = await featured.getAttribute(
        "data-comun-home-featured-source",
      );
      expect(["remote", "editorial_fallback", "empty"]).toContain(source);
      if (source === "empty") {
        await expect(featured).toContainText(
          "Ainda não há uma pauta disponível neste destaque.",
        );
        await expect(featured.locator('[data-comun-card="pauta"]')).toHaveCount(
          0,
        );
      } else {
        await expect(featured.locator('[data-comun-card="pauta"]')).toHaveCount(
          1,
        );
        if (source === "editorial_fallback") {
          await expect(featured).toContainText(
            "Não indica resultados ou participações já verificados.",
          );
        }
        await expect(
          featured.getByRole("link", { name: "Abrir pauta", exact: true }),
        ).toHaveAttribute("href", /^\/comun\/pautas\/[^/?#]+$/);
      }
      expect(writes).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

// Keep the original SSR Home entry and the search POST action in sync after
// merging the compact public Home with contextual search. Navigation remains
// public and must not create API writes or silently drop the legacy boundary.
for (const mode of ["", "&experiencia=legacy"]) {
  test(`Home mantém q e modo ${mode || "padrão"}`, async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        !["GET", "HEAD"].includes(request.method()) &&
        new URL(request.url()).pathname.startsWith("/api/comun") &&
        new URL(request.url()).pathname !== "/api/comun/quality-metrics"
      )
        writes.push(request.url());
    });

    await page.goto(`/comun?inteligencia=busca-viva${mode}`);
    await page.waitForLoadState("networkidle");
    const input = page.getByRole("textbox", {
      name: "Necessidade ou assunto",
    });
    await expect(input).toHaveCount(1);
    await input.fill("calçadas");
    await expect(input).toHaveValue("calçadas");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe("/comun/buscar");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("q"))
      .toBe("calçadas");
    expect(new URL(page.url()).searchParams.get("experiencia")).toBe(
      mode ? "legacy" : null,
    );
    await expect(
      page.getByRole("heading", { name: "Buscar no COMUN", exact: true }),
    ).toBeVisible();
    expect(writes).toEqual([]);
  });
}

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
    if (experience) {
      await expect(paths).toBeVisible();
    } else {
      await expect(paths).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Buscar um assunto", exact: true }),
      ).toHaveAttribute("href", "/comun/buscar");
      // A server-rendered public fallback can briefly coexist with the
      // hydrated shell during the Suspense handoff. Assert the final DOM has
      // exactly one shell and featured section instead of reading either copy.
      // This still fails if a duplicate persists after hydration.
      await expect(page.locator("[data-comun-shell-mode]")).toHaveCount(1);
      const featured = page.locator("[data-comun-home-featured-source]");
      await expect(featured).toHaveCount(1);
      await expect(
        page.getByRole("heading", { name: "Uma pauta para conhecer" }),
      ).toHaveCount(1);
      await expect(
        page.getByRole("heading", { name: "Uma pauta para conhecer" }),
      ).toBeVisible();
      const source = await featured.getAttribute(
        "data-comun-home-featured-source",
      );
      expect(["remote", "editorial_fallback", "empty"]).toContain(source);
      if (source === "editorial_fallback") {
        await expect(featured).toContainText("Destaque editorial do COMUN");
        await expect(featured.locator('[data-comun-card="pauta"]')).toHaveCount(
          1,
        );
      } else if (source === "empty") {
        await expect(featured).toContainText(
          "Ainda não há uma pauta disponível neste destaque.",
        );
        await expect(featured.locator('[data-comun-card="pauta"]')).toHaveCount(
          0,
        );
      } else {
        await expect(featured.locator('[data-comun-card="pauta"]')).toHaveCount(
          1,
        );
      }
      await expect(
        page.locator("[data-comun-motorola-primary-action]"),
      ).toHaveAttribute("href", "/comun/relatar");
      // If a real signed-in center carries a priority inbox item, it
      // must not repeat the same action under a second "Próxima ação" card.
      const urgentItem = page.locator(
        'section[aria-labelledby="home-attention"] a.surface-alert',
      );
      if (await urgentItem.count()) {
        await expect(
          page.getByRole("heading", { name: "Próxima ação", exact: true }),
        ).toHaveCount(0);
      }
      // Accessible links in the horizontal tool strip must have a visible
      // keyboard focus treatment just like the primary intent doors.
      const calcadasShortcut = page
        .locator('section[aria-labelledby="home-shortcuts"]')
        .getByRole("link", { name: "Calçadas", exact: true });
      await calcadasShortcut.focus();
      await expect(calcadasShortcut).toBeFocused();
      await expect(calcadasShortcut).toHaveClass(/focus-visible:outline-4/);
    }
    await (experience ? paths : page)
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
