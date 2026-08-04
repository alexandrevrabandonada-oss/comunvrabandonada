import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("local bus foundation stays synthetic, actionable and local-only", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) external.push(url.origin);
  });

  await page.goto("/comun/onibus");
  await expect(page.getByRole("heading", { name: /O que você precisa agora/i })).toBeVisible();
  await expect(page.locator("select").first().locator("option:checked")).toHaveText(/Linha Fixture 01/);
  await expect(page.getByText(/Nada é enviado para a STMU/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Estou esperando/i })).toBeVisible();
  expect(external).toEqual([]);

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});
