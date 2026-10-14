import { expect, test } from "@playwright/test";

test("PWA shell stays usable when browser storage is denied", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(() => {
    for (const key of ["sessionStorage", "localStorage"] as const) {
      Object.defineProperty(window, key, {
        configurable: true,
        get() {
          throw new DOMException("Storage denied", "SecurityError");
        },
      });
    }
  });

  await page.goto("/comun/pautas/nova");
  await expect(
    page.getByRole("heading", { name: "Começar uma pauta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar e continuar" }),
  ).toBeVisible();

  await page.goto("/comun/offline");
  await expect(
    page.getByRole("heading", { name: "Sem conexão agora." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Voltar à última página segura" }),
  ).toHaveAttribute("href", "/comun");
  expect(errors.filter((message) => message.includes("Storage denied"))).toEqual(
    [],
  );
});
