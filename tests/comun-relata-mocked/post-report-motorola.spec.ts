import { expect, test, type Page, type Route } from "@playwright/test";
import type { ComunRelataEvidenceState } from "../../lib/comun-relata-evidence";

const protocol = "COMUN-RELATA-ABCDEF0123456789";
const walletItemId = "11111111-1111-4111-8111-111111111111";

function createEmptyEvidence(): ComunRelataEvidenceState {
  return {
    location: "not_added",
    locationApproximation: "none",
    photos: [],
    grouping: "case_individual",
    groupingConfidence: "low",
    activeReportsInCollective: 1,
    noOfficialSend: true,
    nothingPublished: true,
  };
}

function receipt(category: string, urgency = "normal") {
  return {
    protocol,
    state: "captured_private",
    category,
    urgency,
    ruleVersion: "relata-routing-v1",
    createdAt: "2026-08-29T12:00:00.000Z",
    withdrawnAt: null,
    timeline: [],
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockReceipt(page: Page, category: string, urgency = "normal") {
  let evidence = createEmptyEvidence();
  await page.route("**/api/comun/relata/receipt", (route) =>
    fulfillJson(route, {}),
  );
  await page.route("**/api/comun/relata", (route) =>
    fulfillJson(route, {
      receipt: receipt(category, urgency),
      walletRecoveryCode: "ABCD-EFGH-JKLM-NPQR-STUV-WXYZ",
      walletItemId,
    }),
  );
  await page.route("**/api/comun/relata/evidence", (route) =>
    fulfillJson(route, { evidence }),
  );
  await page.route("**/api/comun/relata/evidence/location", (route) => {
    evidence = { ...evidence, location: "added_private" };
    return fulfillJson(route, { evidence });
  });
  await page.route("**/api/comun/relata/evidence/attachments", (route) =>
    fulfillJson(route, {
      upload: {
        label: "Foto 1",
        url: "http://127.0.0.1:3138/mock-upload",
        method: "PUT",
        contentType: "image/jpeg",
        finalizeUrl: "http://127.0.0.1:3138/mock-finalize",
      },
    }),
  );
  await page.route("**/mock-upload", (route) => route.fulfill({ status: 200 }));
  await page.route("**/mock-finalize", (route) => {
    evidence = {
      ...evidence,
      photos: [
        {
          label: "Foto 1",
          state: "sealed_private",
          mimeType: "image/jpeg",
          width: 1,
          height: 1,
          reviewRequiredForPublication: true,
          accessUrl: "/mock-photo",
        },
      ],
    };
    return fulfillJson(route, { evidence });
  });
  await page.route("**/mock-photo", (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: "mock" }),
  );
}

test("390x844 keeps education post-save to one conscious next action", async ({
  page,
}) => {
  await mockReceipt(page, "public_education");
  await page.route("**/api/comun/education-channels", (route) =>
    fulfillJson(route, {
      channels: [
        {
          id: "municipal",
          institution: "Secretaria Municipal de Educação de Volta Redonda",
          sphere: "municipal",
          channelType: "web",
          destination: "https://example.test/municipal",
          sourceStatus: "source_verified",
          operationalStatus: "operationally_unchecked",
          notes: "Canal municipal.",
          protectionOnly: false,
          emergencyOnly: false,
        },
        {
          id: "state",
          institution: "SEEDUC-RJ / OuvERJ",
          sphere: "state",
          channelType: "web",
          destination: "https://example.test/state",
          sourceStatus: "source_verified",
          operationalStatus: "operationally_unchecked",
          notes: "Canal estadual.",
          protectionOnly: false,
          emergencyOnly: false,
        },
      ],
    }),
  );

  await page.goto("/comun/relatar");
  await page.locator("#capture-text").fill("Há um problema na escola pública.");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Guardado no COMUN" })).toBeVisible();
  await expect(page.getByText(protocol)).toBeVisible();
  await expect(page.getByText("ABCD-EFGH-JKLM-NPQR-STUV-WXYZ")).toBeVisible();
  await expect(page.getByText("Educação pública", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar", exact: true })).toHaveCount(1);
  await expect(page.getByText("A escola é municipal, estadual ou você não sabe?")).toHaveCount(0);
  await expect(page.getByText("Agrupamento", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const question = page.locator("fieldset");
  await expect(question).toBeFocused();
  await expect(page.getByText("A escola é municipal, estadual ou você não sabe?")).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir canal oficial" })).toHaveCount(0);

  await page.getByRole("button", { name: "Municipal", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Secretaria Municipal/ })).toBeVisible();
  await expect(page.getByText("Canal oficial verificado")).toBeVisible();
  await expect(page.getByText("O COMUN ainda não testou o envio por este canal.")).toBeVisible();
  await page.getByRole("button", { name: "Não sei", exact: true }).click();
  await expect(page.getByRole("link", { name: "Abrir canal oficial" })).toHaveCount(2);

  const evidenceToggle = page.locator(
    '[aria-controls="relata-evidence-details"]',
  );
  await expect(evidenceToggle).toHaveAttribute("aria-expanded", "false");
  await evidenceToggle.click();
  await expect(evidenceToggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Usar localização" }).click();
  await expect(page.getByText("Adicionada privadamente")).toBeVisible();
  await page.locator("#relata-private-photo").setInputFiles({
    name: "prova.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("mock-photo"),
  });
  await expect(page.getByText(/Foto 1 foi guardada privadamente/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /case_individual|auto_link_high_confidence|candidate_medium_confidence|new_collective_case/i,
  );
});

test("collective wording is human and emergency is never behind Continue", async ({
  page,
}) => {
  await mockReceipt(page, "public_lighting");
  await page.route("**/api/comun/denuncias/public-projection-consent**", (route) =>
    fulfillJson(route, { consent: { active: true, available: true } }),
  );
  await page.route("**/api/comun/relata/evidence/grouping**", (route) =>
    fulfillJson(route, { collectiveConnection: "matched" }),
  );
  await page.goto("/comun/relatar");
  await page.locator("#capture-text").fill("O poste está apagado na rua.");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("Isso não parece ser um caso isolado.")).toBeVisible();

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockReceipt(page, "active_fire", "emergency");
  await page.goto("/comun/relatar");
  await page.locator("#capture-text").fill("Há fogo ativo e chamas no terreno");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continuar", exact: true })).toHaveCount(0);
  await expect(page.getByText(/emergência|segurança/i).first()).toBeVisible();
});
