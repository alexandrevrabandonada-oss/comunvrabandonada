import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("Carteira local cria recuperação, preserva linguagem e é acessível @a11y", async ({
  page,
}) => {
  await page.goto("/comun/minha-participacao", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Meus registros" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Começar meus registros" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Começar meus registros" }).click();
  await expect(page.getByText("Guardar código de recuperação")).toBeVisible();
  await expect(
    page.getByText(/^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){5}$/),
  ).toBeVisible();
  await expect(
    page.getByText("Nenhum relato é encaminhado por esta tela."),
  ).toBeVisible();
  const violations = await new AxeBuilder({ page }).analyze();
  expect(
    violations.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("Carteira roteia Calçadas pela categoria sem fallback institucional", async ({
  page,
}) => {
  const itemId = "11111111-1111-4111-8111-111111111111";
  await page.route("**/api/comun/participation-wallet", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        wallet: { present: true },
        items: [
          {
            item_id: itemId,
            item_type: "relata_report",
            title_template: "Relato COMUN",
            category: "sidewalk_accessibility",
            presentation_state: "Guardado",
            action_required: "Precisa de informação",
            protocol_masked: "COMUN-RELATA••••",
            source_domain: "relata",
            metadata: {},
            created_at: "2026-08-09T12:00:00.000Z",
            updated_at: "2026-08-09T12:00:00.000Z",
          },
        ],
      }),
    });
  });

  await page.goto("/comun/minha-participacao", {
    waitUntil: "domcontentloaded",
  });

  const card = page.locator(`[data-wallet-item-id="${itemId}"]`);
  await expect(card).toHaveCount(1);
  await expect(card.getByText("Calçada e acessibilidade")).toBeVisible();
  await expect(
    card.getByText(
      "Guardado. Este relato ainda não entrou na fila do Mapa das Calçadas.",
    ),
  ).toBeVisible();
  await expect(
    card.getByText("Faltam informações para entrar no mapa"),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Arquivar ou retirar" }),
  ).toBeVisible();
  await expect(page.getByText(/Fiscaliza VR/i)).toHaveCount(0);
  await expect(page.getByText(/vr-fiscaliza-lighting-v1/i)).toHaveCount(0);
  await expect(page.getByText(/STMU/i)).toHaveCount(0);
  await expect(page.getByText(/serviço essencial/i)).toHaveCount(0);
});
