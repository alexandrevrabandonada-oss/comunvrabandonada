import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

test("stores, restores and withdraws a private local report", async ({
  page,
  context,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      externalRequests.push(`${url.origin}${url.pathname}`);
    }
  });

  await page.goto("/comun/relata");
  await expect(
    page.getByRole("heading", { name: "O que está acontecendo?" }),
  ).toBeVisible();
  await expect(page.locator("[data-comun-relata-local-only]")).toBeVisible();
  await expect(page.getByRole("link", { name: /relata/i })).toHaveCount(0);

  await page.locator("#relata-text").fill("A rua está toda escura");
  await page.getByRole("button", { name: "Organizar situação" }).click();
  await expect(
    page
      .getByRole("region", {
        name: "Uma pergunta antes de indicar o caminho",
      })
      .getByText(
        "As casas também estão sem energia ou apenas as luminárias da rua?",
      ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apenas as luminárias da rua" })
    .click();

  await expect(
    page.getByText("Nenhum órgão público recebeu esta manifestação."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Guardar este relato no COMUN" })
    .click();

  const receipt = page.locator("[data-comun-relata-receipt=stored_private]");
  await expect(receipt).toBeVisible();
  const protocol = await receipt
    .locator(".font-mono")
    .filter({ hasText: "COMUN-RELATA-" })
    .textContent();
  expect(protocol?.trim()).toMatch(/^COMUN-RELATA-[A-F0-9]{16}$/);
  await expect(receipt.getByRole("list").getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Evidências" })).toBeVisible();
  await expect(page.getByText("Nada foi publicado no mapa.")).toBeVisible();
  await expect(page.getByText("Novo caso coletivo privado")).toBeVisible();

  await page.getByRole("button", { name: "Usar localização" }).click();
  await expect(page.getByText("Adicionada privadamente")).toBeVisible();
  await expect(page.getByText(/coordenada exata não será exibida/i)).toBeVisible();

  const photo = await sharp({
    create: {
      width: 96,
      height: 72,
      channels: 3,
      background: "#777777",
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  await page.locator("#relata-private-photo").setInputFiles({
    name: "nome-privado-nao-persistido.jpg",
    mimeType: "image/jpeg",
    buffer: photo,
  });
  await expect(
    page.getByText("Foto 1 foi guardada privadamente", { exact: false }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByAltText("Foto 1, evidência privada sem revisão visual"),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("1 de 3 adicionadas")).toBeVisible();

  const cookies = await context.cookies();
  const proofCookie = cookies.find(
    (cookie) => cookie.name === "comun_relata_receipt_v1",
  );
  expect(proofCookie).toMatchObject({
    httpOnly: true,
    sameSite: "Strict",
    path: "/api/comun/relata",
  });
  const browserStorage = await page.evaluate(() => ({
    local: localStorage.length,
    session: JSON.stringify({ ...sessionStorage }),
    visibleCookies: document.cookie,
  }));
  expect(browserStorage.local).toBe(0);
  expect(browserStorage.visibleCookies).not.toContain(
    "comun_relata_receipt_v1",
  );
  expect(browserStorage.session).not.toContain(protocol!.trim());
  expect(browserStorage.session).not.toMatch(
    /receiptSecret|idempotencyKey|comun_relata_receipt/i,
  );

  await page.reload();
  await expect(
    page.locator("[data-comun-relata-receipt=stored_private]"),
  ).toContainText(protocol!.trim());
  await expect(page.getByText("Adicionada privadamente")).toBeVisible();
  await expect(page.getByAltText("Foto 1, evidência privada sem revisão visual")).toBeVisible();
  await page.getByRole("button", { name: "Quero retirar este relato" }).click();
  await expect(
    page.getByRole("group", { name: "Confirmar retirada" }),
  ).toContainText("não voltará ao fluxo ativo");
  await page.getByRole("button", { name: "Confirmar retirada" }).click();
  await expect(
    page.locator("[data-comun-relata-receipt=withdrawn]"),
  ).toBeVisible();
  await expect(page.getByText("Retirada", { exact: true }).first()).toBeVisible();
  await expect(page.getByAltText("Foto 1, evidência privada sem revisão visual")).toHaveCount(0);
  await expect(
    page.getByText("Nenhum órgão público recebeu esta manifestação.").first(),
  ).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test("prioritizes emergency guidance without an automatic call", async ({
  page,
}) => {
  await page.goto("/comun/relata");
  await page.locator("#relata-text").fill("Há fogo ativo e chamas no terreno");
  await page.getByRole("button", { name: "Organizar situação" }).click();
  await expect(page.getByText(/Corpo de Bombeiros pelo 193/)).toBeVisible();
  await expect(page.getByRole("link", { name: /193|bombeiros/i })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Guardar este relato no COMUN" }),
  ).toBeVisible();
});

test("has no critical or serious Axe findings @a11y", async ({ page }) => {
  await page.goto("/comun/relata");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? ""),
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test("opens the local sanitized map/list without private content", async ({ page }) => {
  await page.goto("/comun/relata/mapa");
  await expect(page.getByRole("heading", { name: "Casos organizados no território" })).toBeVisible();
  await expect(page.getByText(/Localização aproximada, sem texto, fotos ou protocolo/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mapa" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Mapa" }).click();
  await expect(page.getByRole("img", { name: "Mapa local com localizações aproximadas" })).toBeVisible();
  await expect(page.getByText(/Cada marcador representa uma área aproximada/)).toBeVisible();
  await page.getByRole("button", { name: "Lista" }).click();
  await expect(page.getByRole("button", { name: "Lista" })).toHaveAttribute("aria-pressed", "true");
  const html = await page.locator("body").innerText();
  expect(html).not.toMatch(/COMUN-RELATA-|report_id|ciphertext|object_key|Foto [0-9]/i);
});
