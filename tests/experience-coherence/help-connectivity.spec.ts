import { expect, test } from "@playwright/test";

for (const javaScriptEnabled of [true, false]) {
  test(`Ajuda de conexão não simula falha de rede (JS=${javaScriptEnabled})`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled });
    try {
      const page = await context.newPage();
      await page.goto("/comun/ajuda");
      await expect(
        page.getByRole("heading", { name: "Ajuda para seguir sem se perder" }),
      ).toBeVisible();

      const connection = page.getByRole("link", {
        name: "Ler orientações de conexão",
      });
      await expect(connection).toHaveAttribute("href", "#conexao");
      await connection.focus();
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(/\/comun\/ajuda#conexao$/);
      const guidance = page.locator("#conexao");
      await expect(guidance).toBeVisible();
      await expect(guidance).toHaveAttribute(
        "aria-labelledby",
        "comun-ajuda-conexao-titulo",
      );
      await expect(
        guidance.getByRole("heading", { name: "Se a conexão cair" }),
      ).toBeVisible();
      await expect(
        guidance.getByText(/Sem confirmação, não considere o envio concluído/),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Sem conexão agora." }),
      ).toHaveCount(0);
      await expect(
        guidance.getByRole("link", { name: "Voltar ao início" }),
      ).toHaveAttribute("href", "/comun");
    } finally {
      await context.close();
    }
  });
}
