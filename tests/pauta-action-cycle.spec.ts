import { expect, test } from "@playwright/test";

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
