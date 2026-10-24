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
      // Suspense SSR can retain both fallback and resolved copies without JS.
      // Use the visible accessible region, not a strict CSS id selector.
      const guidance = page.getByRole("region", {
        name: "Se a conexão cair",
        exact: true,
      });
      await expect(guidance).toBeVisible();
      await expect(guidance).toHaveAttribute("id", "conexao");
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

test("Ajuda mantém o link nativo durante a hidratação atrasada", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  let releaseScripts!: () => void;
  const scriptsReleased = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  try {
    await context.route("**/_next/static/**/*.js", async (route) => {
      await scriptsReleased;
      await route.continue();
    });
    const page = await context.newPage();
    await page.goto("/comun/ajuda", { waitUntil: "commit" });
    const connection = page.getByRole("link", {
      name: "Ler orientações de conexão",
      exact: true,
    });
    await expect(connection).toBeVisible();
    const original = await connection.elementHandle();
    expect(original).not.toBeNull();
    await connection.focus();
    await expect(connection).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/comun\/ajuda#conexao$/);
    releaseScripts();
    await expect(page.locator("html")).toHaveAttribute(
      "data-comun-keyboard",
      "closed",
    );
    await expect(page.getByRole("banner")).toBeVisible();
    expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
    await expect(page).toHaveURL(/\/comun\/ajuda#conexao$/);
    await expect(
      page.getByRole("region", { name: "Se a conexão cair", exact: true }),
    ).toBeVisible();
  } finally {
    releaseScripts();
    await context.close();
  }
});
