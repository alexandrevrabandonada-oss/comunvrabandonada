import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("runs a local-only triage without public navigation or official send", async ({ page }) => {
  const remoteWriteRequests: string[] = [];
  page.on("request", (request) => {
    if (/supabase|\/rest\/v1|\/api\/(?:reports|relata)/i.test(request.url())) remoteWriteRequests.push(request.url());
  });

  await page.goto("/comun/relata");
  await expect(page.getByRole("heading", { name: "O que está acontecendo?" })).toBeVisible();
  await expect(page.locator("[data-comun-relata-local-only]")).toBeVisible();
  await expect(page.getByRole("link", { name: /relata/i })).toHaveCount(0);

  await page.locator("#relata-text").fill("A rua está toda escura");
  await page.getByRole("button", { name: "Organizar situação" }).click();
  await expect(page.getByRole("region", { name: "Uma pergunta antes de indicar o caminho" }).getByText("As casas também estão sem energia ou apenas as luminárias da rua?")).toBeVisible();
  await page.getByRole("button", { name: "Apenas as luminárias da rua" }).click();

  await expect(page.getByText("Nenhum órgão público recebeu esta manifestação ainda.")).toBeVisible();
  await expect(page.locator("[data-comun-relata-preview=local-only]")).toContainText("COMUN-LOCAL-");
  expect(remoteWriteRequests).toEqual([]);
});

test("has no critical or serious Axe findings @a11y", async ({ page }) => {
  await page.goto("/comun/relata");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""));
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
