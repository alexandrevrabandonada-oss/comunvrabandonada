import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("canonical intake stores one private sidewalk report", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      externalRequests.push(`${url.origin}${url.pathname}`);
    }
  });

  await page.goto("/comun/relatar");
  await page
    .locator("#capture-text")
    .fill("a calçada está bloqueada por entulho");
  await expect(
    page.getByRole("button", { name: "Guardar", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("A passagem está totalmente bloqueada?")).toHaveCount(0);
  const [captureResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/comun/relata") &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Guardar", exact: true }).click(),
  ]);
  expect(captureResponse.status()).toBe(201);

  await expect(
    page.getByRole("heading", { name: "Guardado no COMUN" }),
  ).toBeVisible();
  const protocol = (await page.locator(".font-mono").first().textContent())?.trim();
  expect(protocol).toMatch(/^COMUN-RELATA-[A-F0-9]{16}$/);
  await expect(page.getByText("Ainda não encaminhado. Nada foi publicado.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Completar para o mapa" }),
  ).toHaveAttribute(
    "href",
    "/comun/calcadas/contribuir?continuar=relato-atual",
  );
  expect(externalRequests).toEqual([]);
  const cleanup = await page.evaluate(async () => {
    const response = await fetch("/api/comun/relata/receipt", {
      method: "DELETE",
      cache: "no-store",
    });
    return response.status;
  });
  expect(cleanup).toBe(200);
});

test("legacy aliases cannot reopen another intake", async ({ page }) => {
  await page.goto("/comun/relatar?modo=detalhado");
  await expect(page.getByRole("heading", { name: "Vi um problema" })).toBeVisible();
  await expect(page.getByText("Relato detalhado", { exact: true })).toHaveCount(0);

  await page.goto("/comun/relata");
  await expect(page).toHaveURL(/\/comun\/relatar$/);
  await expect(page.getByRole("heading", { name: "Vi um problema" })).toBeVisible();
});

test("prioritizes emergency guidance without blocking persistence", async ({
  page,
}) => {
  await page.goto("/comun/relatar");
  await page.locator("#capture-text").fill("Há fogo ativo e chamas no terreno");
  await expect(page.getByText(/A descrição indica fogo ativo/)).toBeVisible();
  await expect(page.getByRole("link", { name: /193|bombeiros/i })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Guardar", exact: true }),
  ).toBeVisible();
});

test("has no critical or serious Axe findings @a11y", async ({ page }) => {
  await page.goto("/comun/relatar");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? ""),
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test("opens the local sanitized map/list without private content", async ({
  page,
}) => {
  await page.goto("/comun/relata/mapa");
  await expect(
    page.getByRole("heading", { name: "Casos organizados no território" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Localização aproximada, sem texto, fotos ou protocolo/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mapa" }).click();
  await expect(
    page.getByRole("img", {
      name: "Mapa local com localizações aproximadas",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lista" }).click();
  const html = await page.locator("body").innerText();
  expect(html).not.toMatch(
    /COMUN-RELATA-|report_id|ciphertext|object_key|Foto [0-9]/i,
  );
});
