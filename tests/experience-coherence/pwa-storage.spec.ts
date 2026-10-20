import { expect, test } from "@playwright/test";

test("Ajuda e offline seguem acessíveis quando o browser nega storage", async ({
  page,
}) => {
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

  await page.goto("/comun/ajuda");
  await expect(
    page.getByRole("heading", { name: "Ajuda para seguir sem se perder" }),
  ).toBeVisible();

  await page.goto("/comun/offline");
  await expect(
    page.getByRole("heading", { name: "Sem conexão agora." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /última página segura/ }),
  ).toHaveAttribute("href", "/comun");

  expect(errors).toEqual([]);
});
