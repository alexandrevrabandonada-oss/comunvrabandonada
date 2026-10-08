import { expect, test } from "@playwright/test";

for (const experience of ["", "?experiencia=legacy"]) {
  test(`orientação na pauta${experience}: fontes, consulta e retorno`, async ({
    page,
  }) => {
    const path = `/comun/pautas/calcadas-em-circulacao${experience}`;
    await page.goto(path);
    const guidance = page.locator(
      '[data-comun-pauta-practice-guidance="pauta"]',
    );
    await expect(guidance).toHaveCount(1);
    await guidance.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(guidance).toHaveAttribute("open", "");
    await expect(guidance).toContainText("Você pode apenas acompanhar");
    await expect(guidance.locator("form, input, button")).toHaveCount(0);
    const destination = `/comun/ajuda/primeira-acao?etapa=pauta${experience ? "&experiencia=legacy" : ""}`;
    const link = guidance.getByRole("link", {
      name: "Abrir orientação completa",
      exact: true,
    });
    await expect(link).toHaveAttribute("href", destination);
    await link.click();
    await expect(page).toHaveURL(destination);
    await expect(
      page.locator('[data-comun-practice-guidance="pauta"]:visible'),
    ).toContainText("fontes e as datas");
    await page.goBack();
    await expect(page).toHaveURL(path);
    await expect(
      page.locator('[data-comun-pauta-practice-guidance="pauta"]'),
    ).toHaveCount(1);
  });
  test(`material público sem cadastro${experience}: consultar e voltar`, async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname.startsWith("/api/comun/escola") ||
        request.headers()["next-action"]
      )
        writes.push(request.url());
    });
    await page.goto(`/comun/pautas/calcadas-em-circulacao${experience}`);
    const guidance = page.locator(
      '[data-comun-pauta-practice-guidance="pauta"]',
    );
    await guidance.locator("summary").click();
    await guidance
      .getByRole("link", { name: "Evidência ou suposição?", exact: true })
      .click();
    const material = page
      .locator('[data-comun-public-practice-material="evidencia-ou-suposicao"]')
      .filter({ visible: true });
    await expect(material).toHaveCount(1);
    await expect(material).toBeVisible();
    await expect(
      material.getByRole("heading", { name: "Como aplicar na prática" }),
    ).toBeVisible();
    await expect(material.locator("form, input, button")).toHaveCount(0);
    await expect(
      material.getByRole("link", { name: "Abrir atividade na Escola" }),
    ).toHaveCount(0);
    const returnHref = `/comun/ajuda/primeira-acao?etapa=pauta${experience ? "&experiencia=legacy" : ""}`;
    const returnLink = material.getByRole("link", {
      name: "Voltar à orientação",
      exact: true,
    });
    await expect(returnLink).toHaveAttribute("href", returnHref);
    await returnLink.click();
    await expect(page).toHaveURL(returnHref);
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(
      `/comun/pautas/calcadas-em-circulacao${experience}`,
    );
    expect(writes).toEqual([]);
  });
  for (const [slug, stage] of [
    ["mutirao-caminho-seguro", "participacao"],
    ["encaminhamento-iluminacao", "resultado"],
    ["memoria-do-mutirao", "resultado"],
  ]) {
    test(`orientação contextual ${slug}${experience}: consultar sem assumir compromisso`, async ({
      page,
    }) => {
      await page.goto(`/comun/acoes/${slug}${experience}`);
      const guidance = page.locator(
        `[data-comun-action-practice-guidance="${stage}"]`,
      );
      await expect(guidance).toHaveCount(1);
      const summary = guidance.locator("summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(guidance).toHaveAttribute("open", "");
      await expect(guidance.locator(":scope > ul > li")).toHaveCount(3);
      await expect(guidance.locator("form, input, button")).toHaveCount(0);
      const link = guidance.getByRole("link", {
        name: "Abrir orientação completa",
        exact: true,
      });
      const destination = `/comun/ajuda/primeira-acao?etapa=${stage}${experience ? "&experiencia=legacy" : ""}`;
      await expect(link).toHaveAttribute("href", destination);
      await link.click();
      await expect(page).toHaveURL(destination);
      await expect(
        page.locator(`[data-comun-practice-guidance="${stage}"]:visible`),
      ).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(`/comun/acoes/${slug}${experience}`);
      await expect(
        page.locator("[data-comun-action-practice-guidance]"),
      ).toHaveCount(1);
    });
  }
}

test("a jornada pública apresenta o processo político sem vazamento", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/comun/preview/esteira-politica");
  await expect(
    page.getByRole("heading", { name: "Caminho desta pauta" }),
  ).toBeVisible();
  await expect(page.getByText("Decisão revisada")).toBeVisible();
  await expect(page.getByText("Resultado, não só atividade")).toBeVisible();
  await expect(
    page.getByRole("list").getByText("Memória coletiva"),
  ).toBeVisible();
  await expect(
    page.getByText(/raw_text|contact_private|private_notes|object_key/i),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("a jornada funciona em celular popular e por teclado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/comun/preview/esteira-politica");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Mutirão pelo caminho seguro/i }),
  ).toBeVisible();
  await expect(page.getByText(/etapa atual/i)).toBeVisible();
});
