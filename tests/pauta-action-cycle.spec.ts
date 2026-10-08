import { expect, test } from "@playwright/test";

for (const experience of ["", "?experiencia=legacy"]) {
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
      await expect(guidance.locator("li")).toHaveCount(3);
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
