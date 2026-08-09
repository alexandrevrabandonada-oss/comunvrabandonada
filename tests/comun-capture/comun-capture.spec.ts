import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("Vi um problema respeita o orçamento estrutural e mantém a linguagem simples", async ({ page }) => {
  await page.goto("/comun/relatar", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Vi um problema" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "O que aconteceu?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toHaveCount(0);
  await expect(page.getByText("Nenhum órgão público recebeu esta manifestação.")).toBeVisible();

  const text = page.getByLabel("Uma frase curta basta. Não inclua endereço exato, nome ou telefone.");
  await text.fill("a calçada está totalmente bloqueada por entulho");
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toBeVisible();

  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
});

test("a captura rápida não expõe envio automático nem categoria burocrática", async ({ page }) => {
  await page.goto("/comun/relatar", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Ainda não encaminhado")).toHaveCount(0);
  await expect(page.getByText("secretaria", { exact: false })).toHaveCount(0);
  await expect(page.getByText("órgão", { exact: false })).toBeVisible();
});
