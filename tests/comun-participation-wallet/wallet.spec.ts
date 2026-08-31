import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type MockItem = {
  item_id: string;
  item_type: string;
  title_template: string;
  category: string | null;
  presentation_state: string;
  action_required: string | null;
  protocol_masked: string | null;
  source_domain: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function report(overrides: Partial<MockItem> = {}): MockItem {
  return {
    item_id: crypto.randomUUID(),
    item_type: "relata_report",
    title_template: "Relato COMUN",
    category: "sidewalk_accessibility",
    presentation_state: "Guardado",
    action_required: null,
    protocol_masked: "COMUN-RELATA••••",
    source_domain: "relata",
    metadata: {},
    created_at: "2026-08-29T12:00:00.000Z",
    updated_at: "2026-08-30T12:00:00.000Z",
    ...overrides,
  };
}

async function mockWallet(page: Page, items: MockItem[]) {
  await page.route("**/api/comun/participation-wallet", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ wallet: { present: true }, items }),
    });
  });
}

test("Carteira local cria recuperação, preserva linguagem e é acessível @a11y", async ({
  page,
}) => {
  await page.route("**/api/comun/participation-wallet", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ recoveryCode: "ABCD-EFGH-JKLM-NPQR-STUV-WXYZ" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ wallet: null, items: [] }),
    });
  });
  await page.goto("/comun/minha-participacao", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Minha participação" })).toBeVisible();
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
    card.getByText("Faltam informações para entrar no mapa"),
  ).toBeVisible();
  await card.getByRole("button", { name: "Continuar" }).click();
  await expect(
    card.getByText(
      "Guardado. Este relato ainda não entrou na fila do Mapa das Calçadas.",
    ),
  ).toBeVisible();
  await card.getByText("Opções do registro").click();
  await expect(
    card.getByRole("button", { name: "Arquivar ou retirar" }),
  ).toBeVisible();
  await expect(page.getByText(/Fiscaliza VR/i)).toHaveCount(0);
  await expect(page.getByText(/vr-fiscaliza-lighting-v1/i)).toHaveCount(0);
  await expect(page.getByText(/STMU/i)).toHaveCount(0);
  await expect(page.getByText(/serviço essencial/i)).toHaveCount(0);
});

test("Centro de continuidade prioriza uma ação e mantém configuração secundária", async ({ page }) => {
  const items = [
    report({ item_id: "11111111-1111-4111-8111-111111111111" }),
    report({
      item_id: "22222222-2222-4222-8222-222222222222",
      category: "public_education",
      action_required: "Escolher a rede de ensino",
      updated_at: "2026-08-30T14:00:00.000Z",
    }),
    report({
      item_id: "33333333-3333-4333-8333-333333333333",
      category: "public_transport",
      presentation_state: "Aguardando retorno",
      updated_at: "2026-08-28T12:00:00.000Z",
    }),
  ];
  await mockWallet(page, items);
  await page.goto("/comun/minha-participacao", { waitUntil: "domcontentloaded" });

  const attention = page.getByRole("region", { name: "Precisa de você" });
  await expect(attention.getByRole("button", { name: "Continuar" })).toHaveCount(1);
  await expect(attention.getByText("Educação pública")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meus registros" })).toBeVisible();
  await expect(page.getByText("Tenho um protocolo antigo")).toBeVisible();
  await expect(page.getByText("Acompanhar protocolo legado")).toHaveCount(0);
  await expect(page.getByText(/contrato especializado|presentation state|server-owned/i)).toHaveCount(0);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (viewport?.width === 390 && viewport.height === 844) {
    const foldButtons = await page.locator('[data-primary-action="true"]').evaluateAll((nodes, fold) =>
      nodes.filter((node) => {
        const box = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return box.top < fold && box.bottom > 0 && style.visibility !== "hidden" && style.display !== "none" && /Continuar$/.test(node.textContent?.trim() ?? "");
      }).length, viewport.height);
    expect(foldButtons).toBe(1);
    await expect(attention).toBeInViewport();
    await page.screenshot({
      path: "C:/Users/Micro/AppData/Local/Temp/comun-49-0-a0-mobile-390x844.png",
      fullPage: false,
    });
  }
  const continueButton = attention.getByRole("button", { name: "Continuar" });
  await continueButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(`[data-wallet-item-id="${items[1].item_id}"]`)).toBeFocused();
  if (viewport?.width === 768) {
    await page.screenshot({
      path: "C:/Users/Micro/AppData/Local/Temp/comun-49-0-a0-desktop-768x1024.png",
      fullPage: false,
    });
  }
});

test("Múltiplas atenções mostram uma principal e um resumo", async ({ page }) => {
  await mockWallet(page, [
    report({ category: "public_education", action_required: "Escolher rede" }),
    report({ category: "sidewalk_accessibility", action_required: "Completar informações" }),
  ]);
  await page.goto("/comun/minha-participacao", { waitUntil: "domcontentloaded" });
  const attention = page.getByRole("region", { name: "Precisa de você" });
  await expect(attention.getByRole("button", { name: "Continuar" })).toHaveCount(1);
  await expect(attention.getByText("Mais 1 item pede atenção")).toBeVisible();
});

test("Saúde sensível e proteção infantil preservam orientação ao abrir", async ({ page }) => {
  const childId = "44444444-4444-4444-8444-444444444444";
  await mockWallet(page, [
    report({ category: "public_health", action_required: "Consultar canais" }),
    report({
      item_id: childId,
      category: "child_protection",
      metadata: { immediateDanger: true, urgency: "emergency" },
      action_required: "Ver proteção imediata",
      updated_at: "2026-08-30T16:00:00.000Z",
    }),
  ]);
  await page.goto("/comun/minha-participacao", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Precisa de você" }).getByText("Proteção de criança ou adolescente")).toBeVisible();
  await page.getByRole("region", { name: "Precisa de você" }).getByRole("button", { name: "Continuar" }).click();
  const child = page.locator(`[data-wallet-item-id="${childId}"]`);
  await expect(child).toBeFocused();
  await expect(child.getByText("Situação que pode exigir ajuda imediata.")).toBeVisible();
  await expect(child.getByText("Opções do registro")).toBeVisible();
});
