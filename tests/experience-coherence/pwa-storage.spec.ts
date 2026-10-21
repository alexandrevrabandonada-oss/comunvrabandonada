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

test("PWA remains usable when storage is denied", async ({ page }) => {
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
  const heading = page.getByRole("heading", { name: "Começar uma pauta" });
  await expect(heading).toBeVisible();
  const button = page.getByRole("button", { name: "Entrar e continuar" });
  await expect(button).toBeVisible();

  await page.goto("/comun/offline");
  await expect(page.locator("h1")).toHaveText("Sem conexão agora.");
  const fallback = page.getByRole("link", { name: /última página segura/ });
  await expect(fallback).toHaveAttribute("href", "/comun");
  expect(errors).toEqual([]);
});
